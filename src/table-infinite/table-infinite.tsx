import { createVisibilityObserver } from "@solid-primitives/intersection-observer";
import {
  type Column,
  type ColumnDef,
  type ColumnOrderState,
  type ColumnPinningState,
  createSolidTable,
  getCoreRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/solid-table";
import {
  Checkbox,
  cn,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  TableRoot as Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@xgx/ui";
import { Settings } from "lucide-solid";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Index,
  type JSX,
  mergeProps,
  Show,
  Suspense,
} from "solid-js";
import { createStore } from "solid-js/store";
import { Dynamic } from "solid-js/web";
import type { UseTableInfiniteReturn } from "./use-table-infinite";

// Separate component for column visibility settings to maintain dropdown state across re-renders
interface ColumnVisibilitySettingsProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  columnVisibility: VisibilityState;
  setColumnVisibility: (colId: string, visible: boolean) => void;
  getColumnDisplayName: (col: ColumnDef<TData, unknown>) => string;
}

const ColumnVisibilitySettings = <TData,>(
  props: ColumnVisibilitySettingsProps<TData>,
) => {
  const [isOpen, setIsOpen] = createSignal(false);

  const toggleableColumns = () =>
    props.columns.filter((col) => {
      const colRef = col as { id?: string; accessorKey?: string };
      const colId = colRef.id ?? colRef.accessorKey;
      return colId && colId !== "select" && colId !== "settings";
    });

  return (
    <div class="flex items-center justify-center h-full">
      <DropdownMenu open={isOpen()} onOpenChange={(open) => setIsOpen(open)}>
        <DropdownMenuTrigger class="flex items-center justify-center p-1 rounded hover:bg-gray-100 transition-colors">
          <Settings class="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-48">
          <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
          <For each={toggleableColumns()}>
            {(col) => {
              const colRef = col as {
                id?: string;
                accessorKey?: string;
              };
              const colId = colRef.id ?? colRef.accessorKey ?? "";
              const isVisible = () => props.columnVisibility[colId] !== false;

              return (
                <DropdownMenuCheckboxItem
                  checked={isVisible()}
                  closeOnSelect={false}
                  onChange={() => {
                    props.setColumnVisibility(colId, !isVisible());
                  }}
                >
                  {props.getColumnDisplayName(col)}
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
  table: UseTableInfiniteReturn<TData>;
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
  /**
   * Message shown when all results have been loaded (end of infinite scroll).
   * Defaults to "All results loaded"
   */
  statusBarEndMessage?: string;
  /**
   * Unique identifier for the table, used for persisting state like column visibility.
   * Defaults to the tableId from the useTableInfinite hook if not specified.
   */
  tableId?: string;
  /**
   * Optional slot for custom content in the bottom right of the status bar.
   * Useful for bulk action buttons (e.g., export, delete selected).
   */
  statusBarSlot?: JSX.Element;
}

// Helper function to get pinning and visibility styles for columns
const getColumnStyles = <TData,>(
  column: Column<TData, unknown>,
  columnVisibility: VisibilityState,
): JSX.CSSProperties => {
  const isPinned = column.getIsPinned();
  // Use our own visibility store instead of column.getIsVisible() to avoid TanStack Table reactivity
  const isVisible = columnVisibility[column.id] !== false;

  const columnSize = column.getSize();
  const isDefaultSize = columnSize === 150;
  const widthValue = isDefaultSize ? "auto" : `${columnSize}px`;

  return {
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    position: isPinned ? "sticky" : "relative",
    width: widthValue,
    "min-width": isDefaultSize ? undefined : widthValue,
    "max-width": isDefaultSize ? undefined : widthValue,
    "z-index": isPinned ? 1 : 0,
    background: "transparent",
    // CSS-based column visibility to avoid array re-renders
    display: isVisible ? undefined : "none",
  };
};

const COLUMN_VISIBILITY_STORAGE_KEY_PREFIX = "table-column-visibility:";

const getStoredColumnVisibility = (tableId: string): VisibilityState | null => {
  try {
    const stored = localStorage.getItem(
      `${COLUMN_VISIBILITY_STORAGE_KEY_PREFIX}${tableId}`,
    );
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveColumnVisibility = (
  tableId: string,
  visibility: VisibilityState,
): void => {
  try {
    localStorage.setItem(
      `${COLUMN_VISIBILITY_STORAGE_KEY_PREFIX}${tableId}`,
      JSON.stringify(visibility),
    );
  } catch {
    // Ignore storage errors
  }
};

export const TableInfinite = <TData,>(rawProps: TableInfiniteProps<TData>) => {
  const props = mergeProps(
    { columns: [] as ColumnDef<TData, unknown>[] },
    rawProps,
  );

  // Derive tableId from prop or from the hook's tableId
  const tableId = () => props.tableId ?? props.table.tableId;

  // Initialize column visibility from localStorage
  const initialVisibility = () =>
    props.enableColumnVisibility ? getStoredColumnVisibility(tableId()) : null;

  const [rowSelection, setRowSelection] = createSignal<RowSelectionState>({});
  const [sorting, setSorting] = createSignal<SortingState>([]);
  const [columnOrder, setColumnOrder] = createSignal<ColumnOrderState>([]);
  const [columnVisibility, setColumnVisibility] = createStore<VisibilityState>(
    initialVisibility() ?? {},
  );

  // Persist column visibility to localStorage when it changes
  createEffect(() => {
    if (props.enableColumnVisibility) {
      saveColumnVisibility(tableId(), columnVisibility);
    }
  });

  createEffect(() => {
    setColumnOrder(
      tableColumns().map((col) => {
        const columnRef = col as { id?: string; accessorKey?: string };
        return columnRef.id ?? columnRef.accessorKey ?? "";
      }),
    );
  });

  // Get column display name from column definition
  const getColumnDisplayName = (col: ColumnDef<TData, unknown>): string => {
    const columnRef = col as {
      id?: string;
      accessorKey?: string;
      meta?: { displayName?: string };
    };
    if (columnRef.meta?.displayName) return columnRef.meta.displayName;
    const key = columnRef.id ?? columnRef.accessorKey ?? "";
    // Convert camelCase to Title Case
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Initialize column pinning from meta
  const [columnPinning, setColumnPinning] = createSignal<ColumnPinningState>({
    left: props.enableRowSelection ? ["select"] : [],
    right: [
      ...props.columns
        .filter(
          (col) =>
            (col.meta as { pinned?: string } | undefined)?.pinned === "right",
        )
        .map((col) => {
          const columnRef = col as {
            id?: string;
            accessorKey?: string;
          };
          return columnRef.id ?? columnRef.accessorKey ?? "";
        }),
      ...(props.enableColumnVisibility ? ["settings"] : []),
    ],
  });

  // Intersection observer for infinite scroll
  let sentinelRef: HTMLDivElement | undefined;
  const useVisibilityObserver = createVisibilityObserver({ threshold: 0.1 });
  const isVisible = useVisibilityObserver(() => sentinelRef);

  // Load more when sentinel becomes visible
  createEffect(() => {
    if (
      isVisible() &&
      props.table.hasMore() &&
      !props.table.isFetchingMore() &&
      !props.table.query.isLoading
    ) {
      props.table.loadMore();
    }
  });

  const shouldShowStatusBar = () => props.showStatusBar ?? false;
  const totalCount = () =>
    props.table.totalCount?.() ?? props.table.data().length;
  const selectedCount = () =>
    props.enableRowSelection
      ? props.table.data().filter((row) => props.table.isRowSelected(row))
          .length
      : 0;
  const showEndOfResults = () =>
    !props.table.hasMore() &&
    props.table.data().length > 0 &&
    !props.table.query.isLoading;

  const tableColumns = createMemo(() => {
    const columns: ColumnDef<TData, unknown>[] = [];

    // Add selection column if enabled
    if (props.enableRowSelection) {
      const selectionColumn: ColumnDef<TData, unknown> = {
        id: "select",
        header: () => {
          const currentData = props.table.data();
          const allSelected =
            currentData.length > 0 &&
            currentData.every((worker) => props.table.isRowSelected(worker));
          const someSelected = currentData.some((worker) =>
            props.table.isRowSelected(worker),
          );

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
        cell: (info) => (
          <div class="flex items-center justify-center h-full">
            <Checkbox
              checked={props.table.isRowSelected(info.row.original)}
              onChange={(value) =>
                props.table.toggleRowSelection(info.row.original, value)
              }
              aria-label="Select row"
              size="md"
            />
          </div>
        ),
        size: 40,
        enableSorting: false,
      };
      columns.push(selectionColumn);
    }

    // Add user columns
    columns.push(...props.columns);

    // Add settings column if column visibility is enabled
    if (props.enableColumnVisibility) {
      const settingsColumn: ColumnDef<TData, unknown> = {
        id: "settings",
        header: () => (
          <ColumnVisibilitySettings
            columns={props.columns}
            columnVisibility={columnVisibility}
            setColumnVisibility={setColumnVisibility}
            getColumnDisplayName={getColumnDisplayName}
          />
        ),
        cell: () => null,
        size: 40,
        enableSorting: false,
      };
      columns.push(settingsColumn);
    }

    return columns;
  });

  const solidTable = createSolidTable({
    get data() {
      return props.table.data();
    },
    get columns() {
      return tableColumns();
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: props.enableSorting ? getSortedRowModel() : undefined,
    state: {
      get columnOrder() {
        return columnOrder();
      },
      get rowSelection() {
        return rowSelection();
      },
      get sorting() {
        return sorting();
      },
      get columnPinning() {
        return columnPinning();
      },
    },
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: props.enableRowSelection
      ? setRowSelection
      : undefined,
    onSortingChange: props.enableSorting ? setSorting : undefined,
    onColumnPinningChange: setColumnPinning,
    getRowId: props.getRowId,
    enableRowSelection: props.enableRowSelection ?? false,
    enableColumnPinning: true,
  });

  return (
    <div class={cn("w-full flex-1 min-h-0 flex flex-col", props.class)}>
      <div class="flex-1 min-h-0 overflow-auto">
        <Table>
          <TableHeader
            class=""
            style={{
              position: "sticky",
              top: "0",
              "z-index": "10",
            }}
          >
            <Index each={solidTable.getHeaderGroups()}>
              {(headerGroup) => (
                <TableRow class="cursor-default hover:bg-transparent">
                  <Index each={headerGroup().headers}>
                    {(header) => (
                      <TableHead
                        class={cn(
                          "whitespace-nowrap",
                          header().column.getCanSort() &&
                            "cursor-pointer select-none",
                        )}
                        onClick={header().column.getToggleSortingHandler()}
                        style={getColumnStyles(
                          header().column,
                          columnVisibility,
                        )}
                      >
                        <Dynamic
                          component={header().column.columnDef.header}
                          {...header().getContext()}
                        />
                        {/* <Show when={header().column.getIsSorted()}>
														{(sorted) => (
															<span class="ml-2">
																{sorted() === "asc" ? "↑" : "↓"}
															</span>
														)}
													</Show> */}
                      </TableHead>
                    )}
                  </Index>
                </TableRow>
              )}
            </Index>
          </TableHeader>
          <TableBody>
            <Suspense fallback={<div>Loading...</div>}>
              <Show
                when={solidTable.getRowModel().rows.length > 0}
                fallback={
                  <TableRow class="border-none bg-none cursor-default hover:bg-transparent">
                    <TableCell
                      colSpan={props.columns.length}
                      class="h-24 text-center text-xs text-gray-400"
                    >
                      {props.table.query.isLoading
                        ? "Loading..."
                        : "No results."}
                    </TableCell>
                  </TableRow>
                }
              >
                <Index each={solidTable.getRowModel().rows}>
                  {(row) => (
                    <TableRow
                      data-state={
                        row().getIsSelected() ? "selected" : undefined
                      }
                      onClick={() => props.onRowClick?.(row().original)}
                      onMouseEnter={
                        props.onRowHover
                          ? () => props.onRowHover?.(row().original)
                          : undefined
                      }
                      class={props.onRowClick ? "cursor-pointer" : undefined}
                    >
                      <For each={row().getAllCells()}>
                        {(cell) => (
                          <TableCell
                            class="whitespace-nowrap"
                            style={getColumnStyles(
                              cell.column,
                              columnVisibility,
                            )}
                          >
                            <Dynamic
                              component={cell.column.columnDef.cell}
                              {...cell.getContext()}
                            />
                          </TableCell>
                        )}
                      </For>
                    </TableRow>
                  )}
                </Index>
              </Show>
            </Suspense>
          </TableBody>
          <TableFooter class="bg-white/0">
            <TableRow class="border-none cursor-default hover:bg-transparent">
              <TableCell colSpan={props.columns.length} class="text-center">
                <div
                  ref={sentinelRef}
                  class="flex justify-center py-4"
                  hidden={!props.table.hasMore() || props.table.query.isLoading}
                >
                  <div class="text-xs text-gray-400">Loading more...</div>
                </div>
                <Show when={showEndOfResults()}>
                  <div class="flex justify-center py-4">
                    <div class="text-xs text-gray-300">
                      {props.statusBarEndMessage ?? "End of results"}
                    </div>
                  </div>
                </Show>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <Show when={shouldShowStatusBar()}>
        <div class="py-2 text-xs text-gray-600 border-t border-gray-200/50 flex items-center justify-between">
          <div>
            <span>
              {props.statusBarLabel ?? "Total results"}: {totalCount()}
            </span>
            <Show when={props.enableRowSelection}>
              <span class="ml-1 text-black/50">
                ( Selected: {selectedCount()} )
              </span>
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
