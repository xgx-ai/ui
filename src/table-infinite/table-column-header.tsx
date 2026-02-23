import { cn } from "@xgx/ui";
import type { Component } from "solid-js";
import { Show } from "solid-js";

export interface TableColumnHeaderProps {
  title: string;
  sortable?: boolean;
  sorted?: false | "asc" | "desc";
  onSort?: ((event: unknown) => void) | (() => void);
  class?: string;
}

export const TableColumnHeader: Component<TableColumnHeaderProps> = (props) => {
  return (
    <button
      type="button"
      class={cn(
        "flex items-center gap-2",
        props.sortable && "cursor-pointer select-none hover:text-foreground",
        props.class,
      )}
      onClick={props.sortable ? props.onSort : undefined}
    >
      <span class="font-medium">{props.title}</span>
      <Show when={props.sorted}>
        {(sorted) => (
          <span class="text-xs">{sorted() === "asc" ? "↑" : "↓"}</span>
        )}
      </Show>
    </button>
  );
};
