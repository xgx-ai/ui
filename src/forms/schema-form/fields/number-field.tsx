import { Show } from "solid-js";
import {
  NumberField,
  NumberFieldDecrementTrigger,
  NumberFieldErrorMessage,
  NumberFieldIncrementTrigger,
  NumberFieldInput,
  NumberFieldLabel,
} from "../../number-field.tsx";
import type { FieldBinding } from "../types.ts";

export function SchemaNumberField(props: { binding: FieldBinding<number | undefined> }) {
  return (
    <NumberField
      class="grid w-full items-center gap-1.5"
      rawValue={props.binding.value()}
      onRawValueChange={(value) => {
        const normalised = Number.isNaN(value) ? undefined : value;
        if (normalised !== props.binding.value()) {
          props.binding.onInput(normalised);
        }
      }}
      minValue={props.binding.minValue}
      maxValue={props.binding.maxValue}
      step={props.binding.step}
      validationState={props.binding.validationState()}
      disabled={props.binding.disabled}
    >
      <Show when={props.binding.label}>
        <NumberFieldLabel>
          {props.binding.label}
          {props.binding.required && <span class="ml-0.5 text-error-foreground">*</span>}
        </NumberFieldLabel>
      </Show>
      <div class="relative">
        <NumberFieldInput
          name={props.binding.name}
          placeholder={props.binding.placeholder}
          disabled={props.binding.disabled}
          onBlur={() => props.binding.onBlur()}
          class="pr-8"
        />
        <NumberFieldIncrementTrigger />
        <NumberFieldDecrementTrigger />
      </div>
      <Show when={props.binding.validationState() === "invalid"}>
        <NumberFieldErrorMessage>{props.binding.errorMessage()}</NumberFieldErrorMessage>
      </Show>
    </NumberField>
  );
}
