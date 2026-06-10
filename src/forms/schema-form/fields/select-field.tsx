import { Show } from "solid-js";
import { cn } from "../../../cn.ts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../select.tsx";
import type { FieldBinding, SelectOption } from "../types.ts";
import { SchemaFieldError } from "./field-error.tsx";
import { SchemaFieldLabel } from "./field-label.tsx";

export function SchemaSelectField(props: { binding: FieldBinding<string> }) {
  const selectedOption = () =>
    props.binding.options?.find((option) => option.value === props.binding.value());

  return (
    <div class="grid w-full items-center gap-1.5">
      <Show when={props.binding.label}>
        <SchemaFieldLabel required={props.binding.required}>{props.binding.label}</SchemaFieldLabel>
      </Show>
      <Select<SelectOption>
        value={selectedOption()}
        onChange={(option) => {
          if (option) props.binding.onInput(option.value);
          props.binding.onBlur();
        }}
        options={props.binding.options ?? []}
        optionValue="value"
        optionTextValue="label"
        disabled={props.binding.disabled}
        placeholder={props.binding.placeholder}
        itemComponent={(itemProps) => (
          <SelectItem item={itemProps.item}>{itemProps.item.rawValue.label}</SelectItem>
        )}
      >
        <SelectTrigger
          aria-label={props.binding.label}
          class={cn(props.binding.validationState() === "invalid" && "border-error-foreground")}
          onBlur={() => props.binding.onBlur()}
        >
          <SelectValue<SelectOption>>{(state) => state.selectedOption()?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
      <SchemaFieldError message={props.binding.errorMessage()} />
    </div>
  );
}
