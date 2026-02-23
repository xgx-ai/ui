import { cn } from "@xgx/ui";
import type { ParentProps } from "solid-js";

export interface FieldLabelProps extends ParentProps {
  /** Whether the field is required */
  required?: boolean;
  /** Additional CSS class */
  class?: string;
}

/**
 * A label component for form fields with optional required indicator.
 */
export function FieldLabel(props: FieldLabelProps) {
  return (
    <div
      class={cn(
        "text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        props.class,
      )}
    >
      {props.children}
      {props.required && <span class="text-destructive ml-0.5">*</span>}
    </div>
  );
}
