import { cn } from "@xgx/ui";
import { For, Show } from "solid-js";

export interface FieldErrorProps {
  /** Array of error messages */
  errors: (string | { message?: string })[];
  /** Additional CSS class */
  class?: string;
}

/**
 * Displays validation error messages for a form field.
 * Handles both string errors and error objects with message property.
 */
export function FieldError(props: FieldErrorProps) {
  const normalizedErrors = () =>
    props.errors
      .map((err) => (typeof err === "string" ? err : (err?.message ?? "")))
      .filter(Boolean);

  return (
    <Show when={normalizedErrors().length > 0}>
      <div
        class={cn(
          "text-xs text-destructive transition-all duration-200",
          props.class,
        )}
      >
        <For each={normalizedErrors()}>{(error) => <p>{error}</p>}</For>
      </div>
    </Show>
  );
}
