import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  cn,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@xgx/ui";
import { AlertCircle, CheckCircle2, CircleDashed } from "lucide-solid";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  Match,
  on,
  onCleanup,
  onMount,
  type ParentProps,
  Show,
  Switch,
  useContext,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import type { AnyFormApi, ValidationState } from "./types";

/**
 * Generic schema type that has a shape property with fields that can be parsed.
 * Compatible with Zod v4 object schemas.
 */
interface SchemaWithShape {
  shape: Record<
    string,
    { safeParse: (value: unknown) => { success: boolean } }
  >;
}

/**
 * Registration info for a FormGroup
 */
interface FormGroupRegistration {
  value: string;
  fields: string[];
}

/**
 * Unified context for FormGroup components.
 * Provides form instance, schema, and group registration methods.
 */
interface FormGroupContextType {
  form: AnyFormApi;
  schema?: SchemaWithShape;
  ignoreTouchState?: boolean;
  registerGroup: (registration: FormGroupRegistration) => void;
  unregisterGroup: (value: string) => void;
  expandGroups: (values: string[]) => void;
}

const FormGroupContext = createContext<FormGroupContextType | undefined>();

/**
 * Checks if a field is optional in the schema by testing if it accepts undefined
 */
function isFieldOptional(
  schema: SchemaWithShape | undefined,
  fieldName: string,
): boolean {
  if (!schema) return true; // If no schema, assume optional
  const fieldSchema = schema.shape[fieldName];
  if (!fieldSchema) return true; // If field not in schema, assume optional
  // A field is optional if it accepts undefined or empty string as a valid value
  return (
    fieldSchema.safeParse(undefined).success ||
    fieldSchema.safeParse("").success
  );
}

/**
 * Checks if all fields in a list are optional according to the schema
 */
function areAllFieldsOptional(
  schema: SchemaWithShape | undefined,
  fields: string[] | undefined,
): boolean {
  if (!fields || fields.length === 0) return false;
  return fields.every((field) => isFieldOptional(schema, field));
}

export interface FormGroupProps extends ParentProps {
  /** Unique value for the accordion item */
  value: string;
  /** Title displayed in the accordion header */
  title: string;
  /** The form instance to track validation state. Optional - uses context from FormGroupContainer if not provided. */
  form?: AnyFormApi;
  /** List of field names in this group to track for validation */
  fields?: string[];
  /** Whether to show a warning indicator when fields are empty but not touched */
  showWarningWhenEmpty?: boolean;
  /** Additional CSS class for the accordion item */
  class?: string;
}

/**
 * Computes the validation state for a group of field metas.
 * Only considers errors on touched fields to avoid showing errors on mount,
 * unless ignoreTouchState is true (useful for edit mode where fields are pre-populated).
 */
function computeValidationState(
  fieldMetas: Array<{ errors?: unknown[]; isTouched?: boolean } | undefined>,
  showWarningWhenEmpty?: boolean,
  ignoreTouchState?: boolean,
): ValidationState {
  if (!fieldMetas.length) return "pending";

  // When ignoreTouchState is true, treat all fields as if they were touched
  // This is useful in edit mode where fields have existing values
  if (ignoreTouchState) {
    // Check if any field has errors
    const hasErrors = fieldMetas.some(
      (meta) => meta?.errors && meta.errors.length > 0,
    );
    if (hasErrors) return "invalid";

    // All fields are valid
    return "valid";
  }

  // Check if any field has been touched
  const anyTouched = fieldMetas.some((meta) => meta?.isTouched);

  // If no fields touched yet, show pending
  if (!anyTouched) return "pending";

  // Only count errors on touched fields
  const touchedWithErrors = fieldMetas.filter(
    (meta) => meta?.isTouched && meta?.errors && meta.errors.length > 0,
  );

  // If any touched field has errors, show invalid
  if (touchedWithErrors.length > 0) return "invalid";

  // At this point: at least one field touched, no touched fields have errors
  // Check if all fields are valid (including untouched optional fields with no errors)
  const allValid = fieldMetas.every(
    (meta) => !meta?.errors || meta.errors.length === 0,
  );

  if (allValid) return "valid";

  // Warning state: some fields touched but there might be untouched fields with pending validation
  if (showWarningWhenEmpty) {
    return "warning";
  }

  return "pending";
}

/**
 * Extracts error messages from field metas.
 * Only includes errors from touched fields to avoid showing errors on mount,
 * unless ignoreTouchState is true.
 */
function extractErrors(
  fieldMetas: Array<{ errors?: unknown[]; isTouched?: boolean } | undefined>,
  ignoreTouchState?: boolean,
): string[] {
  const errors: string[] = [];
  for (const meta of fieldMetas) {
    // Include errors from all fields if ignoreTouchState, otherwise only touched fields
    const shouldInclude = ignoreTouchState || meta?.isTouched;
    if (shouldInclude && meta?.errors) {
      for (const error of meta.errors) {
        const message =
          typeof error === "string" ? error : (error as any)?.message;
        if (message) errors.push(message);
      }
    }
  }
  return errors;
}

/**
 * A form section component that groups related fields in an accordion.
 * Displays validation status icons (pending, valid, invalid) based on field states.
 * Uses form.Subscribe for reactive updates when field states change.
 *
 * @example
 * ```tsx
 * <FormGroupContainer form={form} defaultValue={["basic-info"]}>
 *   <FormGroup
 *     value="basic-info"
 *     title="Basic Information"
 *     fields={["houseName", "localAuthority"]}
 *   >
 *     <FormTextField form={form} name="houseName" label="House Name" required />
 *     <FormTextField form={form} name="localAuthority" label="Local Authority" />
 *   </FormGroup>
 * </FormGroupContainer>
 * ```
 */
export function FormGroup(props: FormGroupProps) {
  const context = useContext(FormGroupContext);

  // Get form from props or context
  const form = () => props.form ?? context?.form;

  // Get schema from context
  const schema = () => context?.schema;

  // Get ignoreTouchState from context (for edit mode)
  const ignoreTouchState = () => context?.ignoreTouchState;

  // Register this group with the container for error expansion
  onMount(() => {
    context?.registerGroup({
      value: props.value,
      fields: props.fields ?? [],
    });
  });

  onCleanup(() => {
    context?.unregisterGroup(props.value);
  });

  // Group is optional if all fields are optional according to the schema
  const isAllOptional = () => areAllFieldsOptional(schema(), props.fields);

  const currentForm = form();
  if (!currentForm) {
    console.warn(
      "FormGroup: No form provided via props or FormGroupContainer context",
    );
    return null;
  }

  return (
    <currentForm.Subscribe
      selector={(state: { fieldMeta: Record<string, any> }) => ({
        fieldMetas: props.fields?.map((f) => state.fieldMeta[f]) ?? [],
      })}
    >
      {(
        subscription: () => {
          fieldMetas: Array<
            { errors?: unknown[]; isTouched?: boolean } | undefined
          >;
        },
      ) => {
        const validationState = () =>
          computeValidationState(
            subscription().fieldMetas,
            props.showWarningWhenEmpty,
            ignoreTouchState(),
          );
        const errorMessages = () =>
          extractErrors(subscription().fieldMetas, ignoreTouchState());

        return (
          <AccordionItem
            value={props.value}
            class={cn("border-b", props.class)}
          >
            <AccordionTrigger class="hover:no-underline">
              <div class="flex items-center justify-between text-sm gap-2 w-full pr-2">
                <span class="font-medium">
                  {props.title}
                  <Show when={isAllOptional()}>
                    <span class="text-muted-foreground font-normal ml-1">
                      (optional)
                    </span>
                  </Show>
                </span>
                <ValidationIcon
                  state={validationState()}
                  errors={errorMessages()}
                />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div class="flex flex-col gap-4 py-2">{props.children}</div>
            </AccordionContent>
          </AccordionItem>
        );
      }}
    </currentForm.Subscribe>
  );
}

interface ValidationIconProps {
  state: ValidationState;
  errors?: string[];
}

function ValidationIcon(props: ValidationIconProps) {
  return (
    <Switch fallback={<CircleDashed class="size-4 text-muted-foreground" />}>
      <Match when={props.state === "valid"}>
        <CheckCircle2 class="size-4 text-green-500" />
      </Match>
      <Match when={props.state === "invalid"}>
        <Tooltip>
          <TooltipTrigger
            as="span"
            onClick={(e: MouseEvent) => e.preventDefault()}
          >
            <AlertCircle class="size-4 text-destructive" />
          </TooltipTrigger>
          <TooltipContent>
            <Show
              when={props.errors && props.errors.length > 0}
              fallback="Please fix the errors in this section"
            >
              {props.errors?.join(", ")}
            </Show>
          </TooltipContent>
        </Tooltip>
      </Match>
      <Match when={props.state === "warning"}>
        <Tooltip>
          <TooltipTrigger
            as="span"
            onClick={(e: MouseEvent) => e.preventDefault()}
          >
            <AlertCircle class="size-4 text-amber-500" />
          </TooltipTrigger>
          <TooltipContent>Please fill in the required fields</TooltipContent>
        </Tooltip>
      </Match>
    </Switch>
  );
}

export interface FormGroupContainerProps extends ParentProps {
  /** The form instance - required. Provides form to all FormGroup children via context. */
  form: AnyFormApi;
  /** Accordion type - single or multiple */
  type?: "single" | "multiple";
  /** Default expanded values */
  defaultValue?: string[];
  /** Controlled value */
  value?: string[];
  /** Callback when value changes */
  onValueChange?: (value: string[]) => void;
  /** Additional CSS class */
  class?: string;
  /** Whether all sections can be collapsed */
  collapsible?: boolean;
  /** Zod schema to infer which fields are optional. When provided, FormGroup will show "(optional)" for groups where all fields are optional. */
  schema?: SchemaWithShape;
  /** When true, ignores touch state for validation status icons. Useful in edit mode where fields are pre-populated. */
  ignoreTouchState?: boolean;
}

/**
 * Container component for FormGroup sections.
 * Wraps FormGroup components in an Accordion and provides form context to children.
 * Automatically expands accordion sections when their fields have validation errors.
 *
 * @example
 * ```tsx
 * <FormGroupContainer
 *   form={form}
 *   defaultValue={["basic-info", "contact"]}
 *   schema={houseSchema}
 * >
 *   <FormGroup value="basic-info" title="Basic Information" fields={["name"]}>
 *     ...
 *   </FormGroup>
 *   <FormGroup value="contact" title="Contact Details" fields={["email"]}>
 *     ...
 *   </FormGroup>
 * </FormGroupContainer>
 * ```
 */
/**
 * Hook for field components to auto-infer required status from the schema context.
 * - `required={true}` → always required (manual override)
 * - `required={false}` → never required (manual override)
 * - `required` not set → infer from schema context (falls back to `false` when no context)
 */
export function useFieldRequired(
  name: () => string,
  explicitRequired: () => boolean | undefined,
): () => boolean {
  const context = useContext(FormGroupContext);
  return () => {
    const explicit = explicitRequired();
    if (explicit !== undefined) return explicit;
    if (!context?.schema) return false;
    return !isFieldOptional(context.schema, name());
  };
}

export function FormGroupContainer(props: FormGroupContainerProps) {
  // Track registered groups using a store for fine-grained reactivity
  const [groups, setGroups] = createStore<Record<string, string[]>>({});

  // Internal accordion value state for uncontrolled mode with error expansion
  const [internalValue, setInternalValue] = createSignal<string[]>(
    props.defaultValue ?? [],
  );

  // Use controlled value if provided, otherwise use internal state
  const accordionValue = createMemo(() => props.value ?? internalValue());

  const handleValueChange = (newValue: string[]) => {
    setInternalValue(newValue);
    props.onValueChange?.(newValue);
  };

  const registerGroup = (registration: FormGroupRegistration) => {
    setGroups(registration.value, registration.fields);
  };

  const unregisterGroup = (value: string) => {
    setGroups(
      produce((state) => {
        delete state[value];
      }),
    );
  };

  const expandGroups = (values: string[]) => {
    const current = internalValue();
    const newValues = [...new Set([...current, ...values])];
    setInternalValue(newValues);
    props.onValueChange?.(newValues);
  };

  // Watch for field errors and auto-expand groups that have errors
  const fieldMeta = props.form.useStore(
    (state: {
      fieldMeta: Record<string, { errors?: unknown[] } | undefined>;
    }) => state.fieldMeta,
  );

  // Compute which groups currently have errors
  const groupsWithErrors = createMemo(() => {
    const meta = fieldMeta();
    const errorGroups: string[] = [];

    for (const groupValue of Object.keys(groups)) {
      const fields = groups[groupValue];
      if (fields?.some((field) => meta[field]?.errors?.length)) {
        errorGroups.push(groupValue);
      }
    }

    return errorGroups;
  });

  // When groups newly get errors, expand them
  createEffect(
    on(
      groupsWithErrors,
      (current, prev) => {
        if (!prev) return;
        const newErrors = current.filter((g) => !prev.includes(g));
        if (newErrors.length > 0) {
          expandGroups(newErrors);
        }
      },
      { defer: true },
    ),
  );

  const contextValue: FormGroupContextType = {
    form: props.form,
    schema: props.schema,
    ignoreTouchState: props.ignoreTouchState,
    registerGroup,
    unregisterGroup,
    expandGroups,
  };

  return (
    <FormGroupContext.Provider value={contextValue}>
      <Accordion
        multiple={props.type !== "single"}
        defaultValue={
          props.value === undefined ? props.defaultValue : undefined
        }
        value={accordionValue()}
        onChange={handleValueChange}
        collapsible={props.collapsible ?? true}
        class={cn("w-full", props.class)}
      >
        {props.children}
      </Accordion>
    </FormGroupContext.Provider>
  );
}
