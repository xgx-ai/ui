import type { ComponentProps, JSX } from "@solidjs/web";
import type {
  CellContext,
  ColumnDef,
  HeaderContext,
  TableColumn,
  TableRowContext,
  TableSortingState,
  TableUpdater,
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
  TableHeader,
  TableRow,
  tableHeadClass,
  tableRowClass,
} from "@xgx/ui";
import { GripVertical, RotateCcw, Settings } from "@xgx/ui/icons";
import { Sortable } from "@xgx/ui/sortablejs";
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  For,
  Loading,
  Show,
} from "solid-js";
import { createIntersectionLoader } from "../../../query/src/index.tsx";
import {
  canSortTableColumn,
  compareTableValues,
  getTableCellValue,
  nextTableSorting,
  resolveTableUpdater,
  shouldHandleRowClick,
  sortsDescendingFirst,
} from "./table-state";

export interface TableColumnLayout {
  version: 1;
  columnOrder: string[];
  hiddenColumnIds: string[];
}
export type TableColumnLayoutV1 = TableColumnLayout;

export function shouldClearTableSort(
  columnId: string | undefined,
  layout: TableColumnLayout,
): boolean {
  return Boolean(columnId && layout.hiddenColumnIds.includes(columnId));
}

export function reconcileTableColumnLayout(
  columnIds: readonly string[],
  hideableColumnIds: readonly string[],
  stored?: TableColumnLayout,
): TableColumnLayout {
  const columnOrder = [...(stored?.columnOrder ?? [])].filter((id) => columnIds.includes(id));
  for (const id of columnIds) if (!columnOrder.includes(id)) columnOrder.push(id);

  const hideable = new Set(hideableColumnIds);
  const hiddenColumnIds = [...(stored?.hiddenColumnIds ?? [])].filter((id) => hideable.has(id));
  if (columnIds.length > 0 && columnIds.every((id) => hiddenColumnIds.includes(id))) {
    hiddenColumnIds.shift();
  }
  return { version: 1, columnOrder, hiddenColumnIds };
}

export function moveTableColumn(
  layout: TableColumnLayout,
  fromId: string,
  toId: string,
): TableColumnLayout {
  const columnOrder = [...layout.columnOrder];
  const from = columnOrder.indexOf(fromId);
  const to = columnOrder.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return layout;
  columnOrder.splice(from, 1);
  columnOrder.splice(to, 0, fromId);
  return { ...layout, columnOrder };
}

export function reorderVisibleTableColumns(
  layout: TableColumnLayout,
  visibleColumnIds: readonly string[],
): TableColumnLayout {
  const reordered = [...visibleColumnIds];
  const visible = new Set(visibleColumnIds);
  const columnOrder = layout.columnOrder.map((id) =>
    visible.has(id) ? (reordered.shift() ?? id) : id,
  );
  return { ...layout, columnOrder };
}

export function pinnedColumnOffset(
  columns: readonly { pinned?: string; size?: number }[],
  columnIndex: number,
  pinning: "left" | "right",
): number {
  return columns
    .slice(pinning === "right" ? columnIndex + 1 : 0, pinning === "right" ? undefined : columnIndex)
    .filter((column) => column.pinned === pinning)
    .reduce((total, column) => total + (column.size ?? 150), 0);
}
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

/**
 * What the table reads from its rows' source. `useTableInfiniteFromQuery` and `TableController`
 * both fit, and a list loaded in full needs only the first four members. A source with
 * `setSorting` owns sorting: the table asks it to sort, and shows rows in the order it returns
 * them — for sorting on the server.
 */
export interface TableInfiniteSource<TData> {
  data: Accessor<TData[]>;
  hasMore: Accessor<boolean>;
  isFetchingMore: Accessor<boolean>;
  loadMore: () => void;
  isLoading?: Accessor<boolean>;
  totalCount?: Accessor<number | undefined>;
  query?: { readonly pending?: () => boolean };
  singleSelect?: boolean;
  allSelected?: Accessor<boolean>;
  excludedIds?: Accessor<string[]>;
  selectedCount?: Accessor<number>;
  /** How many rows can be selected across every page, when the source knows. */
  selectableCount?: Accessor<number | undefined>;
  isRowSelected?: (row: TData) => boolean;
  isRowSelectable?: (row: TData) => boolean;
  toggleRowSelection?: (row: TData, checked: boolean) => void;
  toggleSelectAll?: (checked: boolean) => void;
  sorting?: Accessor<TableSortingState>;
  setSorting?: (updater: TableUpdater<TableSortingState>) => void;
  tableId?: string;
}

const Table = (props: ComponentProps<"table">) => (
  <table {...props} class={cn("w-full caption-bottom !bg-none", props.class)} />
);

interface ColumnVisibilitySettingsProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  layout: TableColumnLayout;
  onLayoutChange: (layout: TableColumnLayout) => void;
  onReset?: () => void;
  resetLabel?: () => string | undefined;
  hasOverride?: () => boolean;
  getColumnDisplayName: (column: ColumnDef<TData, unknown>) => string;
}

const ColumnVisibilitySettings = <TData,>(props: ColumnVisibilitySettingsProps<TData>) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const toggleableColumns = () =>
    props.columns.filter((column) => column.enableHiding !== false && !column.meta?.pinned);
  const visibleDataCount = () =>
    props.columns.filter(
      (column) =>
        !column.meta?.pinned &&
        !props.layout.hiddenColumnIds.includes(getColumnId(column, props.columns.indexOf(column))),
    ).length;

  return (
    <div class="flex items-center justify-center h-full">
      <DropdownMenu open={isOpen()} onOpenChange={(open) => setIsOpen(open)}>
        <DropdownMenuTrigger
          aria-label="Table settings"
          data-table-layout-control
          class="flex items-center justify-center rounded-full p-1 text-muted-foreground transition-colors hover:bg-hover hover:text-hover-foreground"
        >
          <Settings class="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent data-table-layout-control class="w-48 font-normal normal-case">
          <DropdownMenuLabel>Columns</DropdownMenuLabel>
          <Sortable
            items={toggleableColumns()}
            getId={(column) => getColumnId(column, props.columns.indexOf(column))}
            itemClass={(_column, state) =>
              cn(
                "flex cursor-grab items-center gap-1 rounded-lg px-1 transition active:cursor-grabbing [&:focus-within_.column-drag-handle]:opacity-100 [&:hover_.column-drag-handle]:opacity-100",
                state.isGhost && "opacity-30",
                state.isDragging && "bg-accent shadow-lg ring-1 ring-border-strong",
              )
            }
            onChange={(columns) =>
              props.onLayoutChange(
                reorderVisibleTableColumns(
                  props.layout,
                  columns.map((column) => getColumnId(column, props.columns.indexOf(column))),
                ),
              )
            }
            options={{
              animation: 180,
              filter: "[role=menuitemcheckbox]",
              handle: undefined,
              preventOnFilter: false,
            }}
          >
            {(column) => {
              const columnId = () => getColumnId(column, props.columns.indexOf(column));
              const isVisible = () => !props.layout.hiddenColumnIds.includes(columnId());

              return (
                <>
                  <GripVertical
                    aria-hidden="true"
                    class="column-drag-handle size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity"
                  />
                  <DropdownMenuCheckboxItem
                    checked={isVisible()}
                    class="min-w-0 flex-1"
                    closeOnSelect={false}
                    disabled={isVisible() && visibleDataCount() <= 1}
                    onChange={() => {
                      const hidden = new Set(props.layout.hiddenColumnIds);
                      if (isVisible()) hidden.add(columnId());
                      else hidden.delete(columnId());
                      props.onLayoutChange({
                        ...props.layout,
                        hiddenColumnIds: [...hidden],
                      });
                    }}
                  >
                    {props.getColumnDisplayName(column)}
                  </DropdownMenuCheckboxItem>
                </>
              );
            }}
          </Sortable>
          <Show when={props.hasOverride?.() && props.onReset}>
            <button
              type="button"
              class="mx-1 mt-1 flex w-[calc(100%-0.5rem)] items-center rounded-full px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-hover hover:text-hover-foreground"
              onClick={() => props.onReset?.()}
            >
              <RotateCcw aria-hidden="true" class="mr-2 size-3.5" />
              {props.resetLabel?.() ?? "Reset to role default"}
            </button>
          </Show>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export interface TableInfiniteProps<TData> {
  table: TableInfiniteSource<TData>;
  columns: ColumnDef<TData, unknown>[];
  getRowId?: (row: TData) => string;
  groupBy?: (row: TData) => string;
  renderGroupHeader?: (group: string, rows: readonly TData[]) => JSX.Element;
  enableRowSelection?: boolean;
  enableSorting?: boolean;
  enableColumnVisibility?: boolean;
  enableColumnCustomisation?: boolean;
  columnLayout?: TableColumnLayout;
  columnLayoutResetLabel?: string;
  hasColumnLayoutOverride?: boolean;
  onColumnLayoutChange?: (layout: TableColumnLayout) => void;
  onResetColumnLayout?: () => void;
  onRowClick?: (row: TData) => void;
  onRowHover?: (row: TData) => void;
  class?: string;
  showStatusBar?: boolean;
  statusBarLabel?: string;
  /** Shown in the table body when there are no rows. */
  statusBarEmptyMessage?: string;
  statusBarEndMessage?: string;
  tableId?: string;
  statusBarSlot?: JSX.Element;
  /** Beside the counts on the left of the status bar, for totals and the like. */
  statusBarSummarySlot?: JSX.Element;
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

/*
 * TableChromeLoading: the body's `<Loading>` only covers the rows. The header's select-all
 * checkbox and loading bar, the end-of-results row and the status bar counts also read the
 * rows, which suspend until the first page lands. Each sits under its own small boundary:
 * without one, that read escapes the table and holds the nearest boundary above it, so a
 * page shows its route-level fallback instead of the table's skeleton rows.
 */
const StatusCountSkeleton = () => (
  <span
    aria-hidden="true"
    class="inline-block h-3 w-8 animate-pulse rounded bg-muted align-middle"
  />
);

const TableLoadingBar = () => (
  <div role="progressbar" aria-label="Loading table rows" class="xgx-table-loading-bar">
    <style>{TABLE_LOADING_BAR_STYLES}</style>
    <div class="xgx-table-loading-bar__track">
      <div class="xgx-table-loading-bar__segment" />
    </div>
  </div>
);

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
  const metaPinning = column.columnDef.meta?.pinned;
  const pinning = metaPinning === "left" || metaPinning === "right" ? metaPinning : undefined;
  const columnSize = column.columnDef.size;
  const widthValue = columnSize ? `${columnSize}px` : undefined;
  const columnIndex = visibleColumns.findIndex((item) => item.id === column.id);
  const pinnedBefore = pinning
    ? pinnedColumnOffset(
        visibleColumns.map((item) => ({
          pinned: item.columnDef.meta?.pinned,
          size: item.columnDef.size,
        })),
        columnIndex,
        pinning,
      )
    : 0;

  return {
    left: pinning === "left" ? `${pinnedBefore}px` : undefined,
    right: pinning === "right" ? `${pinnedBefore}px` : undefined,
    position: pinning ? "sticky" : "relative",
    width: widthValue,
    "min-width": widthValue,
    "max-width": widthValue,
    "z-index": pinning ? 1 : 0,
    "background-color": pinning ? "var(--xgx-table-row-background, var(--card))" : "transparent",
    "box-shadow":
      pinning === "right"
        ? "-1px 0 0 var(--border-subtle)"
        : pinning === "left"
          ? "1px 0 0 var(--border-subtle)"
          : undefined,
  };
}

function getRenderableTableData<TData>(table: TableInfiniteSource<TData>): TData[] {
  return table.data();
}

export const TableInfinite = <TData,>(props: TableInfiniteProps<TData>) => {
  const [localSorting, setLocalSorting] = createSignal<TableSortingState>([]);
  const sortsInSource = () => props.table.setSorting !== undefined;
  const sorting = () => (sortsInSource() ? (props.table.sorting?.() ?? []) : localSorting());
  const changeSorting = (updater: TableUpdater<TableSortingState>) => {
    if (props.table.setSorting) props.table.setSorting(updater);
    else setLocalSorting((previous) => resolveTableUpdater(updater, previous));
  };
  const isLoading = () => props.table.isLoading?.() ?? false;
  const isRowSelected = (row: TData) => props.table.isRowSelected?.(row) ?? false;
  const isRowSelectable = (row: TData) => props.table.isRowSelectable?.(row) ?? true;

  const enableRowSelection = () => props.enableRowSelection ?? false;
  const enableSorting = () => props.enableSorting ?? false;
  const enableColumnVisibility = () =>
    props.enableColumnCustomisation ?? props.enableColumnVisibility ?? false;
  const sourceColumns = () => props.columns ?? [];
  const rowId = (row: TData, index: number) =>
    props.getRowId?.(row) ?? (row as { id?: string }).id ?? String(index);
  /*
   * What a rendered row is keyed on: the row's id, or the row object itself when it has none.
   * Never a wrapper built here — a fresh wrapper per recompute is a new key, and the keyed
   * `<For>` would remount every row (and everything a row owns, such as a dialog waiting on
   * its own save) on each refetch. With rows reconciled by `useTableInfiniteFromQuery`, a
   * surviving row also keeps its object, so a field change updates only that field's readers.
   */
  const rowKey = (row: TData): unknown =>
    props.getRowId?.(row) ?? (row as { id?: unknown } | null)?.id ?? row;

  const loader = createIntersectionLoader({
    canLoad: () => props.table.hasMore() && !props.table.isFetchingMore() && !isLoading(),
    load: () => props.table.loadMore(),
    loadDelay: 80,
    rootMargin: "0px 0px 240px 0px",
  });

  const getDisplayName = (column: ColumnDef<TData, unknown>) =>
    getColumnDisplayName(column, sourceColumns().indexOf(column));

  const configurableColumns = createMemo(() =>
    sourceColumns().filter((column) => !column.meta?.pinned),
  );
  const columnLayout = createMemo<TableColumnLayout>(() => {
    const ids = configurableColumns().map((column) =>
      getColumnId(column, sourceColumns().indexOf(column)),
    );
    const hideableIds = configurableColumns()
      .filter((column) => column.enableHiding !== false)
      .map((column) => getColumnId(column, sourceColumns().indexOf(column)));
    return reconcileTableColumnLayout(ids, hideableIds, props.columnLayout);
  });
  const orderedSourceColumns = createMemo(() => {
    const left = sourceColumns().filter((column) => column.meta?.pinned === "left");
    const ordinary = columnLayout()
      .columnOrder.map((id) =>
        sourceColumns().find(
          (column) => getColumnId(column, sourceColumns().indexOf(column)) === id,
        ),
      )
      .filter((column): column is ColumnDef<TData, unknown> => Boolean(column));
    const right = sourceColumns().filter((column) => column.meta?.pinned === "right");
    return [...left, ...ordinary, ...right];
  });

  const allColumns = createMemo<ColumnDef<TData, unknown>[]>(() => {
    const columns: ColumnDef<TData, unknown>[] = [];

    if (enableRowSelection()) {
      columns.push({
        id: "select",
        size: 40,
        enableSorting: false,
        enableHiding: false,
        meta: { displayName: "Select", pinned: "left" },
        header: () => {
          // Everything selectable is selected: by "select all" with nothing excluded, or one
          // by one up to the source's selectable (or total) count.
          const allSelected = () => {
            const count = selectedCount();
            if (count === 0) return false;
            if (props.table.allSelected?.())
              return (props.table.excludedIds?.() ?? []).length === 0;
            const selectable =
              props.table.selectableCount?.() ??
              props.table.totalCount?.() ??
              getRenderableTableData(props.table).filter(isRowSelectable).length;
            return count >= selectable;
          };

          return (
            <Show when={!props.table.singleSelect}>
              <div class="flex items-center justify-center h-full">
                {/* Reads the rows, which suspend until the first page lands. See TableChromeLoading. */}
                <Loading
                  fallback={<Checkbox aria-label="Select all" size="md" checked={false} disabled />}
                >
                  <Checkbox
                    aria-label="Select all"
                    size="md"
                    checked={allSelected()}
                    onChange={(value) => props.table.toggleSelectAll?.(value)}
                    indeterminate={selectedCount() > 0 && !allSelected()}
                  />
                </Loading>
              </div>
            </Show>
          );
        },
        cell: (context) => (
          <div class="flex items-center justify-center h-full" data-row-click-ignore>
            <Checkbox
              checked={isRowSelected(context.row.original)}
              disabled={!isRowSelectable(context.row.original)}
              onChange={(value) => props.table.toggleRowSelection?.(context.row.original, value)}
              aria-label="Select row"
              size="md"
            />
          </div>
        ),
      });
    }

    columns.push(...orderedSourceColumns());

    if (enableColumnVisibility()) {
      columns.push({
        id: "settings",
        size: 40,
        enableSorting: false,
        enableHiding: false,
        meta: { displayName: "Table settings", pinned: "right" },
        header: () => (
          <ColumnVisibilitySettings
            columns={orderedSourceColumns()}
            layout={columnLayout()}
            onLayoutChange={(layout) => props.onColumnLayoutChange?.(layout)}
            onReset={props.onResetColumnLayout}
            resetLabel={() => props.columnLayoutResetLabel}
            hasOverride={() => props.hasColumnLayoutOverride ?? false}
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
        getCanSort: () => enableSorting() && canSortTableColumn(columnDef),
        getIsSorted: () => {
          const sort = sorting().find((item) => item.id === id);
          return sort ? (sort.desc ? "desc" : "asc") : false;
        },
        // Shift adds the column to the existing sort instead of replacing it.
        getToggleSortingHandler: () => (event) => {
          if (!column.getCanSort()) return;
          const multiple = Boolean((event as { shiftKey?: boolean } | undefined)?.shiftKey);
          const descendingFirst = sortsDescendingFirst(
            columnDef,
            getRenderableTableData(props.table),
          );
          changeSorting((previous) => nextTableSorting(previous, id, descendingFirst, multiple));
        },
      };
      return column;
    }),
  );

  const visibleColumns = createMemo(() =>
    tableColumns().filter(
      (column) =>
        column.id === "select" ||
        column.id === "settings" ||
        !columnLayout().hiddenColumnIds.includes(column.id),
    ),
  );

  // Each row's position in the source data, which is what `accessorFn` and the sort's
  // tie-break receive. Not its rendered position, which sorting and grouping change.
  const sourceIndexes = createMemo(() => {
    const indexes = new Map<TData, number>();
    getRenderableTableData(props.table).forEach((row, index) => indexes.set(row, index));
    return indexes;
  });

  const rows = createMemo<TData[]>(() => {
    // A source that sorts returns its rows in order already.
    const sorts = sortsInSource() ? [] : sorting();
    // `<Loading>` retains already-rendered rows across a key change, so the authoritative
    // read is all that is needed: no mirror, no non-suspending fallback.
    const sourceData = getRenderableTableData(props.table);
    const indexes = sourceIndexes();
    const indexOf = (row: TData) => indexes.get(row) ?? 0;
    const definitions = new Map(tableColumns().map((column) => [column.id, column.columnDef]));

    return [...sourceData].sort((left, right) => {
      const groupResult = props.groupBy
        ? compareTableValues(props.groupBy(left), props.groupBy(right))
        : 0;
      if (groupResult !== 0) return groupResult;
      for (const sort of sorts) {
        const definition = definitions.get(sort.id);
        if (!definition) continue;
        const result = compareTableValues(
          getTableCellValue(left, indexOf(left), definition),
          getTableCellValue(right, indexOf(right), definition),
        );
        if (result !== 0) return sort.desc ? -result : result;
      }
      return indexOf(left) - indexOf(right);
    });
  });

  /*
   * One context per rendered row, for the row's lifetime. Its fields read through to the
   * current row, so a cell sees a reconciled row's changes without being rebuilt, and the
   * index notifies only when this row's own position moves.
   */
  const createRowContext = (row: Accessor<TData>): TableRowContext<TData> => {
    const index = createMemo(() => sourceIndexes().get(row()) ?? 0);
    return {
      get id() {
        return rowId(row(), index());
      },
      get index() {
        return index();
      },
      get original() {
        return row();
      },
      getIsSelected: () => isRowSelected(row()),
    };
  };

  const rowGroups = createMemo(() => {
    const grouped: { key?: string; rows: TData[] }[] = [];
    for (const row of rows()) {
      const key = props.groupBy?.(row);
      const previous = grouped[grouped.length - 1];
      if (!previous || previous.key !== key) {
        grouped.push({ key, rows: [row] });
      } else {
        previous.rows.push(row);
      }
    }
    return grouped;
  });

  const totalCount = () => props.table.totalCount?.() ?? getRenderableTableData(props.table).length;
  // The source's count when it has one: in "select all" mode it covers rows not loaded yet.
  const selectedCount = () =>
    enableRowSelection()
      ? (props.table.selectedCount?.() ??
        getRenderableTableData(props.table).filter(isRowSelected).length)
      : 0;
  const showEndOfResults = () =>
    !props.table.hasMore() && getRenderableTableData(props.table).length > 0 && !isLoading();
  const showLoadingBar = () =>
    isLoading() || props.table.isFetchingMore() || (props.table.query?.pending?.() ?? false);
  const loadingBarRow = () => (
    <TableRow class="border-none cursor-default hover:bg-transparent">
      <th
        colspan={Math.max(visibleColumns().length, 1)}
        class="h-0 border-0 p-0 leading-none"
        style={{ height: "0", padding: "0" }}
      >
        <TableLoadingBar />
      </th>
    </TableRow>
  );

  // Hiding a sorted column stops sorting by it.
  createEffect(
    () => ({
      sortedIds: sorting().map((sort) => sort.id),
      hiddenColumnIds: columnLayout().hiddenColumnIds,
    }),
    ({ sortedIds, hiddenColumnIds }) => {
      const layout = { version: 1 as const, columnOrder: [], hiddenColumnIds };
      const hidden = sortedIds.filter((id) => shouldClearTableSort(id, layout));
      if (hidden.length > 0) {
        changeSorting((previous) => previous.filter((sort) => !hidden.includes(sort.id)));
      }
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
            <Sortable
              as="tr"
              class={cn(tableRowClass, "cursor-default hover:bg-transparent")}
              items={visibleColumns()}
              getId={(column) => column.id}
              itemAs="th"
              itemClass={(column, state) =>
                cn(
                  tableHeadClass,
                  "relative whitespace-nowrap transition-[opacity,box-shadow,background-color] [&:focus-within_.column-drag-handle]:opacity-100 [&:hover_.column-drag-handle]:opacity-100",
                  enableColumnVisibility() &&
                    !column.columnDef.meta?.pinned &&
                    "cursor-grab active:cursor-grabbing",
                  column.getCanSort() && "select-none",
                  state.isGhost && "opacity-30",
                  state.isDragging && "bg-accent shadow-lg ring-1 ring-border-strong",
                )
              }
              itemProps={(column) => ({
                "data-column-fixed": column.columnDef.meta?.pinned ? "true" : undefined,
                "data-table-layout-control": enableColumnVisibility() ? "" : undefined,
                "data-table-pinned": column.columnDef.meta?.pinned || undefined,
                "aria-sort": column.getCanSort()
                  ? column.getIsSorted() === "asc"
                    ? "ascending"
                    : column.getIsSorted() === "desc"
                      ? "descending"
                      : "none"
                  : undefined,
                onClick: column.getToggleSortingHandler(),
                style: getColumnStyles(column, visibleColumns()),
              })}
              onChange={(columns) => {
                if (!enableColumnVisibility()) return;
                const ordinaryIds = columns
                  .filter((column) => !column.columnDef.meta?.pinned)
                  .map((column) => column.id);
                props.onColumnLayoutChange?.(
                  reorderVisibleTableColumns(columnLayout(), ordinaryIds),
                );
              }}
              options={{
                animation: 180,
                disabled: !enableColumnVisibility(),
                direction: "horizontal",
                draggable: '[data-sortable-item]:not([data-column-fixed="true"])',
                handle: undefined,
              }}
            >
              {(column) => (
                <>
                  <Show
                    when={
                      enableColumnVisibility() &&
                      !column.columnDef.meta?.pinned &&
                      column.id !== "select" &&
                      column.id !== "settings"
                    }
                  >
                    {/* Absolutely positioned in the cell's left padding, so a handle that is
                        invisible until hover does not push the label out of line with the
                        column's cells. */}
                    <span class="column-drag-handle pointer-events-none absolute left-0.5 top-1/2 inline-flex -translate-y-1/2 opacity-0 transition-opacity">
                      <GripVertical aria-hidden="true" class="size-3 text-muted-foreground/60" />
                    </span>
                  </Show>
                  {(() => {
                    const content = renderHeader(column, getDisplayName(column.columnDef));
                    // A header that renders its own element (a sort button, say) shows its own
                    // sort state; plain text gets the table's arrow.
                    if (typeof content !== "string" && typeof content !== "number") return content;
                    return (
                      <>
                        {content}
                        <Show when={column.getIsSorted()}>
                          {(sorted) => (
                            <span class="ml-2 text-xs">{sorted() === "asc" ? "↑" : "↓"}</span>
                          )}
                        </Show>
                      </>
                    );
                  })()}
                </>
              )}
            </Sortable>
            {/* `query.pending()` reads the rows, so the first load suspends it. The bar is
                what that state should show anyway. */}
            <Loading fallback={loadingBarRow()}>
              <Show when={showLoadingBar()}>{loadingBarRow()}</Show>
            </Loading>
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
                      {props.statusBarEmptyMessage ?? "No results."}
                    </TableCell>
                  </TableRow>
                }
              >
                {/* Groups by their key and rows by `rowKey`, never by an object built in a
                    memo here: see `rowKey`. */}
                <For each={rowGroups()} keyed={(group) => group.key ?? ""}>
                  {(rowGroup) => (
                    <>
                      <Show when={rowGroup().key}>
                        {(key) => (
                          <TableRow class="cursor-default bg-muted/50 hover:bg-muted/50">
                            <TableCell
                              colspan={Math.max(visibleColumns().length, 1)}
                              class="py-2 text-xs font-semibold text-muted-foreground"
                            >
                              {props.renderGroupHeader?.(key(), rowGroup().rows) ?? key()}
                            </TableCell>
                          </TableRow>
                        )}
                      </Show>
                      <For each={rowGroup().rows} keyed={rowKey}>
                        {(row) => {
                          const rowContext = createRowContext(row);

                          return (
                            <TableRow
                              data-state={rowContext.getIsSelected() ? "selected" : undefined}
                              interactive={Boolean(props.onRowClick)}
                              onClick={(event) => {
                                if (props.onRowClick && shouldHandleRowClick(event)) {
                                  props.onRowClick(row());
                                }
                              }}
                              onMouseEnter={
                                props.onRowHover ? () => props.onRowHover?.(row()) : undefined
                              }
                            >
                              <For each={visibleColumns()}>
                                {(column) => {
                                  const context: CellContext<TData, unknown> = {
                                    row: rowContext,
                                    column,
                                    getValue: () =>
                                      getTableCellValue(row(), rowContext.index, column.columnDef),
                                  };

                                  return (
                                    <TableCell
                                      data-table-pinned={column.columnDef.meta?.pinned || undefined}
                                      class="whitespace-nowrap"
                                      style={getColumnStyles(column, visibleColumns())}
                                    >
                                      {renderCell(context)}
                                    </TableCell>
                                  );
                                }}
                              </For>
                            </TableRow>
                          );
                        }}
                      </For>
                    </>
                  )}
                </For>
              </Show>
            </Loading>
          </TableBody>
          <TableFooter class="bg-transparent">
            <TableRow class="border-none cursor-default hover:bg-transparent">
              <TableCell colspan={Math.max(visibleColumns().length, 1)} class="text-center">
                <Show when={props.table.hasMore() && !isLoading()}>
                  <div ref={loader.ref} class="flex justify-center py-4">
                    <div class="text-xs text-muted-foreground">Loading more...</div>
                  </div>
                </Show>
                {/* An explicit empty string opts out of the end-of-results row entirely. */}
                <Loading fallback={null}>
                  <Show when={showEndOfResults() && props.statusBarEndMessage !== ""}>
                    <div class="flex justify-center py-4">
                      <div class="text-xs text-muted-foreground/70">
                        {props.statusBarEndMessage ?? "End of results"}
                      </div>
                    </div>
                  </Show>
                </Loading>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <Show when={props.showStatusBar ?? false}>
        <div class="flex items-center justify-between border-t border-border-subtle px-4 py-3 text-xs text-muted-foreground">
          <div class="flex min-w-0 items-center gap-3">
            <span>
              {props.statusBarLabel ?? "Total results"}:{" "}
              <Loading fallback={<StatusCountSkeleton />}>{totalCount()}</Loading>
              <Show when={enableRowSelection()}>
                <Loading fallback={null}>
                  <span class="ml-1 text-muted-foreground/70">( Selected: {selectedCount()} )</span>
                </Loading>
              </Show>
            </span>
            <Show when={props.statusBarSummarySlot}>
              <div>{props.statusBarSummarySlot}</div>
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
