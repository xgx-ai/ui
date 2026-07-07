import type { JSX } from "@solidjs/web";
import { createIntersectionLoader } from "@xgx/query";
import type {
  CellContext,
  ColumnDef,
  HeaderContext,
  SortDirection,
  TableColumn,
  TableController,
  TableRowContext,
} from "@xgx/ui";
import {
  Checkbox,
  cn,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
  TableStatusBar,
} from "@xgx/ui";
import { createMemo, createSignal, For, Loading, Show } from "solid-js";
import type { UseTableReturn } from "./use-table.ts";

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
    background: pinning ? "var(--xgx-table-row-background, var(--card))" : "transparent",
    "box-shadow":
      pinning === "right"
        ? "-1px 0 0 var(--border-subtle)"
        : pinning === "left"
          ? "1px 0 0 var(--border-subtle)"
          : undefined,
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
  const latestData = () => props.table.latestData?.() ?? [];

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
          const data = latestData();
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

  const totalCount = () => props.table.totalCount?.() ?? latestData().length;
  const showEndOfResults = () =>
    !props.table.hasMore() && latestData().length > 0 && !props.table.isLoading();

  return (
    <div class={cn("flex min-h-0 w-full flex-1 flex-col", props.class)}>
      <div class="min-h-0 flex-1 overflow-auto">
        <TableRoot>
          <TableHeader class="bg-card" style={{ position: "sticky", top: "0", "z-index": "10" }}>
            <TableRow class="cursor-default hover:bg-transparent">
              <For each={columns()}>
                {(column) => (
                  <TableHead
                    data-table-pinned={column.columnDef.meta?.pinned || undefined}
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
            <Loading
              fallback={
                <TableRow class="border-none bg-transparent hover:bg-transparent">
                  <TableCell
                    colspan={Math.max(columns().length, 1)}
                    class="h-24 text-center text-xs text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              }
            >
              <Show
                when={rows().length > 0}
                fallback={
                  <TableRow class="border-none bg-transparent hover:bg-transparent">
                    <TableCell
                      colspan={Math.max(columns().length, 1)}
                      class="h-24 text-center text-xs text-muted-foreground"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                }
              >
                <For each={rows()}>
                  {(row) => (
                    <TableRow
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      interactive={Boolean(props.onRowClick)}
                      onClick={() => props.onRowClick?.(row.original)}
                    >
                      <For each={columns()}>
                        {(column) => {
                          const context: CellContext<TData, unknown> = {
                            row,
                            column,
                            getValue: () =>
                              getColumnValue(row.original, row.index, column.columnDef),
                          };

                          return (
                            <TableCell
                              data-table-pinned={column.columnDef.meta?.pinned || undefined}
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
            </Loading>
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

/**
 * Query-backed data table prefab.
 *
 * Compose this with `useTable` for paginated data, infinite loading, sorting,
 * and row selection.
 */
export { Table };
