import { cn, TextField, TextFieldTextArea } from "@xgx/ui";
import { Show } from "solid-js";
import { FieldError } from "./field-error";
import { FieldLabel } from "./field-label";
import { useFieldRequired } from "./form-group";
import type { AnyFieldApi, AnyFormApi, BaseFieldProps } from "./types";

export interface FormTextareaFieldProps extends BaseFieldProps {
  /** The form instance */
  form: AnyFormApi;
  /** Field name (must match a key in the form's default values) */
  name: string;
  /** Number of visible text lines */
  rows?: number;
}

/**
 * A textarea field component integrated with TanStack Form.
 * Uses form.Field for reactive field state binding.
 *
 * @example
 * ```tsx
 * <FormTextareaField
 *   form={form}
 *   name="description"
 *   label="Description"
 *   rows={4}
 * />
 * ```
 */
export function FormTextareaField(props: FormTextareaFieldProps) {
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

            <TextFieldTextArea
              placeholder={props.placeholder ?? props.label}
              readOnly={props.readOnly}
              onBlur={() => field().handleBlur()}
              style={{
                "min-height": props.rows ? `${props.rows * 1.5}rem` : undefined,
              }}
            />

            <FieldError errors={isTouched() ? errors() : []} />
          </TextField>
        );
      }}
    </props.form.Field>
  );
}
