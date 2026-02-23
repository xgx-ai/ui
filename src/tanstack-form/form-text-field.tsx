import {
  cn,
  TextField,
  TextFieldInput,
  type TextFieldInputProps,
} from "@xgx/ui";
import { Show } from "solid-js";
import { FieldError } from "./field-error";
import { FieldLabel } from "./field-label";
import { useFieldRequired } from "./form-group";
import type { AnyFieldApi, AnyFormApi, BaseFieldProps } from "./types";

export interface FormTextFieldProps extends BaseFieldProps {
  /** The form instance */
  form: AnyFormApi;
  /** Field name (must match a key in the form's default values) */
  name: string;
  /** Input type */
  type?: TextFieldInputProps["type"];
  /** Prefix text/icon to display inside the input */
  prefix?: string;
  /** Suffix text/icon to display inside the input */
  suffix?: string;
  /** Autocomplete attribute */
  autocomplete?: string;
  /** Input mode for mobile keyboards */
  inputMode?:
    | "none"
    | "text"
    | "decimal"
    | "numeric"
    | "tel"
    | "search"
    | "email"
    | "url";
  /** Min value for number/date inputs */
  min?: string | number;
  /** Max value for number/date inputs */
  max?: string | number;
  /** Step value for number inputs */
  step?: string | number;
}

/**
 * A text field component integrated with TanStack Form.
 * Uses form.Field for reactive field state binding.
 *
 * @example
 * ```tsx
 * <FormTextField
 *   form={form}
 *   name="houseName"
 *   label="House Name"
 *   required
 * />
 * ```
 */
export function FormTextField(props: FormTextFieldProps) {
  const isRequired = useFieldRequired(
    () => props.name,
    () => props.required,
  );

  return (
    <props.form.Field name={props.name}>
      {(field: () => AnyFieldApi) => {
        const errors = () => field().state.meta.errors;
        const isTouched = () => field().state.meta.isTouched;
        const hasError = () => isTouched() && errors().length > 0;

        return (
          <TextField
            class={cn("grid w-full items-center gap-1.5", props.class)}
            disabled={props.disabled}
            readOnly={props.readOnly}
            value={field().state.value ?? ""}
            onChange={(value) => field().handleChange(value)}
            validationState={hasError() ? "invalid" : "valid"}
          >
            <Show when={props.label || props.description}>
              <div class="flex flex-col gap-0.5">
                <Show when={props.label}>
                  <FieldLabel required={isRequired()}>{props.label}</FieldLabel>
                </Show>
                <Show when={props.description}>
                  <p class="text-xs text-muted-foreground">
                    {props.description}
                  </p>
                </Show>
              </div>
            </Show>

            <div class="relative">
              <Show when={props.prefix}>
                <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground text-sm">
                  {props.prefix}
                </div>
              </Show>
              <TextFieldInput
                type={props.type ?? "text"}
                placeholder={props.placeholder ?? props.label}
                autocomplete={props.autocomplete}
                inputMode={props.inputMode}
                min={props.min}
                max={props.max}
                step={props.step}
                readOnly={props.readOnly}
                onBlur={() => field().handleBlur()}
                class={cn(props.prefix && "pl-8", props.suffix && "pr-8")}
              />
              <Show when={props.suffix}>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground text-sm">
                  {props.suffix}
                </div>
              </Show>
            </div>

            <FieldError errors={isTouched() ? errors() : []} />
          </TextField>
        );
      }}
    </props.form.Field>
  );
}
