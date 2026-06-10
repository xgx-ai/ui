import { Show } from "solid-js";
import { Checkbox } from "../../checkbox.tsx";
import type { FieldBinding } from "../types.ts";
import { SchemaFieldError } from "./field-error.tsx";

export function SchemaCheckboxField(props: { binding: FieldBinding<boolean> }) {
  return (
    <div class="grid w-full items-center gap-1.5">
      <div class="flex items-center gap-2">
        <Checkbox
          aria-label={props.binding.label}
          name={props.binding.name}
          checked={props.binding.value() ?? false}
          onChange={(checked) => {
            props.binding.onInput(checked);
            props.binding.onBlur();
          }}
          disabled={props.binding.disabled}
        />
        <Show when={props.binding.label}>
          <label class="cursor-pointer text-xs font-medium leading-none">
            {props.binding.label}
          </label>
        </Show>
      </div>
      <SchemaFieldError message={props.binding.errorMessage()} />
    </div>
  );
}
