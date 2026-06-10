import { createEffect, createSignal, Show } from "solid-js";
import {
  TextField,
  TextFieldErrorMessage,
  TextFieldLabel,
  TextFieldTextArea,
} from "../../text-field.tsx";
import type { FieldBinding } from "../types.ts";

export function SchemaTextareaField(props: { binding: FieldBinding<string> }) {
  const [textarea, setTextarea] = createSignal<HTMLTextAreaElement>();

  createEffect(
    () => textarea(),
    (element) => {
      if (!element) return;

      const syncValue = () => props.binding.onInput(element.value);
      element.addEventListener("input", syncValue);
      element.addEventListener("change", syncValue);

      return () => {
        element.removeEventListener("input", syncValue);
        element.removeEventListener("change", syncValue);
      };
    },
  );

  return (
    <TextField
      class="grid w-full items-center gap-1.5"
      validationState={props.binding.validationState()}
      disabled={props.binding.disabled}
    >
      <Show when={props.binding.label}>
        <TextFieldLabel>
          {props.binding.label}
          {props.binding.required && <span class="ml-0.5 text-error-foreground">*</span>}
        </TextFieldLabel>
      </Show>
      <TextFieldTextArea
        ref={setTextarea}
        name={props.binding.name}
        placeholder={props.binding.placeholder}
        rows={props.binding.rows ?? 3}
        value={props.binding.value() ?? ""}
        disabled={props.binding.disabled}
        onInput={(event) => props.binding.onInput(event.currentTarget.value)}
        onChange={(event) => props.binding.onInput(event.currentTarget.value)}
        onBlur={() => props.binding.onBlur()}
      />
      <Show when={props.binding.validationState() === "invalid"}>
        <TextFieldErrorMessage>{props.binding.errorMessage()}</TextFieldErrorMessage>
      </Show>
    </TextField>
  );
}
