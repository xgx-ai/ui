import {
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@xgx/ui";
import { Show } from "solid-js";
import { FieldError } from "./field-error";
import { FieldLabel } from "./field-label";
import { useFieldRequired } from "./form-group";
import type { AnyFieldApi, AnyFormApi, BaseFieldProps } from "./types";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectFieldProps extends BaseFieldProps {
  /** The form instance */
  form: AnyFormApi;
  /** Field name (must match a key in the form's default values) */
  name: string;
  /** Options for the select */
  options: SelectOption[];
  /** Text to show when no option is selected */
  emptyText?: string;
}

/**
 * A select field component integrated with TanStack Form.
 * Uses form.Field for reactive field state binding.
 *
 * @example
 * ```tsx
 * <FormSelectField
 *   form={form}
 *   name="status"
 *   label="Status"
 *   options={[
 *     { value: "active", label: "Active" },
 *     { value: "inactive", label: "Inactive" },
 *   ]}
 * />
 * ```
 */
export function FormSelectField(props: FormSelectFieldProps) {
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

        const selectedOption = () =>
          props.options.find((opt) => opt.value === field().state.value);

        return (
          <div class={cn("grid w-full items-center gap-1.5", props.class)}>
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

            <Select<SelectOption>
              value={selectedOption()}
              onChange={(option) => {
                field().handleChange(option?.value);
                field().handleBlur();
              }}
              options={props.options}
              optionValue="value"
              optionTextValue="label"
              optionDisabled="disabled"
              disabled={props.disabled}
              placeholder={props.placeholder ?? props.label ?? props.emptyText}
              itemComponent={(itemProps) => (
                <SelectItem item={itemProps.item}>
                  {itemProps.item.rawValue.label}
                </SelectItem>
              )}
            >
              <SelectTrigger
                class={cn(hasError() && "border-destructive")}
                onBlur={() => field().handleBlur()}
              >
                <SelectValue<SelectOption>>
                  {(state) => state.selectedOption()?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent />
            </Select>

            <FieldError errors={isTouched() ? errors() : []} />
          </div>
        );
      }}
    </props.form.Field>
  );
}
