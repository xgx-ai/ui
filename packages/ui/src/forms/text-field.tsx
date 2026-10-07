/**
 * # TextField
 *
 * Groups text inputs, labels, descriptions, and errors.
 *
 * @example
 * ```tsx
 * <TextField>
 *   <TextFieldLabel>Email</TextFieldLabel>
 *   <TextFieldInput type="email" placeholder="you@example.com" />
 * </TextField>
 * ```
 */
import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import {
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  omit,
  untrack,
  useContext,
} from "solid-js";

import { cn } from "../cn.ts";
import { callEventHandler } from "../utils/event-handler";

type ValidationState = "valid" | "invalid";

type TextFieldContextValue = {
  inputId: () => string;
  descriptionId: () => string;
  errorId: () => string;
  disabled: () => boolean;
  invalid: () => boolean;
  name: () => string | undefined;
  readOnly: () => boolean;
  required: () => boolean;
  setValue: (value: string) => void;
  value: () => string | undefined;
};

const TextFieldContext = createContext<TextFieldContextValue | null>(null);

function useTextFieldContext() {
  return useContext(TextFieldContext);
}

/**
 * Shows a controlled value again when a field commits (blurs). Input that a handler normalises
 * back to the current value (trimming a leading space, say) leaves the value unchanged, so the
 * value binding never rewrites the element. This runs after the commit's writes have flushed.
 * It waits for the commit because a value can follow input asynchronously (router search
 * state, for instance), and reconciling on every keystroke would discard input in flight.
 */
function createCommitReconciler(value: () => unknown) {
  const [committed, setCommitted] = createSignal<
    HTMLInputElement | HTMLTextAreaElement | undefined
  >(undefined, { equals: false });
  createEffect(
    () => {
      const element = committed();
      // The value as of the commit; later changes reach the element through its binding.
      return { element, value: untrack(value) };
    },
    ({ element, value }) => {
      if (element && value != null && element.value !== String(value)) {
        element.value = String(value);
      }
    },
  );
  return setCommitted;
}

type TextFieldRootProps<T extends ValidComponent = "div"> = Omit<
  ComponentProps<"div">,
  "children" | "onChange"
> & {
  as?: T;
  class?: string | undefined;
  children?: JSX.Element;
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
  validationState?: ValidationState;
  value?: string;
};

const TextField = <T extends ValidComponent = "div">(props: TextFieldRootProps<T>) => {
  const fallbackId = createUniqueId();
  const local = props;
  const others = omit(
    props,
    "as",
    "class",
    "children",
    "defaultValue",
    "disabled",
    "name",
    "onChange",
    "readOnly",
    "required",
    "validationState",
    "value",
    "id",
  );
  const [internalValue, setInternalValue] = createSignal(untrack(() => local.defaultValue));
  const fieldId = () => String(local.id ?? `textfield-${fallbackId}`);
  const inputId = () => `${fieldId()}-input`;
  const descriptionId = () => `${fieldId()}-description`;
  const errorId = () => `${fieldId()}-error`;
  const invalid = () => local.validationState === "invalid";
  const value = () => local.value ?? internalValue();
  const setValue = (next: string) => {
    setInternalValue(next);
    local.onChange?.(next);
  };

  return (
    <TextFieldContext
      value={{
        inputId,
        descriptionId,
        errorId,
        disabled: () => local.disabled === true,
        invalid,
        name: () => local.name,
        readOnly: () => local.readOnly === true,
        required: () => local.required === true,
        setValue,
        value,
      }}
    >
      <Dynamic
        component={local.as ?? "div"}
        {...others}
        id={fieldId()}
        data-disabled={local.disabled ? "" : undefined}
        data-invalid={invalid() ? "" : undefined}
        class={cn("flex flex-col gap-1.5", local.class)}
      >
        {local.children}
      </Dynamic>
    </TextFieldContext>
  );
};

export type TextFieldInputProps<T extends ValidComponent = "input"> = ComponentProps<"input"> & {
  as?: T;
  class?: string | undefined;
  maxLength?: number | string;
  readOnly?: boolean;
};

const TextFieldInput = <T extends ValidComponent = "input">(props: TextFieldInputProps<T>) => {
  const context = useTextFieldContext();
  const local = props;
  const others = omit(
    props,
    "as",
    "class",
    "disabled",
    "id",
    "maxLength",
    "name",
    "onBlur",
    "onInput",
    "readOnly",
    "required",
    "type",
    "value",
  );
  const commit = createCommitReconciler(() => local.value ?? context?.value());
  const invalid = () => context?.invalid() ?? false;
  const describedBy = () => {
    if (!context) return others["aria-describedby"];
    const ids = [context.descriptionId()];
    if (invalid()) ids.push(context.errorId());
    return ids.join(" ");
  };

  return (
    <Dynamic
      component={local.as ?? "input"}
      {...others}
      id={local.id ?? context?.inputId()}
      type={local.type ?? "text"}
      disabled={local.disabled ?? context?.disabled()}
      maxlength={local.maxLength}
      name={local.name ?? context?.name()}
      readOnly={local.readOnly ?? context?.readOnly()}
      required={local.required ?? context?.required()}
      value={local.value ?? context?.value() ?? ""}
      onInput={(event: InputEvent & { currentTarget: HTMLInputElement }) => {
        callEventHandler(local.onInput, event);
        context?.setValue(event.currentTarget.value);
      }}
      onBlur={(event: FocusEvent & { currentTarget: HTMLInputElement }) => {
        callEventHandler(local.onBlur, event);
        commit(event.currentTarget);
      }}
      aria-invalid={invalid() ? "true" : undefined}
      aria-describedby={describedBy()}
      data-invalid={invalid() ? "" : undefined}
      class={cn(
        "xgx-field-focus read-only:bg-surface-muted cursor-text flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground data-invalid:border-error-foreground aria-invalid:border-error-foreground disabled:cursor-not-allowed disabled:opacity-50",
        (local.readOnly ?? context?.readOnly()) &&
          "bg-surface-muted text-surface-muted-foreground opacity-100",
        local.class,
      )}
    />
  );
};

type TextFieldTextAreaProps<T extends ValidComponent = "textarea"> = ComponentProps<"textarea"> & {
  as?: T;
  class?: string | undefined;
  readOnly?: boolean;
};

const TextFieldTextArea = <T extends ValidComponent = "textarea">(
  props: TextFieldTextAreaProps<T>,
) => {
  const context = useTextFieldContext();
  const local = props;
  const others = omit(
    props,
    "as",
    "class",
    "disabled",
    "id",
    "name",
    "onBlur",
    "onInput",
    "readOnly",
    "required",
    "value",
  );
  const commit = createCommitReconciler(() => local.value ?? context?.value());
  const invalid = () => context?.invalid() ?? false;
  const describedBy = () => {
    if (!context) return others["aria-describedby"];
    const ids = [context.descriptionId()];
    if (invalid()) ids.push(context.errorId());
    return ids.join(" ");
  };

  return (
    <Dynamic
      component={local.as ?? "textarea"}
      {...others}
      id={local.id ?? context?.inputId()}
      disabled={local.disabled ?? context?.disabled()}
      name={local.name ?? context?.name()}
      readOnly={local.readOnly ?? context?.readOnly()}
      required={local.required ?? context?.required()}
      value={local.value ?? context?.value() ?? ""}
      onInput={(event: InputEvent & { currentTarget: HTMLTextAreaElement }) => {
        callEventHandler(local.onInput, event);
        context?.setValue(event.currentTarget.value);
      }}
      onBlur={(event: FocusEvent & { currentTarget: HTMLTextAreaElement }) => {
        callEventHandler(local.onBlur, event);
        commit(event.currentTarget);
      }}
      aria-invalid={invalid() ? "true" : undefined}
      aria-describedby={describedBy()}
      data-invalid={invalid() ? "" : undefined}
      class={cn(
        "xgx-field-focus flex min-h-[120px] read-only:bg-surface-muted w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 data-invalid:border-error-foreground aria-invalid:border-error-foreground",
        (local.readOnly ?? context?.readOnly()) &&
          "bg-surface-muted text-surface-muted-foreground opacity-100",
        local.class,
      )}
    />
  );
};

type TextFieldLabelProps<T extends ValidComponent = "label"> = ComponentProps<"label"> & {
  as?: T;
  class?: string | undefined;
};

const TextFieldLabel = <T extends ValidComponent = "label">(props: TextFieldLabelProps<T>) => {
  const context = useTextFieldContext();
  const local = props;
  const others = omit(props, "as", "class", "children", "for");
  const invalid = () => context?.invalid() ?? false;

  return (
    <Dynamic
      component={local.as ?? "label"}
      {...others}
      for={local.for ?? context?.inputId()}
      data-invalid={invalid() ? "" : undefined}
      class={cn(
        "text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 data-invalid:text-error-foreground",
        local.class,
      )}
    >
      {local.children}
    </Dynamic>
  );
};

type TextFieldDescriptionProps<T extends ValidComponent = "div"> = ComponentProps<"div"> & {
  as?: T;
  class?: string | undefined;
};

const TextFieldDescription = <T extends ValidComponent = "div">(
  props: TextFieldDescriptionProps<T>,
) => {
  const context = useTextFieldContext();
  const local = props;
  const others = omit(props, "as", "class", "children", "id");

  return (
    <Dynamic
      component={local.as ?? "div"}
      {...others}
      id={local.id ?? context?.descriptionId()}
      class={cn("text-xs font-normal text-muted-foreground", local.class)}
    >
      {local.children}
    </Dynamic>
  );
};

type TextFieldErrorMessageProps<T extends ValidComponent = "div"> = ComponentProps<"div"> & {
  as?: T;
  class?: string | undefined;
};

const TextFieldErrorMessage = <T extends ValidComponent = "div">(
  props: TextFieldErrorMessageProps<T>,
) => {
  const context = useTextFieldContext();
  const local = props;
  const others = omit(props, "as", "class", "children", "id");

  return (
    <Dynamic
      component={local.as ?? "div"}
      {...others}
      id={local.id ?? context?.errorId()}
      class={cn("text-xs text-error-foreground", local.class)}
    >
      {local.children}
    </Dynamic>
  );
};

export {
  TextField,
  TextFieldDescription,
  TextFieldErrorMessage,
  TextFieldInput,
  TextFieldLabel,
  TextFieldTextArea,
};
