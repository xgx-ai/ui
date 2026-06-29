import { Show } from "solid-js";
import {
  TextField,
  TextFieldErrorMessage,
  TextFieldInput,
  TextFieldLabel,
} from "../../text-field.tsx";
import type { FieldBinding } from "../types.ts";

export function SchemaTextField(props: { binding: FieldBinding<string> }) {
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
      <TextFieldInput
        name={props.binding.name}
        type={(props.binding.type as "text" | "email" | "url" | undefined) ?? "text"}
        inputmode={props.binding.inputMode}
        autocomplete={props.binding.autocomplete}
        placeholder={props.binding.placeholder}
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
