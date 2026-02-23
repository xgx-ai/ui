import { createUniqueId, Show } from "solid-js";
import { cn } from "../../cn.ts";
import { Skeleton } from "../../feedback/skeleton.tsx";
import {
  TextField,
  TextFieldInput,
  type TextFieldInputProps,
} from "../text-field.tsx";
import { FieldLabel } from "./field-label.tsx";

export type TextFieldFormProps = {
  label?: string;
  placeholder?: string;
  id?: string;
  value?: string | number;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  error?: string;
  setErrors?: (value: string) => void;
  required?: boolean;
  type?: TextFieldInputProps["type"];
  readOnly?: boolean;
  suspense?: boolean;
  loading?: boolean;
  class?: string;
  autocomplete?: string;
  disabled?: boolean;
  prefix?: string;
  suffix?: string;
  dataId?: string;
  dataInteractive?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  requiredAttribute?: boolean;
  inputMode?:
    | "none"
    | "text"
    | "decimal"
    | "numeric"
    | "tel"
    | "search"
    | "email"
    | "url";
  description?: string;
};

export function TextFieldForm(props: TextFieldFormProps) {
  const id = props.id ?? createUniqueId();
  const handleInputChange = (e: string) => {
    if (props.error && props.id) {
      props.setErrors?.(props.id);
    }
    props.onChange?.(e);
  };

  return (
    <TextField
      data-label={props.label}
      data-id={props.dataId}
      data-interactive={props.dataInteractive}
      data-type={props.type}
      class={cn("grid w-full items-center gap-2", props.class)}
      readOnly={props.readOnly}
      data-required={props.required}
      required={props.requiredAttribute}
      disabled={props.disabled}
      onChange={handleInputChange}
      value={props.value !== undefined ? String(props.value) : ""}
      validationState={props.error ? "invalid" : "valid"}
    >
      <div class="flex flex-col gap-1">
        <Show when={props.label}>
          <FieldLabel required={props.required}>{props.label}</FieldLabel>
        </Show>
        <Show when={props.description}>
          <p class="text-3xs text-muted-foreground">{props.description}</p>
        </Show>
      </div>
      <Show
        when={!props.loading}
        fallback={
          <Skeleton
            class={cn("grid w-full items-center gap-2", props.class)}
            height={40}
            radius={2}
          />
        }
      >
        <div class="relative">
          <Show when={props.prefix}>
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
              {props.prefix}
            </div>
          </Show>
          <Show when={props.suffix}>
            <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
              {props.suffix}
            </div>
          </Show>
          <TextFieldInput
            min={props.min}
            max={props.max}
            step={props.step}
            inputMode={props.inputMode}
            readOnly={props.readOnly}
            onBlur={(e: FocusEvent & { currentTarget: HTMLInputElement }) =>
              props.onBlur?.(e.currentTarget.value)
            }
            type={props.type ?? "text"}
            id={id}
            placeholder={props.placeholder ?? props.label}
            autocomplete={props.autocomplete}
            class={cn(props.prefix && "pl-7")}
          />
        </div>
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
