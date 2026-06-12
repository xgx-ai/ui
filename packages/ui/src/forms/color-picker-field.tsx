import { createSignal, For, Show } from "solid-js";
import { cn } from "../cn";
import { Pipette } from "../icons.index";
import { Button } from "./button";
import { Label } from "./label";

export type ColorPickerFieldProps = {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;
  class?: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
  presets?: string[];
};

function normaliseHex(value: string | undefined) {
  if (!value) return "";
  const match = value.match(/^#?[0-9a-f]{6}$/i);
  return match ? (value.startsWith("#") ? value : `#${value}`) : "";
}

export function ColorPickerField(props: ColorPickerFieldProps) {
  const [internalValue, setInternalValue] = createSignal(normaliseHex(props.value));
  const value = () => normaliseHex(props.value ?? internalValue());

  const update = (next: string) => {
    setInternalValue(next);
    props.onChange?.(next);
  };

  return (
    <div class={cn("grid w-full items-center gap-1.5", props.class)}>
      <Show when={props.label}>
        <Label required={props.required}>{props.label}</Label>
      </Show>

      <div
        class={cn(
          "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm transition-colors",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          props.readOnly && "bg-muted text-muted-foreground",
          props.error && "border-error",
          props.disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <input
          id={props.id}
          type="color"
          value={value()}
          disabled={props.disabled || props.readOnly}
          onInput={(event) => update(event.currentTarget.value)}
          class="size-5 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0"
          aria-label={props.label ?? "Choose color"}
        />
        <input
          value={value()}
          disabled={props.disabled}
          readonly={props.readOnly}
          placeholder={props.placeholder ?? "Enter colour"}
          onInput={(event) => update(normaliseHex(event.currentTarget.value))}
          class="min-w-0 flex-1 bg-transparent font-mono uppercase outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={
            props.disabled ||
            props.readOnly ||
            typeof window === "undefined" ||
            !("EyeDropper" in window)
          }
          onClick={async () => {
            const picker = new (window as any).EyeDropper();
            const result = await picker.open();
            update(result.sRGBHex);
          }}
          aria-label="Pick color from screen"
        >
          <Pipette class="size-4" />
        </Button>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <For each={props.presets ?? []}>
          {(color) => (
            <button
              type="button"
              class="h-5 w-5 rounded-full border border-border-subtle shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ background: color }}
              disabled={props.disabled || props.readOnly}
              onClick={() => update(color)}
              aria-label={`Select colour ${color}`}
            />
          )}
        </For>
      </div>

      <div
        class={cn(
          "h-0 text-xs text-error opacity-0 transition-all",
          props.error && "h-4 opacity-100",
        )}
      >
        {props.error}
      </div>
    </div>
  );
}
