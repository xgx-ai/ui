import type { Component } from "solid-js";
import { createEffect, createSignal, Show } from "solid-js";
import { cn } from "../cn";

type ColorPickerProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  class?: string;
  /** Size of the swatch */
  size?: "sm" | "md" | "lg";
  /** Show hex value next to swatch */
  showValue?: boolean;
  /** Variant style */
  variant?: "swatch" | "button";
};

const swatchSizes = {
  sm: "size-6",
  md: "size-8",
  lg: "size-10",
};

const buttonSwatchSizes = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

/**
 * # ColorPicker
 *
 * A color picker component using the native color input with a styled trigger.
 *
 * @example
 * ```
 * <div class="space-y-4">
 *   <div class="flex items-center gap-4">
 *     <ColorPicker defaultValue="#6366f1" />
 *     <ColorPicker defaultValue="#10b981" size="lg" />
 *   </div>
 *   <div class="flex items-center gap-4">
 *     <ColorPicker defaultValue="#6366f1" variant="button" />
 *     <ColorPicker defaultValue="#10b981" variant="button" showValue />
 *   </div>
 * </div>
 * ```
 */
const ColorPicker: Component<ColorPickerProps> = (props) => {
  const [internalValue, setInternalValue] = createSignal(
    props.value ?? props.defaultValue ?? "#000000",
  );

  // Sync with external value prop
  createEffect(() => {
    if (props.value !== undefined) {
      setInternalValue(props.value);
    }
  });

  const handleChange = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    const newValue = target.value;
    setInternalValue(newValue);
    props.onValueChange?.(newValue);
  };

  const variant = () => props.variant ?? "swatch";
  const size = () => props.size ?? "md";

  return (
    <label
      class={cn(
        "inline-flex items-center gap-2 cursor-pointer",
        variant() === "button" &&
          "rounded-md border px-3 py-2 hover:bg-accent transition-colors",
        props.disabled && "opacity-50 cursor-not-allowed",
        props.class,
      )}
    >
      <input
        type="color"
        value={internalValue()}
        onInput={handleChange}
        disabled={props.disabled}
        class={cn(
          "cursor-pointer rounded border appearance-none bg-transparent",
          "[&::-webkit-color-swatch-wrapper]:p-0",
          "[&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none",
          "[&::-moz-color-swatch]:rounded [&::-moz-color-swatch]:border-none",
          variant() === "swatch"
            ? swatchSizes[size()]
            : buttonSwatchSizes[size()],
          props.disabled && "cursor-not-allowed",
        )}
      />
      <Show when={props.showValue || variant() === "button"}>
        <span class="text-sm font-mono text-muted-foreground uppercase">
          {internalValue()}
        </span>
      </Show>
    </label>
  );
};

export { ColorPicker };
