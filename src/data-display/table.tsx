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
} from "@tanstack/solid-table";
import {
  type Component,
  type ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  Index,
  type JSX,
  mergeProps,
  Show,
  splitProps,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "../cn.ts";
import { Checkbox } from "../forms/checkbox.tsx";
import type { UseTableReturn } from "./use-table.ts";

// ============================================================================
// Table Primitives (internal)
// ============================================================================

const TableRoot: Component<ComponentProps<"table">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div class="relative w-full h-full">
      <table
        class={cn("w-full caption-bottom !bg-none", local.class)}
        {...others}
      />
    </div>
  );
};

const TableHeader: Component<ComponentProps<"thead">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return <thead class={cn("[&_tr]:border-b", local.class)} {...others} />;
};

const TableBody: Component<ComponentProps<"tbody">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <tbody class={cn("[&_tr:last-child]:border-0", local.class)} {...others} />
  );
};

const TableFooter: Component<ComponentProps<"tfoot">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <tfoot
      class={cn("bg-primary font-medium text-primary-foreground", local.class)}
      {...others}
    />
  );
};

const TableRow: Component<ComponentProps<"tr">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <tr
      class={cn(
        "border-b border-gray-200 transition-colors hover:bg-gray-100/50 group",
        local.class,
      )}
      {...others}
    />
  );
};

const TableHead: Component<ComponentProps<"th">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <th
      class={cn(
        "h-10 px-4 text-left align-middle font-medium text-xs text-muted-foreground uppercase tracking-wider [&:has([role=checkbox])]:pr-0",
        local.class,
      )}
      {...others}
    />
  );
};

const TableCell: Component<ComponentProps<"td">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <td
      class={cn(
        "px-4 py-2.5 align-middle text-foreground [&:has([role=checkbox])]:pr-0",
        local.class,
      )}
      {...others}
    />
  );
};

type TableStatusBarProps = ComponentProps<"div"> & {
  totalCount?: number;
  totalLabel?: string;
  emptyMessage?: string;
};

const TableStatusBar: Component<TableStatusBarProps> = (props) => {
  const [local, others] = splitProps(props, [
    "class",
    "totalCount",
    "totalLabel",
    "emptyMessage",
  ]);
  return (
    <div
      class={cn(
        "flex flex-col items-center gap-2 px-4 py-3 text-xs text-muted-foreground",
        local.class,
      )}
      {...others}
    >
      {local.emptyMessage ? (
        <span class="text-muted-foreground italic">{local.emptyMessage}</span>
      ) : null}
      <div class="w-full border-t border-border pt-2 flex items-center">
        <span>
          {local.totalLabel ?? "Total"}: {local.totalCount ?? 0}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// Table Component
// ============================================================================

interface TableProps<TData> {
  /** Table state from useTable hook */
  table: UseTableReturn<TData>;
  /** Column definitions for TanStack Table */
  columns: ColumnDef<TData, unknown>[];
  /** Function to get unique row ID */
  getRowId?: (row: TData) => string;
  /** Enable row selection with checkboxes */
  enableRowSelection?: boolean;
  /** Enable column sorting */
  enableSorting?: boolean;
  /** Callback when a row is clicked */
  onRowClick?: (row: TData) => void;
  /** Additional CSS classes */
  class?: string;
  /** Show status bar with total count */
  showStatusBar?: boolean;
  /** Label for status bar (e.g., "projects") */
  statusBarLabel?: string;
  /** Message when no more results */
  statusBarEmptyMessage?: string;
}

// Helper function to get pinning styles for columns
const getCommonPinningStyles = <TData,>(
  column: Column<TData, unknown>,
): JSX.CSSProperties => {
  const isPinned = column.getIsPinned();
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
  };
};

const Table = <TData,>(rawProps: TableProps<TData>) => {
  const props = mergeProps(
    { columns: [] as ColumnDef<TData, unknown>[] },
    rawProps,
  );

  const [rowSelection, setRowSelection] = createSignal<RowSelectionState>({});
  const [sorting, setSorting] = createSignal<SortingState>([]);
  const [columnOrder, setColumnOrder] = createSignal<ColumnOrderState>([]);

  createEffect(() => {
    setColumnOrder(
      tableColumns().map((col) => {
        const columnRef = col as { id?: string; accessorKey?: string };
        return columnRef.id ?? columnRef.accessorKey ?? "";
      }),
    );
  });

  // Initialize column pinning from meta
  const [columnPinning, setColumnPinning] = createSignal<ColumnPinningState>({
    left: props.enableRowSelection ? ["select"] : [],
    right: props.columns
      .filter(
        (col) =>
          (col.meta as { pinned?: string } | undefined)?.pinned === "right",
      )
      .map((col) => {
        const columnRef = col as { id?: string; accessorKey?: string };
        return columnRef.id ?? columnRef.accessorKey ?? "";
      }),
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
  const showEndOfResults = () =>
    !props.table.hasMore() &&
    props.table.data().length > 0 &&
    !props.table.query.isLoading;

  const tableColumns = createMemo(() => {
    if (!props.enableRowSelection) {
      return props.columns;
    }

    const selectionColumn: ColumnDef<TData, unknown> = {
      id: "select",
      header: () => {
        const currentData = props.table.data();
        const allSelected =
          currentData.length > 0 &&
          currentData.every((row) => props.table.isRowSelected(row));
        const someSelected = currentData.some((row) =>
          props.table.isRowSelected(row),
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

    return [selectionColumn, ...props.columns];
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
        <TableRoot>
          <TableHeader
            style={{
              position: "sticky",
              top: "0",
              "z-index": "10",
            }}
          >
            <Index each={solidTable.getHeaderGroups()}>
              {(headerGroup) => (
                <TableRow class="border-b border-border cursor-default hover:bg-transparent">
                  <Index each={headerGroup().headers}>
                    {(header) => (
                      <TableHead
                        class={cn(
                          header().column.getCanSort() &&
                            "cursor-pointer select-none",
                        )}
                        onClick={header().column.getToggleSortingHandler()}
                        style={getCommonPinningStyles(header().column)}
                      >
                        <Dynamic
                          component={header().column.columnDef.header}
                          {...header().getContext()}
                        />
                        <Show when={header().column.getIsSorted()}>
                          {(sorted) => (
                            <span class="ml-2">
                              {sorted() === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </Show>
                      </TableHead>
                    )}
                  </Index>
                </TableRow>
              )}
            </Index>
          </TableHeader>
          <TableBody>
            <Show
              when={solidTable.getRowModel().rows.length > 0}
              fallback={
                <TableRow class="border-none bg-none cursor-default hover:bg-transparent">
                  <TableCell
                    colSpan={props.columns.length}
                    class="h-24 text-center text-xs text-muted-foreground"
                  >
                    {props.table.query.isLoading ? "Loading..." : "No results."}
                  </TableCell>
                </TableRow>
              }
            >
              <Index each={solidTable.getRowModel().rows}>
                {(row) => (
                  <TableRow
                    data-state={row().getIsSelected() ? "selected" : undefined}
                    onClick={() => props.onRowClick?.(row().original)}
                    class={
                      props.onRowClick
                        ? "cursor-pointer hover:bg-gray-100/50"
                        : undefined
                    }
                    style={{
                      "mask-image":
                        "linear-gradient(to right, transparent 0px, black 50px, black calc(100% - 50px), transparent 100%)",
                      "-webkit-mask-image":
                        "linear-gradient(to right, transparent 0px, black 50px, black calc(100% - 50px), transparent 100%)",
                    }}
                  >
                    <Index each={row().getVisibleCells()}>
                      {(cell) => (
                        <TableCell
                          style={getCommonPinningStyles(cell().column)}
                        >
                          <Dynamic
                            component={cell().column.columnDef.cell}
                            {...cell().getContext()}
                          />
                        </TableCell>
                      )}
                    </Index>
                  </TableRow>
                )}
              </Index>
            </Show>
          </TableBody>
          <TableFooter class="bg-white/0">
            <TableRow class="border-none cursor-default hover:bg-transparent">
              <TableCell colSpan={props.columns.length} class="text-center">
                <div
                  ref={sentinelRef}
                  class="flex justify-center py-4"
                  hidden={!props.table.hasMore() || props.table.query.isLoading}
                >
                  <div class="text-xs text-muted-foreground">
                    Loading more...
                  </div>
                </div>
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
      <Show when={shouldShowStatusBar()}>
        <div class="border-border/50">
          <TableStatusBar
            totalCount={totalCount()}
            totalLabel={props.statusBarLabel}
            emptyMessage={undefined}
          />
        </div>
      </Show>
    </div>
  );
};

/**
 * # Table
 *
 * A data table with infinite scroll, row selection, sorting, and column pinning.
 *
 * @example
 * ```
 * <div class="text-center p-8 text-muted-foreground border rounded-lg">
 *   <p class="font-medium">Table</p>
 *   <p class="text-sm mt-2">Requires QueryClientProvider and useTable hook.</p>
 *   <p class="text-sm">See documentation for usage examples.</p>
 * </div>
 * ```
 */
export {
  Table,
  TableRoot as TableCaption, // Alias for backwards compatibility
  TableRoot,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableStatusBar,
};
export type { TableProps };

// ============================================================================
// SimpleTable - Basic data table without tanstack machinery
// ============================================================================

interface SimpleTableColumn<TData> {
  header: string;
  accessor: keyof TData | ((row: TData) => JSX.Element | string | number);
}

interface SimpleTableProps<TData> {
  data: TData[];
  columns: SimpleTableColumn<TData>[];
  class?: string;
}

function SimpleTable<TData>(props: SimpleTableProps<TData>) {
  const getCellValue = (row: TData, column: SimpleTableColumn<TData>) => {
    if (typeof column.accessor === "function") {
      return column.accessor(row);
    }
    return row[column.accessor] as string | number;
  };

  return (
    <TableRoot class={props.class}>
      <TableHeader>
        <TableRow class="border-b border-border cursor-default hover:bg-transparent">
          <Index each={props.columns}>
            {(column) => <TableHead>{column().header}</TableHead>}
          </Index>
        </TableRow>
      </TableHeader>
      <TableBody>
        <Index each={props.data}>
          {(row) => (
            <TableRow>
              <Index each={props.columns}>
                {(column) => (
                  <TableCell>{getCellValue(row(), column())}</TableCell>
                )}
              </Index>
            </TableRow>
          )}
        </Index>
      </TableBody>
    </TableRoot>
  );
}

export { SimpleTable };
export type { SimpleTableColumn, SimpleTableProps };
