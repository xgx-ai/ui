import { createMemo, createSignal, createStore, deep, snapshot } from "solid-js";
import type { z } from "zod";
import { getSchemaDefaults, introspectSchema } from "./introspect.ts";
import type { CreateFormOptions, FieldBinding, FieldMeta, FormInstance } from "./types.ts";

type ZodSchema<T extends Record<string, unknown>> = z.ZodType<T>;

interface FormState {
  values: Record<string, unknown>;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
}

type ParseResult<T> =
  | { success: true; data: T; errors: Record<string, string[]> }
  | { success: false; errors: Record<string, string[]> };

export function createForm<T extends Record<string, unknown>>(
  schema: ZodSchema<T>,
  options?: CreateFormOptions,
): FormInstance<T> {
  const meta = introspectSchema(schema);
  const fieldNames = Object.keys(meta);
  const schemaDefaults = getSchemaDefaults(schema);
  const initialValues = {
    ...schemaDefaults,
    ...(options?.initialValues ?? {}),
  };

  const [state, setState] = createStore<FormState>({
    values: { ...initialValues },
    errors: {},
    touched: {},
  });

  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const claimed = new Set<string>();
  const validateOnChange = options?.validateOnChange ?? true;
  const validateOnBlur = options?.validateOnBlur ?? true;

  function parseValues(values: Record<string, unknown>): ParseResult<T> {
    const result = schema.safeParse(values);
    if (result.success) {
      return { success: true, data: result.data as T, errors: {} };
    }

    const nextErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path[0]?.toString();
      if (path) {
        if (!nextErrors[path]) nextErrors[path] = [];
        nextErrors[path].push(humaniseError(issue, meta[path]));
      }
    }
    return { success: false, errors: nextErrors };
  }

  function setErrors(errors: Record<string, string[]>) {
    setState((draft) => {
      draft.errors = errors;
    });
  }

  function validate(values = snapshot(state).values): ParseResult<T> {
    const result = parseValues(values);
    setErrors(result.errors);
    return result;
  }

  function setFieldValue(name: string, value: unknown) {
    const nextValues = { ...state.values, [name]: value };
    setState((draft) => {
      draft.values[name] = value;
    });
    if (validateOnChange) validate(nextValues);
  }

  function touchField(name: string) {
    setState((draft) => {
      draft.touched[name] = true;
    });
    if (validateOnBlur) validate();
  }

  function getFieldBinding<Value = unknown>(name: string): FieldBinding<Value> {
    claimed.add(name);
    const fieldMeta = meta[name] as FieldMeta | undefined;

    return {
      name,
      value: () => state.values[name] as Value,
      onInput: (value: Value) => setFieldValue(name, value),
      onBlur: () => touchField(name),
      validationState: () => {
        if (!state.touched[name]) return "valid";
        return (state.errors[name]?.length ?? 0) > 0 ? "invalid" : "valid";
      },
      errorMessage: () => {
        if (!state.touched[name]) return undefined;
        return state.errors[name]?.[0];
      },
      required: fieldMeta ? !fieldMeta.isOptional : true,
      label: fieldMeta?.label,
      placeholder: fieldMeta?.placeholder ?? fieldMeta?.label,
      disabled: options?.disabled,
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

  const currentValues = createMemo(() => deep(state).values);

  const isValid = createMemo(() => schema.safeParse(currentValues()).success);

  const isDirty = createMemo(() => {
    const values = currentValues();
    for (const key of fieldNames) {
      if (values[key] !== initialValues[key]) return true;
    }
    return false;
  });

  function submit(
    handler: (data: T) => void | Promise<void>,
    onError?: (errors: Record<string, string[]>) => void,
  ) {
    return async (event?: Event) => {
      event?.preventDefault();
      const submittedValues = readSubmittedValues(event, state.values, meta, fieldNames);

      setState((draft) => {
        draft.values = submittedValues;
        for (const name of fieldNames) {
          draft.touched[name] = true;
        }
      });

      const result = validate(submittedValues);
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

  function reset() {
    setState((draft) => {
      draft.values = { ...initialValues };
      draft.errors = {};
      draft.touched = {};
    });
  }

  const instance: FormInstance<T> = {
    field: getFieldBinding as FormInstance<T>["field"],
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

function readSubmittedValues(
  event: Event | undefined,
  currentValues: Record<string, unknown>,
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

type ZodIssue = any;

function humaniseError(issue: ZodIssue, fieldMeta: FieldMeta | undefined): string {
  const label = fieldMeta?.label ?? issue.path?.[0] ?? "This field";
  const code = issue.code as string | undefined;

  if (code === "invalid_type") {
    return `${label} is required`;
  }

  if (code === "too_small") {
    const origin = issue.origin as string | undefined;
    const minimum = issue.minimum as number;
    if (origin === "string") {
      if (minimum === 1) return `${label} is required`;
      return `${label} must be at least ${minimum} characters`;
    }
    return `${label} must be at least ${minimum}`;
  }

  if (code === "too_big") {
    const origin = issue.origin as string | undefined;
    const maximum = issue.maximum as number;
    if (origin === "string") {
      return `${label} must be at most ${maximum} characters`;
    }
    return `${label} must be at most ${maximum}`;
  }

  if (code === "invalid_format") {
    const format = issue.format as string | undefined;
    if (format === "email") return "Please enter a valid email address";
    if (format === "url") return "Please enter a valid URL";
    return `${label} is not valid`;
  }

  if (code === "invalid_value") {
    return `Please select a valid ${label.toLowerCase()}`;
  }

  return issue.message as string;
}
