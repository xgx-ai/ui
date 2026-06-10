import type { ParentProps } from "solid-js";
import { cn } from "../../../cn.ts";

export interface SchemaFieldLabelProps extends ParentProps {
  required?: boolean;
  class?: string;
}

export function SchemaFieldLabel(props: SchemaFieldLabelProps) {
  return (
    <div
      class={cn(
        "text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        props.class,
      )}
    >
      {props.children}
      {props.required && <span class="ml-0.5 text-error-foreground">*</span>}
    </div>
  );
}
