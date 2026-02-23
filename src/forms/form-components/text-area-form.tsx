import { createUniqueId, Show } from "solid-js";
import { cn } from "../../cn.ts";
import { Skeleton } from "../../feedback/skeleton.tsx";
import { TextField, TextFieldTextArea } from "../text-field.tsx";
import { FieldLabel } from "./field-label.tsx";

export type TextAreaFormProps = {
  label?: string;
  placeholder?: string;
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  error?: string;
  setErrors?: (value: string) => void;
  required?: boolean;
  readOnly?: boolean;
  suspense?: boolean;
  loading?: boolean;
  class?: string;
  disabled?: boolean;
  dataId?: string;
  dataInteractive?: string;
  requiredAttribute?: boolean;
  description?: string;
  rows?: number;
  minHeight?: string;
};

export function TextAreaForm(props: TextAreaFormProps) {
  const id = props.id ?? createUniqueId();
  const handleInputChange = (e: string) => {
    if (props.error && props.id) {
      props.setErrors?.(props.id);
    }
    props.onChange?.(e);
  };

  return (
    <TextField
      name={id}
      data-label={props.label}
      data-id={props.dataId}
      data-interactive={props.dataInteractive}
      class={cn("grid w-full items-center gap-2", props.class)}
      readOnly={props.readOnly}
      data-required={props.required}
      required={props.requiredAttribute}
      disabled={props.disabled}
      onChange={handleInputChange}
      value={props.value ?? ""}
      validationState={props.error ? "invalid" : "valid"}
    >
      <div class="flex flex-col gap-1">
        <Show when={props.label}>
          <FieldLabel required={props.required}>{props.label}</FieldLabel>
        </Show>
        <Show when={props.description}>
          <p class="text-3xs text-gray-500">{props.description}</p>
        </Show>
      </div>
      <Show
        when={!props.loading}
        fallback={
          <Skeleton
            class={cn("grid w-full items-center gap-2", props.class)}
            height={props.minHeight ? undefined : 120}
            radius={2}
          />
        }
      >
        <TextFieldTextArea
          readOnly={props.readOnly}
          onBlur={(e) => props.onBlur?.(e.currentTarget.value)}
          id={id}
          placeholder={props.placeholder ?? props.label}
          rows={props.rows}
          class={cn(props.minHeight && `min-h-[${props.minHeight}]`)}
        />
      </Show>

      <div
        class={cn(
          "transition-all opacity-0 h-0 duration-300 ease-in-out text-xs text-destructive",
          props.error && "opacity-100 h-4 ",
        )}
      >
        {props.error}
      </div>
    </TextField>
  );
}
