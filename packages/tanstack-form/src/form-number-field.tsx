import {
  cn,
  NumberField,
  NumberFieldDecrementTrigger,
  NumberFieldIncrementTrigger,
  NumberFieldInput,
} from "@xgx/ui";
import { Show } from "solid-js";
import { FieldError } from "./field-error";
import { FieldLabel } from "./field-label";
import { useFieldRequired } from "./form-group";
import type { AnyFieldApi, AnyFormApi, BaseFieldProps } from "./types";

export interface FormNumberFieldProps extends BaseFieldProps {
  /** The form instance */
  form: AnyFormApi;
  /** Field name (must match a key in the form's default values) */
  name: string;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Whether to show increment/decrement buttons */
  showButtons?: boolean;
  /** Format options for displaying the number */
  formatOptions?: Intl.NumberFormatOptions;
}

/**
 * A number field component integrated with TanStack Form.
 * Uses form.Field for reactive field state binding.
 *
 * @example
 * ```tsx
 * <FormNumberField
 *   form={form}
 *   name="maxOccupancy"
 *   label="Max Occupancy"
 *   min={1}
 *   max={20}
 *   showButtons
 * />
 * ```
 */
export function FormNumberField(props: FormNumberFieldProps) {
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
          <NumberField
            class={cn("grid w-full items-center gap-1.5", props.class)}
            disabled={props.disabled}
            readOnly={props.readOnly}
            rawValue={field().state.value}
            onRawValueChange={(value) => {
              // Convert NaN to undefined for optional number fields
              const normalizedValue = Number.isNaN(value) ? undefined : value;
              // Only update if the value actually changed to avoid infinite loops
              if (normalizedValue !== field().state.value) {
                field().handleChange(normalizedValue);
              }
            }}
            minValue={props.min}
            maxValue={props.max}
            step={props.step}
            formatOptions={props.formatOptions}
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
              <NumberFieldInput
                placeholder={props.placeholder ?? props.label}
                onBlur={() => field().handleBlur()}
                class={cn(props.showButtons && "pr-8")}
              />
              <Show when={props.showButtons}>
                <NumberFieldIncrementTrigger />
                <NumberFieldDecrementTrigger />
              </Show>
            </div>

            <FieldError errors={isTouched() ? errors() : []} />
          </NumberField>
        );
      }}
    </props.form.Field>
  );
}
