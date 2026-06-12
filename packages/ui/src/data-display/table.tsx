import type { ComponentProps, JSX } from "@solidjs/web";
import { For, Show } from "solid-js";
import { cn } from "../cn.ts";
import { splitProps } from "../utils/split-props";

const TableRoot = (props: ComponentProps<"table">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div class="relative h-full w-full overflow-x-auto">
      <table class={cn("w-full caption-bottom !bg-none", local.class)} {...others} />
    </div>
  );
};

const TableHeader = (props: ComponentProps<"thead">) => {
  const [local, others] = splitProps(props, ["class"]);
  return <thead class={cn("[&_tr]:border-b", local.class)} {...others} />;
};

const TableBody = (props: ComponentProps<"tbody">) => {
  const [local, others] = splitProps(props, ["class"]);
  return <tbody class={cn("[&_tr:last-child]:border-0", local.class)} {...others} />;
};

const TableFooter = (props: ComponentProps<"tfoot">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <tfoot
      class={cn("bg-surface-muted font-medium text-surface-muted-foreground", local.class)}
      {...others}
    />
  );
};

const TableRow = (props: ComponentProps<"tr">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <tr
      class={cn(
        "group border-b border-border-subtle transition-colors hover:bg-hover hover:text-hover-foreground data-[state=selected]:bg-selected data-[state=selected]:text-selected-foreground",
        local.class,
      )}
      {...others}
    />
  );
};

const TableHead = (props: ComponentProps<"th">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <th
      class={cn(
        "xgx-text-caption h-10 px-2 text-left align-middle font-semibold uppercase text-muted-foreground sm:px-4 [&:has([role=checkbox])]:pr-0",
        local.class,
      )}
      {...others}
    />
  );
};

const TableCell = (props: ComponentProps<"td">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <td
      class={cn(
        "xgx-text-body px-2 py-2.5 align-middle text-foreground sm:px-4 [&:has([role=checkbox])]:pr-0",
        local.class,
      )}
      {...others}
    />
  );
};

export type TableStatusBarProps = ComponentProps<"div"> & {
  totalCount?: number;
  totalLabel?: string;
  emptyMessage?: string;
};

const TableStatusBar = (props: TableStatusBarProps) => {
  const [local, others] = splitProps(props, ["class", "totalCount", "totalLabel", "emptyMessage"]);
  return (
    <div
      class={cn(
        "xgx-text-body flex flex-col items-center gap-2 px-4 py-3 text-muted-foreground",
        local.class,
      )}
      {...others}
    >
      <Show when={local.emptyMessage}>
        <span class="italic text-muted-foreground">{local.emptyMessage}</span>
      </Show>
      <div class="flex w-full items-center border-t border-border pt-2">
        <span>
          {local.totalLabel ?? "Total"}: {local.totalCount ?? 0}
        </span>
      </div>
    </div>
  );
};

export interface SimpleTableColumn<TData> {
  header: string;
  accessor: keyof TData | ((row: TData) => JSX.Element | string | number);
}

export interface SimpleTableProps<TData> {
  data: TData[];
  columns: SimpleTableColumn<TData>[];
  class?: string;
}

function SimpleTable<TData>(props: SimpleTableProps<TData>) {
  const getCellValue = (row: TData, column: SimpleTableColumn<TData>) => {
    if (typeof column.accessor === "function") return column.accessor(row);
    return row[column.accessor] as string | number;
  };

  return (
    <TableRoot class={props.class}>
      <TableHeader>
        <TableRow class="cursor-default border-b border-border hover:bg-transparent">
          <For each={props.columns}>{(column) => <TableHead>{column.header}</TableHead>}</For>
        </TableRow>
      </TableHeader>
      <TableBody>
        <For each={props.data}>
          {(row) => (
            <TableRow>
              <For each={props.columns}>
                {(column) => <TableCell>{getCellValue(row, column)}</TableCell>}
              </For>
            </TableRow>
          )}
        </For>
      </TableBody>
    </TableRoot>
  );
}

const TableCaption = TableRoot;

/**
 * # Table
 *
 * Native table primitives without query/runtime dependencies.
 *
 * @example
 * ```tsx
 * <TableRoot>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Name</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>Ada Lovelace</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </TableRoot>
 * ```
 */
export {
  SimpleTable,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
  TableStatusBar,
};
