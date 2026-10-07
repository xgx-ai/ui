import { createMemo, createSignal, createStore, deep, snapshot } from "solid-js";
import { z } from "zod";
import { getSchemaDefaults, introspectSchema } from "./introspect.ts";
import type { CreateFormOptions, FieldBinding, FieldMeta, FormInstance } from "./types.ts";

type Values = Record<string, unknown>;
type FieldErrors = Record<string, string[]>;

interface FormState {
  values: Values;
  touched: Record<string, boolean>;
  /** The clean values `isDirty` compares against; `reset(values)` rebases it. */
  baseline: Values;
}

type ParseResult<T> =
  | { success: true; data: T; errors: FieldErrors }
  | { success: false; errors: FieldErrors };

/**
 * Creates schema-driven form state.
 *
 * Errors are derived from the values rather than stored: with `validateOnChange` (the default)
 * they follow every change, otherwise they describe the values last checked on blur
 * (`validateOnBlur`) or submit. A field shows its first error once it has been touched. Errors
 * from `submitSchema`, such as cross-field refinements, appear from the first submit attempt and
 * clear as soon as the values satisfy it. `isValid` reports whether submit validation would pass.
 *
 * `reset(values)` replaces the values and rebases the clean state, so data that loads after the
 * form was created can be applied without recreating the form:
 *
 * @example
 * ```ts
 * const form = createForm(profileSchema, { disabled: () => !session() });
 * createEffect(
 *   () => session(),
 *   (current) => {
 *     if (current) form.reset({ name: current.name, email: current.email });
 *   },
 * );
 * ```
 */
export function createForm<T extends Values, Input = T>(
  schema: z.ZodType<T, Input>,
  options?: CreateFormOptions<T>,
): FormInstance<T, Input> {
  const meta = introspectSchema(schema);
  const fieldNames = Object.keys(meta);
  const initialValues: Values = {
    ...getSchemaDefaults(schema),
    ...(options?.initialValues ?? {}),
  };
  const submitSchema = options?.submitSchema;
  const validateOnChange = options?.validateOnChange ?? true;
  const validateOnBlur = options?.validateOnBlur ?? true;

  const [state, setState] = createStore<FormState>({
    values: { ...initialValues },
    touched: {},
    baseline: { ...initialValues },
  });
  // Without live validation, errors describe the values captured at the last blur or submit.
  const [checkedValues, setCheckedValues] = createSignal<Values>({ ...initialValues });
  const [submitAttempted, setSubmitAttempted] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const claimed = new Set<string>();

  const parse = (values: Values, validationSchema: z.ZodType<T>) =>
    parseValues(values, validationSchema, meta);

  const fieldCheck = createMemo(() => parse(deep(state.values), schema));
  const submitCheck = submitSchema
    ? createMemo(() => parse(deep(state.values), submitSchema))
    : fieldCheck;
  const isValid = createMemo(() => submitCheck().success);

  const shownFieldCheck = validateOnChange
    ? fieldCheck
    : createMemo(() => parse(checkedValues(), schema));
  const shownSubmitCheck = !submitSchema
    ? undefined
    : validateOnChange
      ? submitCheck
      : createMemo(() => parse(checkedValues(), submitSchema));
  const errors = createMemo(() => {
    const fieldErrors = shownFieldCheck().errors;
    if (!shownSubmitCheck || !submitAttempted()) return fieldErrors;
    return mergeErrors(fieldErrors, shownSubmitCheck().errors);
  });

  const isDirty = createMemo(() =>
    fieldNames.some((key) => state.values[key] !== state.baseline[key]),
  );

  const disabled = () => {
    const value = options?.disabled;
    return typeof value === "function" ? value() : value;
  };

  function captureCheckedValues(values: Values) {
    if (!validateOnChange) setCheckedValues({ ...values });
  }

  function setFieldValue(name: string, value: unknown) {
    setState((draft) => {
      draft.values[name] = value;
    });
  }

  function touchField(name: string) {
    setState((draft) => {
      draft.touched[name] = true;
    });
    // Reads the latest values, including same-turn changes that have not flushed yet.
    if (validateOnBlur) captureCheckedValues(snapshot(state).values);
  }

  function getFieldBinding<Value = unknown>(name: string): FieldBinding<Value> {
    claimed.add(name);
    const fieldMeta = meta[name] as FieldMeta | undefined;
    const errorMessage = () => (state.touched[name] ? errors()[name]?.[0] : undefined);

    return {
      name,
      value: () => state.values[name] as Value,
      onInput: (value: Value) => setFieldValue(name, value),
      onBlur: () => touchField(name),
      validationState: () => (errorMessage() === undefined ? "valid" : "invalid"),
      errorMessage,
      // Required means an empty value is rejected, so a plain z.string() is not marked.
      required: fieldMeta ? !fieldMeta.isOptional && !fieldMeta.acceptsEmpty : true,
      label: fieldMeta?.label,
      placeholder: fieldMeta?.placeholder ?? fieldMeta?.label,
      get disabled() {
        return disabled();
      },
      options: fieldMeta?.options,
      minValue: fieldMeta?.type === "number" ? fieldMeta.minimum : undefined,
      maxValue: fieldMeta?.type === "number" ? fieldMeta.maximum : undefined,
      step: fieldMeta?.step,
      type: resolveInputType(fieldMeta),
      rows: fieldMeta?.rows,
      inputMode: fieldMeta?.inputMode,
      autocomplete: fieldMeta?.autocomplete,
    };
  }

  function submit(
    handler: (data: T) => void | Promise<void>,
    onError?: (errors: FieldErrors) => void,
  ) {
    return async (event?: Event) => {
      event?.preventDefault();
      // The snapshot includes same-turn field changes that have not flushed yet.
      const currentValues = snapshot(state).values;
      const submittedValues = readSubmittedValues(event, currentValues, meta, fieldNames);

      setState((draft) => {
        assignValues(draft.values, currentValues, submittedValues);
        for (const name of fieldNames) {
          draft.touched[name] = true;
        }
      });
      captureCheckedValues(submittedValues);
      setSubmitAttempted(true);

      const result = parse(submittedValues, submitSchema ?? schema);
      if (!result.success) {
        onError?.(result.errors);
        return;
      }

      setIsSubmitting(true);
      try {
        await handler(result.data);
      } finally {
        setIsSubmitting(false);
      }
    };
  }

  function reset(values?: Partial<Input>) {
    const current = snapshot(state);
    const baseline: Values = { ...current.baseline, ...(values as Values | undefined) };
    setState((draft) => {
      assignValues(draft.baseline, current.baseline, baseline);
      assignValues(draft.values, current.values, baseline);
      for (const name of Object.keys(current.touched)) {
        delete draft.touched[name];
      }
    });
    setCheckedValues({ ...baseline });
    setSubmitAttempted(false);
  }

  const instance: FormInstance<T, Input> = {
    field: getFieldBinding as FormInstance<T, Input>["field"],
    Field: null as any,
    Rest: null as any,
    submit,
    reset,
    isValid,
    isDirty,
    isSubmitting,
    meta,
    claimed,
    fieldNames,
  };

  return instance;
}

function parseValues<T>(
  values: Values,
  schema: z.ZodType<T>,
  meta: Record<string, FieldMeta>,
): ParseResult<T> {
  // A per-parse error map runs after messages declared on the schema, so explicit messages win,
  // and unlike a finished issue it still carries the input that failed.
  const result = schema.safeParse(values, {
    error: (issue) => humaniseIssue(issue, meta[String(issue.path?.[0])]),
  });
  if (result.success) {
    return { success: true, data: result.data, errors: {} };
  }

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path[0]?.toString();
    if (path) {
      errors[path] ??= [];
      errors[path].push(issue.message);
    }
  }
  return { success: false, errors };
}

function mergeErrors(first: FieldErrors, second: FieldErrors): FieldErrors {
  const merged: FieldErrors = { ...first };
  for (const [path, messages] of Object.entries(second)) {
    const existing = merged[path] ?? [];
    merged[path] = [...existing, ...messages.filter((message) => !existing.includes(message))];
  }
  return merged;
}

/** Writes only the keys that changed, so readers of untouched fields do not re-run. */
function assignValues(target: Values, current: Values, next: Values) {
  for (const key of Object.keys(current)) {
    if (!(key in next)) delete target[key];
  }
  for (const [key, value] of Object.entries(next)) {
    if (!Object.is(current[key], value)) target[key] = value;
  }
}

function readSubmittedValues(
  event: Event | undefined,
  currentValues: Values,
  meta: Record<string, FieldMeta>,
  fieldNames: string[],
) {
  const form = event?.currentTarget;
  if (typeof HTMLFormElement === "undefined" || !(form instanceof HTMLFormElement)) {
    return { ...currentValues };
  }

  const values = { ...currentValues };
  const formData = new FormData(form);

  for (const name of fieldNames) {
    const fieldMeta = meta[name];
    const value = formData.get(name);

    if (fieldMeta?.type === "boolean") {
      if (formData.has(name)) values[name] = value !== "false";
      continue;
    }

    if (value == null) continue;

    if (fieldMeta?.type === "number") {
      const textValue = String(value);
      values[name] = textValue === "" ? undefined : Number(textValue);
      continue;
    }

    values[name] = value;
  }
  return values;
}

function resolveInputType(meta: FieldMeta | undefined): string | undefined {
  if (!meta) return "text";
  if (meta.type !== "string") return undefined;
  if (meta.format === "email") return "email";
  if (meta.format === "url") return "url";
  return "text";
}

type FormIssue = z.core.$ZodRawIssue;

function humaniseIssue(issue: FormIssue, fieldMeta: FieldMeta | undefined): string | undefined {
  // Leave issues an application-wide error map handles to that map.
  if (z.config().customError?.(issue) != null) return undefined;

  const label = fieldMeta?.label ?? String(issue.path?.[0] ?? "This field");

  switch (issue.code) {
    case "invalid_type": {
      const input = issue.input;
      if (input === undefined || input === null || input === "") return `${label} is required`;
      if (issue.expected === "number" || issue.expected === "int") {
        return `${label} must be a number`;
      }
      return `${label} is not valid`;
    }
    case "too_small": {
      const minimum = Number(issue.minimum);
      if (issue.origin === "string") {
        if (minimum === 1) return `${label} is required`;
        return `${label} must be at least ${minimum} characters`;
      }
      return `${label} must be at least ${minimum}`;
    }
    case "too_big": {
      const maximum = Number(issue.maximum);
      if (issue.origin === "string") return `${label} must be at most ${maximum} characters`;
      return `${label} must be at most ${maximum}`;
    }
    case "invalid_format":
      if (issue.format === "email") return "Please enter a valid email address";
      if (issue.format === "url") return "Please enter a valid URL";
      return `${label} is not valid`;
    case "invalid_value":
      return `Please select a valid ${label.toLowerCase()}`;
    default:
      // Zod's own (or the application's) message applies.
      return undefined;
  }
}
