import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";
import { ArrowDown, ArrowUp } from "../icons.index";

/**
 * A column header's label as a button, for tables an application lays out itself.
 * `TableInfinite` in `@xgx/ui/prefabs/table-infinite` renders its own sortable headers.
 */
export function TableColumnHeader(props: {
  children?: JSX.Element;
  onSort?: (event?: unknown) => void;
  sortable?: boolean;
  sorted?: false | "asc" | "desc";
  title?: string;
}) {
  return (
    <button
      class="inline-flex items-center gap-1 text-left"
      type="button"
      disabled={!props.sortable}
      onClick={(event) => {
        // A sortable header cell may also toggle on click; sort once.
        event.stopPropagation();
        props.onSort?.(event);
      }}
    >
      {props.title ?? props.children}
      {/* Decorative: the header cell carries aria-sort. */}
      <Show when={props.sorted}>
        {(direction) => (
          <span data-sort-direction={direction()} aria-hidden="true" class="inline-flex">
            <Show when={direction() === "asc"} fallback={<ArrowDown class="size-3" />}>
              <ArrowUp class="size-3" />
            </Show>
          </span>
        )}
      </Show>
    </button>
  );
}
