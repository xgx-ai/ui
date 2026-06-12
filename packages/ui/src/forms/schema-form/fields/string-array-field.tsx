import { createSignal, For, Show } from "solid-js";
import { Badge } from "../../../feedback/badge.tsx";
import { Button } from "../../button.tsx";
import { X } from "../../../icons.index.ts";
import type { FieldBinding } from "../types.ts";
import { SchemaFieldError } from "./field-error.tsx";
import { SchemaFieldLabel } from "./field-label.tsx";

export function SchemaStringArrayField(props: { binding: FieldBinding<string[]> }) {
  const [inputValue, setInputValue] = createSignal("");

  const items = () => props.binding.value() ?? [];

  const addItem = () => {
    const value = inputValue().trim();
    if (!value) return;
    props.binding.onInput([...items(), value]);
    setInputValue("");
  };

  const removeItem = (index: number) => {
    props.binding.onInput(items().filter((_, itemIndex) => itemIndex !== index));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addItem();
    }
  };

  return (
    <div class="grid w-full items-center gap-1.5">
      <Show when={props.binding.label}>
        <SchemaFieldLabel required={props.binding.required}>{props.binding.label}</SchemaFieldLabel>
      </Show>

      <Show when={items().length > 0}>
        <div class="flex flex-wrap gap-1">
          <For each={items()}>
            {(item, index) => (
              <Badge variant="default" class="gap-1 pr-1">
                {item}
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-sm hover:bg-muted-foreground/20"
                  onClick={() => removeItem(index())}
                  aria-label={`Remove ${item}`}
                >
                  <X class="size-3" />
                </button>
              </Badge>
            )}
          </For>
        </div>
      </Show>

      <div class="flex gap-1.5">
        <input
          type="text"
          aria-label={props.binding.label}
          class="xgx-field-focus flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs placeholder:text-xs placeholder:text-muted-foreground"
          placeholder={props.binding.placeholder ?? "Type and press Enter"}
          value={inputValue()}
          onInput={(event) => setInputValue(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => props.binding.onBlur()}
          disabled={props.binding.disabled}
        />
        <Button
          type="button"
          aria-label={`Add ${props.binding.label ?? "item"}`}
          variant="secondary"
          size="sm"
          onClick={addItem}
          disabled={props.binding.disabled || !inputValue().trim()}
        >
          Add
        </Button>
      </div>

      <SchemaFieldError message={props.binding.errorMessage()} />
    </div>
  );
}
