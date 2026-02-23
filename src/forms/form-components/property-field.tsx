import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { cn } from "../../cn.ts";
import { FieldLabel } from "./field-label.tsx";

export interface PropertyFieldProps {
  /** Field label */
  label?: string;
  /** Description text shown below the label */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Additional class names */
  class?: string;
  /** Child elements (the input/control) */
  children: JSX.Element;
}

/**
 * A wrapper component for property editor fields that provides consistent styling.
 * Follows the tanstack-form pattern for field layout.
 *
 * @example
 * ```tsx
 * <PropertyField label="Field Name" description="Enter a name for this field">
 *   <TextFieldInput placeholder="Name" />
 * </PropertyField>
 * ```
 */
export function PropertyField(props: PropertyFieldProps) {
  return (
    <div class={cn("grid w-full items-center gap-1.5", props.class)}>
      <Show when={props.label || props.description}>
        <div class="flex flex-col gap-0.5">
          <Show when={props.label}>
            <FieldLabel required={props.required}>{props.label}</FieldLabel>
          </Show>
          <Show when={props.description}>
            <p class="text-xs text-muted-foreground">{props.description}</p>
          </Show>
        </div>
      </Show>
      {props.children}
    </div>
  );
}
