import type { ComponentProps, JSX } from "@solidjs/web";
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@xgx/ui";
import { Settings } from "@xgx/ui/icons";
import {
  createEffect,
  createMemo,
  createSignal,
  createStore,
  For,
  Loading,
  Show,
  snapshot,
} from "solid-js";
import type { UseTableInfiniteReturn } from "./use-table-infinite";

type VisibilityState = Record<string, boolean>;

const COLUMN_VISIBILITY_STORAGE_KEY_PREFIX = "table-column-visibility:";
const DEFAULT_SKELETON_ROW_COUNT = 10;
const TABLE_LOADING_BAR_STYLES = `
.xgx-table-loading-bar {
  position: relative;
  z-index: 20;
  height: 0;
  overflow: visible;
}

.xgx-table-loading-bar__track {
  position: relative;
  width: 100%;
  height: 2px;
  overflow: hidden;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
}

.xgx-table-loading-bar__segment {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 33.333%;
  border-radius: 9999px;
  background: var(--primary);
}

@keyframes xgx-table-loading-bar-slide {
  0% {
    transform: translateX(-110%) scaleX(0.35);
  }
  45% {
    transform: translateX(80%) scaleX(0.75);
  }
  100% {
    transform: translateX(300%) scaleX(0.35);
  }
}

.xgx-table-loading-bar__segment {
  animation: xgx-table-loading-bar-slide 1.1s cubic-bezier(0.65, 0, 0.35, 1)
    infinite;
  transform-origin: left center;
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .xgx-table-loading-bar__segment {
    animation: none;
    transform: translateX(0) scaleX(1);
  }
}
`;

type PendingQuerySource = {
  query?: {
    readonly pending?: () => boolean;
  };
};

const Table = (props: ComponentProps<"table">) => (
  <table {...props} class={cn("w-full caption-bottom !bg-none", props.class)} />
);

interface ColumnVisibilitySettingsProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  columnVisibility: VisibilityState;
  setColumnVisibility: (columnId: string, visible: boolean) => void;
  getColumnDisplayName: (column: ColumnDef<TData, unknown>) => string;
}

const ColumnVisibilitySettings = <TData,>(props: ColumnVisibilitySettingsProps<TData>) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const toggleableColumns = () =>
    props.columns.filter((column, index) => {
      const columnId = getColumnId(column, index);
      return columnId !== "select" && columnId !== "settings";
    });

  return (
    <div class="flex items-center justify-center h-full">
      <DropdownMenu open={isOpen()} onOpenChange={(open) => setIsOpen(open)}>
        <DropdownMenuTrigger class="flex items-center justify-center rounded p-1 text-muted-foreground transition-colors hover:bg-hover hover:text-hover-foreground">
          <Settings class="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-48">
          <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
          <For each={toggleableColumns()}>
            {(column, index) => {
              const columnId = () => getColumnId(column, index());
              const isVisible = () => props.columnVisibility[columnId()] !== false;

              return (
                <DropdownMenuCheckboxItem
                  checked={isVisible()}
                  closeOnSelect={false}
                  onChange={() => {
                    props.setColumnVisibility(columnId(), !isVisible());
                  }}
                >
                  {props.getColumnDisplayName(column)}
                </DropdownMenuCheckboxItem>
              );
            }}
          </For>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export interface TableInfiniteProps<TData> {
  table: UseTableInfiniteReturn<TData, any, any> | TableController<TData>;
  columns: ColumnDef<TData, unknown>[];
  getRowId?: (row: TData) => string;
  enableRowSelection?: boolean;
  enableSorting?: boolean;
  enableColumnVisibility?: boolean;
  onRowClick?: (row: TData) => void;
  onRowHover?: (row: TData) => void;
  class?: string;
  showStatusBar?: boolean;
  statusBarLabel?: string;
  statusBarEmptyMessage?: string;
  statusBarEndMessage?: string;
  tableId?: string;
  statusBarSlot?: JSX.Element;
  skeletonRowCount?: number;
}

export interface TableInfiniteSkeletonRowsProps {
  columnCount?: number;
  rowCount?: number;
}

export const TableInfiniteSkeletonRows = (props: TableInfiniteSkeletonRowsProps) => {
  const rowCount = () => props.rowCount ?? DEFAULT_SKELETON_ROW_COUNT;
  const columnCount = () => Math.max(1, props.columnCount ?? 1);
  const rowIndexes = () => Array.from({ length: rowCount() }, (_, index) => index);
  const columnIndexes = () => Array.from({ length: columnCount() }, (_, index) => index);

  return (
    <For each={rowIndexes()}>
      {(rowIndex) => (
        <TableRow class="cursor-default hover:bg-transparent">
          <For each={columnIndexes()}>
            {(columnIndex) => (
              <TableCell class="py-4">
                <div
                  aria-hidden="true"
                  class={cn(
                    "h-4 animate-pulse rounded bg-muted",
                    columnIndex === 0
                      ? "w-44 max-w-full"
                      : columnIndex % 3 === 0
                        ? "w-24 max-w-full"
                        : "w-32 max-w-full",
                    rowIndex % 2 === 0 && "opacity-70",
                  )}
                />
              </TableCell>
            )}
          </For>
        </TableRow>
      )}
    </For>
  );
};

const TableLoadingBar = () => (
  <div role="progressbar" aria-label="Loading table rows" class="xgx-table-loading-bar">
    <style>{TABLE_LOADING_BAR_STYLES}</style>
    <div class="xgx-table-loading-bar__track">
      <div class="xgx-table-loading-bar__segment" />
    </div>
  </div>
);

function getStoredColumnVisibility(tableId: string): VisibilityState | null {
  try {
    const stored = localStorage.getItem(`${COLUMN_VISIBILITY_STORAGE_KEY_PREFIX}${tableId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveColumnVisibility(tableId: string, visibility: VisibilityState): void {
  try {
    localStorage.setItem(
      `${COLUMN_VISIBILITY_STORAGE_KEY_PREFIX}${tableId}`,
      JSON.stringify(visibility),
    );
  } catch {
    // Ignore storage errors.
  }
}

function getColumnId<TData>(column: ColumnDef<TData, unknown>, index: number): string {
  return column.id ?? column.accessorKey ?? `column-${index}`;
}

function getColumnDisplayName<TData>(column: ColumnDef<TData, unknown>, index: number): string {
  if (column.meta?.displayName) return column.meta.displayName;

  if (typeof column.header === "string") return column.header;

  const key = getColumnId(column, index);
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase())
    .trim();
}

function getColumnValue<TData, TValue>(
  row: TData,
  rowIndex: number,
  column: ColumnDef<TData, TValue>,
): TValue {
  if (column.accessorFn) return column.accessorFn(row, rowIndex);
  if (column.accessorKey) {
    return (row as Record<string, TValue>)[column.accessorKey];
  }
  return undefined as TValue;
}

function compareValues(left: unknown, right: unknown): number {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
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
  if (typeof header === "function") {
    return header({ column } satisfies HeaderContext<TData, TValue>);
  }
  return header ?? fallback;
}

function renderCell<TData, TValue>(context: CellContext<TData, TValue>): JSX.Element {
  const cell = context.column.columnDef.cell;
  if (typeof cell === "function") return cell(context);
  return cell ?? String(context.getValue() ?? "");
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

function getLatestTableData<TData>(
  table: UseTableInfiniteReturn<TData, any, any> | TableController<TData>,
): TData[] {
  return table.latestData?.() ?? [];
}

function getQueryIsPending(table: object): boolean {
  return (table as PendingQuerySource).query?.pending?.() ?? false;
}

export const TableInfinite = <TData,>(props: TableInfiniteProps<TData>) => {
  const [sorting, setSorting] = createSignal<
    { columnId: string; direction: Exclude<SortDirection, false> } | undefined
  >();
  const [columnVisibility, setColumnVisibility] = createStore<VisibilityState>({});
  const [loadedVisibilityTableId, setLoadedVisibilityTableId] = createSignal<string>();

  const tableId = () => props.tableId ?? props.table.tableId ?? "table";
  const enableRowSelection = () => props.enableRowSelection ?? false;
  const enableSorting = () => props.enableSorting ?? false;
  const enableColumnVisibility = () => props.enableColumnVisibility ?? false;
  const sourceColumns = () => props.columns ?? [];
  const rowId = (row: TData, index: number) =>
    props.getRowId?.(row) ?? (row as { id?: string }).id ?? String(index);

  const loader = createIntersectionLoader({
    canLoad: () =>
      props.table.hasMore() && !props.table.isFetchingMore() && !props.table.isLoading(),
    load: () => props.table.loadMore(),
    loadDelay: 80,
    rootMargin: "0px 0px 240px 0px",
  });

  const getDisplayName = (column: ColumnDef<TData, unknown>) =>
    getColumnDisplayName(column, sourceColumns().indexOf(column));

  const setColumnVisible = (columnId: string, visible: boolean) => {
    setColumnVisibility((state) => {
      state[columnId] = visible;
    });
  };

  const allColumns = createMemo<ColumnDef<TData, unknown>[]>(() => {
    const columns: ColumnDef<TData, unknown>[] = [];

    if (enableRowSelection()) {
      columns.push({
        id: "select",
        size: 40,
        enableSorting: false,
        header: () => {
          const currentData = getLatestTableData(props.table);
          const allSelected =
            currentData.length > 0 && currentData.every((row) => props.table.isRowSelected(row));
          const someSelected = currentData.some((row) => props.table.isRowSelected(row));

          return (
            <div class="flex items-center justify-center h-full">
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
          <div class="flex items-center justify-center h-full">
            <Checkbox
              checked={props.table.isRowSelected(context.row.original)}
              onChange={(value) => props.table.toggleRowSelection(context.row.original, value)}
              aria-label="Select row"
              size="md"
            />
          </div>
        ),
      });
    }

    columns.push(...sourceColumns());

    if (enableColumnVisibility()) {
      columns.push({
        id: "settings",
        size: 40,
        enableSorting: false,
        header: () => (
          <ColumnVisibilitySettings
            columns={sourceColumns()}
            columnVisibility={columnVisibility}
            setColumnVisibility={setColumnVisible}
            getColumnDisplayName={getDisplayName}
          />
        ),
        cell: () => null,
      });
    }

    return columns;
  });

  const tableColumns = createMemo<TableColumn<TData, unknown>[]>(() =>
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
            if (current?.columnId !== id) {
              return { columnId: id, direction: "asc" };
            }
            if (current.direction === "asc") {
              return { columnId: id, direction: "desc" };
            }
            return undefined;
          });
        },
      };
      return column;
    }),
  );

  const visibleColumns = createMemo(() =>
    tableColumns().filter(
      (column) =>
        column.id === "select" || column.id === "settings" || columnVisibility[column.id] !== false,
    ),
  );

  const rows = createMemo<TableRowContext<TData>[]>(() => {
    const sort = sorting();
    const sourceData = props.table.data();
    const data = sourceData.map((row, index) => ({
      id: rowId(row, index),
      index,
      original: row,
      getIsSelected: () => props.table.isRowSelected(row),
    }));

    if (!sort) return data;

    const column = tableColumns().find((item) => item.id === sort.columnId);
    if (!column) return data;

    return [...data].sort((left, right) => {
      const result = compareValues(
        getColumnValue(left.original, left.index, column.columnDef),
        getColumnValue(right.original, right.index, column.columnDef),
      );
      return sort.direction === "asc" ? result : -result;
    });
  });

  const totalCount = () => props.table.totalCount?.() ?? getLatestTableData(props.table).length;
  const selectedCount = () =>
    enableRowSelection()
      ? getLatestTableData(props.table).filter((row) => props.table.isRowSelected(row)).length
      : 0;
  const showEndOfResults = () =>
    !props.table.hasMore() &&
    getLatestTableData(props.table).length > 0 &&
    !props.table.isLoading();
  const showLoadingBar = () =>
    props.table.isLoading() || props.table.isFetchingMore() || getQueryIsPending(props.table);

  createEffect(
    () =>
      enableColumnVisibility()
        ? {
            id: tableId(),
            loadedId: loadedVisibilityTableId(),
          }
        : undefined,
    (state) => {
      if (!state || state.id === state.loadedId) return;
      const stored = getStoredColumnVisibility(state.id);
      setColumnVisibility((visibility) => {
        for (const key of Object.keys(visibility)) {
          delete visibility[key];
        }
        Object.assign(visibility, stored ?? {});
      });
      setLoadedVisibilityTableId(state.id);
    },
  );

  createEffect(
    () =>
      enableColumnVisibility()
        ? {
            id: tableId(),
            visibility: snapshot(columnVisibility) as VisibilityState,
          }
        : undefined,
    (state) => {
      if (state) saveColumnVisibility(state.id, state.visibility);
    },
  );

  return (
    <div class={cn("w-full flex-1 min-h-0 flex flex-col", props.class)}>
      <div class="flex-1 min-h-0 overflow-auto">
        <Table>
          <TableHeader
            class="bg-card"
            style={{
              position: "sticky",
              top: "0",
              "z-index": "10",
            }}
          >
            <TableRow class="cursor-default hover:bg-transparent">
              <For each={visibleColumns()}>
                {(column) => (
                  <TableHead
                    class={cn(
                      "whitespace-nowrap",
                      column.getCanSort() && "cursor-pointer select-none",
                    )}
                    onClick={column.getToggleSortingHandler()}
                    style={getColumnStyles(column, visibleColumns())}
                  >
                    {renderHeader(column, getDisplayName(column.columnDef))}
                    <Show when={column.getIsSorted()}>
                      {(sorted) => (
                        <span class="ml-2 text-xs">{sorted() === "asc" ? "↑" : "↓"}</span>
                      )}
                    </Show>
                  </TableHead>
                )}
              </For>
            </TableRow>
            <Show when={showLoadingBar()}>
              <TableRow class="border-none cursor-default hover:bg-transparent">
                <th
                  colspan={Math.max(visibleColumns().length, 1)}
                  class="h-0 border-0 p-0 leading-none"
                  style={{ height: "0", padding: "0" }}
                >
                  <TableLoadingBar />
                </th>
              </TableRow>
            </Show>
          </TableHeader>
          <TableBody>
            <Loading
              fallback={
                <TableInfiniteSkeletonRows
                  columnCount={visibleColumns().length}
                  rowCount={props.skeletonRowCount}
                />
              }
            >
              <Show
                when={rows().length > 0}
                fallback={
                  <TableRow class="border-none bg-none cursor-default hover:bg-transparent">
                    <TableCell
                      colspan={Math.max(visibleColumns().length, 1)}
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
                      onMouseEnter={
                        props.onRowHover ? () => props.onRowHover?.(row.original) : undefined
                      }
                    >
                      <For each={visibleColumns()}>
                        {(column) => {
                          const context: CellContext<TData, unknown> = {
                            row,
                            column,
                            getValue: () =>
                              getColumnValue(row.original, row.index, column.columnDef),
                          };

                          return (
                            <TableCell
                              class="whitespace-nowrap"
                              style={getColumnStyles(column, visibleColumns())}
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
            <TableRow class="border-none cursor-default hover:bg-transparent">
              <TableCell colspan={Math.max(visibleColumns().length, 1)} class="text-center">
                <Show when={props.table.hasMore() && !props.table.isLoading()}>
                  <div ref={loader.ref} class="flex justify-center py-4">
                    <div class="text-xs text-muted-foreground">Loading more...</div>
                  </div>
                </Show>
                <Show when={showEndOfResults()}>
                  <div class="flex justify-center py-4">
                    <div class="text-xs text-muted-foreground/70">
                      {props.statusBarEndMessage ?? "End of results"}
                    </div>
                  </div>
                </Show>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <Show when={props.showStatusBar ?? false}>
        <div class="flex items-center justify-between border-t border-border-subtle px-4 py-3 text-xs text-muted-foreground">
          <div>
            <span>
              {props.statusBarLabel ?? "Total results"}: {totalCount()}
            </span>
            <Show when={enableRowSelection()}>
              <span class="ml-1 text-muted-foreground/70">( Selected: {selectedCount()} )</span>
            </Show>
          </div>
          <Show when={props.statusBarSlot}>
            <div>{props.statusBarSlot}</div>
          </Show>
        </div>
      </Show>
    </div>
  );
};
