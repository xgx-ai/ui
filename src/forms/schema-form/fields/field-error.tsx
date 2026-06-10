import { Show } from "solid-js";
import { cn } from "../../../cn.ts";

export interface SchemaFieldErrorProps {
  message?: string;
  class?: string;
}

export function SchemaFieldError(props: SchemaFieldErrorProps) {
  return (
    <Show when={props.message}>
      <div class={cn("text-xs text-error-foreground transition-all duration-200", props.class)}>
        {props.message}
      </div>
    </Show>
  );
}
