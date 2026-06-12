import type { ComponentProps, JSX } from "@solidjs/web";
import { createMemo, createSignal, For, Show } from "solid-js";
import { cn } from "../cn.ts";
import { Checkbox } from "../forms/checkbox.tsx";
import { createIntersectionLoader } from "../query/index.tsx";
import type {
  CellContext,
  ColumnDef,
  HeaderContext,
  SortDirection,
  TableColumn,
  TableController,
  TableRowContext,
} from "../table-types.ts";
import { splitProps } from "../utils/split-props";
import type { UseTableReturn } from "./use-table.ts";

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

export interface TableProps<TData> {
  table: UseTableReturn<TData> | TableController<TData>;
  columns: ColumnDef<TData, unknown>[];
  getRowId?: (row: TData) => string;
  enableRowSelection?: boolean;
  enableSorting?: boolean;
  onRowClick?: (row: TData) => void;
  class?: string;
  showStatusBar?: boolean;
  statusBarLabel?: string;
  statusBarEmptyMessage?: string;
}

function getColumnId<TData>(column: ColumnDef<TData, unknown>, index: number): string {
  return column.id ?? column.accessorKey ?? `column-${index}`;
}

function getColumnValue<TData, TValue>(
  row: TData,
  rowIndex: number,
  column: ColumnDef<TData, TValue>,
): TValue {
  if (column.accessorFn) return column.accessorFn(row, rowIndex);
  if (column.accessorKey) return (row as Record<string, TValue>)[column.accessorKey];
  return undefined as TValue;
}

function compareValues(left: unknown, right: unknown): number {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function renderHeader<TData, TValue>(
  column: TableColumn<TData, TValue>,
  fallback: string,
): JSX.Element {
  const header = column.columnDef.header;
  if (typeof header === "function")
    return header({ column } satisfies HeaderContext<TData, TValue>);
  return header ?? fallback;
}

function renderCell<TData, TValue>(context: CellContext<TData, TValue>): JSX.Element {
  const cell = context.column.columnDef.cell;
  if (typeof cell === "function") return cell(context);
  return cell ?? String(context.getValue() ?? "");
}

function getColumnDisplayName<TData>(column: ColumnDef<TData, unknown>, index: number): string {
  if (column.meta?.displayName) return column.meta.displayName;
  if (typeof column.header === "string") return column.header;
  return getColumnId(column, index)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase())
    .trim();
}

function getColumnStyles<TData>(
  column: TableColumn<TData, unknown>,
  visibleColumns: TableColumn<TData, unknown>[],
): JSX.CSSProperties {
  const pinning = column.columnDef.meta?.pinned;
  const columnSize = column.columnDef.size;
  const widthValue = columnSize ? `${columnSize}px` : undefined;
  const columnIndex = visibleColumns.findIndex((item) => item.id === column.id);
  const pinnedBefore = visibleColumns
    .slice(0, Math.max(0, columnIndex))
    .filter((item) => item.columnDef.meta?.pinned === pinning)
    .reduce((total, item) => total + (item.columnDef.size ?? 150), 0);

  return {
    left: pinning === "left" ? `${pinnedBefore}px` : undefined,
    right: pinning === "right" ? `${pinnedBefore}px` : undefined,
    position: pinning ? "sticky" : "relative",
    width: widthValue,
    "min-width": widthValue,
    "max-width": widthValue,
    "z-index": pinning ? 1 : 0,
    background: "transparent",
  };
}

const Table = <TData,>(props: TableProps<TData>) => {
  const [sorting, setSorting] = createSignal<
    { columnId: string; direction: Exclude<SortDirection, false> } | undefined
  >();
  const rowId = (row: TData, index: number) =>
    props.getRowId?.(row) ?? (row as { id?: string }).id ?? String(index);
  const enableRowSelection = () => props.enableRowSelection ?? false;
  const enableSorting = () => props.enableSorting ?? false;

  const loader = createIntersectionLoader({
    canLoad: () =>
      props.table.hasMore() && !props.table.isFetchingMore() && !props.table.isLoading(),
    load: () => props.table.loadMore(),
    loadDelay: 80,
    rootMargin: "0px 0px 160px 0px",
  });

  const allColumns = createMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!enableRowSelection()) return props.columns;

    return [
      {
        id: "select",
        size: 40,
        enableSorting: false,
        header: () => {
          const data = props.table.data();
          const allSelected =
            data.length > 0 && data.every((row) => props.table.isRowSelected(row));
          const someSelected = data.some((row) => props.table.isRowSelected(row));

          return (
            <div class="flex h-full items-center justify-center">
              <Checkbox
                aria-label="Select all"
                size="md"
                checked={allSelected}
                onChange={(value) => props.table.toggleSelectAll(value)}
                indeterminate={someSelected && !allSelected}
              />
            </div>
          );
        },
        cell: (context) => (
          <div class="flex h-full items-center justify-center">
            <Checkbox
              aria-label="Select row"
              size="md"
              checked={props.table.isRowSelected(context.row.original)}
              onChange={(value) => props.table.toggleRowSelection(context.row.original, value)}
            />
          </div>
        ),
      },
      ...props.columns,
    ];
  });

  const columns = createMemo<TableColumn<TData, unknown>[]>(() =>
    allColumns().map((columnDef, index) => {
      const id = getColumnId(columnDef, index);
      const column: TableColumn<TData, unknown> = {
        id,
        index,
        columnDef,
        getCanSort: () => enableSorting() && columnDef.enableSorting !== false,
        getIsSorted: () => {
          const current = sorting();
          return current?.columnId === id ? current.direction : false;
        },
        getToggleSortingHandler: () => () => {
          if (!column.getCanSort()) return;
          setSorting((current) => {
            if (current?.columnId !== id) return { columnId: id, direction: "asc" };
            if (current.direction === "asc") return { columnId: id, direction: "desc" };
            return undefined;
          });
        },
      };
      return column;
    }),
  );

  const rows = createMemo<TableRowContext<TData>[]>(() => {
    const data = props.table.data().map((row, index) => ({
      id: rowId(row, index),
      index,
      original: row,
      getIsSelected: () => props.table.isRowSelected(row),
    }));
    const sort = sorting();
    if (!sort) return data;

    const column = columns().find((item) => item.id === sort.columnId);
    if (!column) return data;

    return [...data].sort((left, right) => {
      const result = compareValues(
        getColumnValue(left.original, left.index, column.columnDef),
        getColumnValue(right.original, right.index, column.columnDef),
      );
      return sort.direction === "asc" ? result : -result;
    });
  });

  const totalCount = () => props.table.totalCount?.() ?? props.table.data().length;
  const showEndOfResults = () =>
    !props.table.hasMore() && props.table.data().length > 0 && !props.table.isLoading();

  return (
    <div class={cn("flex min-h-0 w-full flex-1 flex-col", props.class)}>
      <div class="min-h-0 flex-1 overflow-auto">
        <TableRoot>
          <TableHeader class="bg-card" style={{ position: "sticky", top: "0", "z-index": "10" }}>
            <TableRow class="cursor-default hover:bg-transparent">
              <For each={columns()}>
                {(column) => (
                  <TableHead
                    class={cn(
                      "whitespace-nowrap",
                      column.getCanSort() && "cursor-pointer select-none",
                    )}
                    onClick={column.getToggleSortingHandler()}
                    style={getColumnStyles(column, columns())}
                  >
                    {renderHeader(column, getColumnDisplayName(column.columnDef, column.index))}
                    <Show when={column.getIsSorted()}>
                      {(sorted) => <span class="ml-2 text-xs">{sorted()}</span>}
                    </Show>
                  </TableHead>
                )}
              </For>
            </TableRow>
          </TableHeader>
          <TableBody>
            <Show
              when={!props.table.isLoading() && rows().length > 0}
              fallback={
                <TableRow class="border-none bg-transparent hover:bg-transparent">
                  <TableCell
                    colspan={Math.max(columns().length, 1)}
                    class="h-24 text-center text-xs text-muted-foreground"
                  >
                    {props.table.isLoading() ? "Loading..." : "No results."}
                  </TableCell>
                </TableRow>
              }
            >
              <For each={rows()}>
                {(row) => (
                  <TableRow
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    onClick={() => props.onRowClick?.(row.original)}
                    class={props.onRowClick ? "cursor-pointer" : undefined}
                  >
                    <For each={columns()}>
                      {(column) => {
                        const context: CellContext<TData, unknown> = {
                          row,
                          column,
                          getValue: () => getColumnValue(row.original, row.index, column.columnDef),
                        };

                        return (
                          <TableCell
                            class="whitespace-nowrap"
                            style={getColumnStyles(column, columns())}
                          >
                            {renderCell(context)}
                          </TableCell>
                        );
                      }}
                    </For>
                  </TableRow>
                )}
              </For>
            </Show>
          </TableBody>
          <TableFooter class="bg-transparent">
            <TableRow class="border-none hover:bg-transparent">
              <TableCell colspan={Math.max(columns().length, 1)} class="text-center">
                <Show when={props.table.hasMore() && !props.table.isLoading()}>
                  <div ref={loader.ref} class="flex justify-center py-4">
                    <div class="text-xs text-muted-foreground">Loading more...</div>
                  </div>
                </Show>
                <Show when={showEndOfResults()}>
                  <div class="flex justify-center py-4">
                    <div class="text-xs text-muted-foreground/70">
                      {props.statusBarEmptyMessage ?? "No more results"}
                    </div>
                  </div>
                </Show>
              </TableCell>
            </TableRow>
          </TableFooter>
        </TableRoot>
      </div>
      <Show when={props.showStatusBar ?? false}>
        <TableStatusBar totalCount={totalCount()} totalLabel={props.statusBarLabel} />
      </Show>
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
 * Native table primitives and a controller-backed data table without TanStack dependencies.
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
  Table,
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
