import { Show } from "solid-js";
import type { FieldBinding } from "../types.ts";
import { SchemaFieldLabel } from "./field-label.tsx";

export function SchemaUnsupportedField(props: { binding: FieldBinding }) {
  return (
    <div class="grid w-full items-center gap-1.5">
      <Show when={props.binding.label}>
        <SchemaFieldLabel>{props.binding.label}</SchemaFieldLabel>
      </Show>
      <div class="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        This field type needs a custom field.
      </div>
    </div>
  );
}
