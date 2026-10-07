import type { JSX } from "@solidjs/web";
import {
  createEffect,
  createMemo,
  createSignal,
  createStore,
  For,
  Loading,
  onSettled,
  Show,
  untrack,
  type Accessor,
} from "solid-js";
import { Checkbox } from "./forms/checkbox.tsx";
import { cn } from "./cn.ts";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./navigation/dropdown-menu.tsx";
import { ArrowDown, ArrowUp, Settings } from "./icons.index";
import {
  TableRoot,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./data-display/table.tsx";
import {
  compareTableValues,
  createTableColumn,
  getTableCellValue,
  getTableColumnId,
  shouldHandleRowClick,
} from "./table-state.ts";
import type {
  CellContext,
  ColumnDef,
  HeaderContext,
  TableColumn,
  TableRowContext,
  TableSortingState as SortingState,
  TableUpdater as Updater,
} from "./table-types.ts";

type VisibilityState = Record<string, boolean>;

/** Existing data-only callers remain valid; richer controllers opt in to behaviours. */
export type TableInfiniteController<TData> = {
  data: Accessor<TData[]>;
  hasMore: Accessor<boolean>;
  isFetchingMore: Accessor<boolean>;
  loadMore: () => void;
  query?: {
    data?: unknown;
    isFetching?: boolean;
    isLoading?: boolean;
    pending?: Accessor<boolean>;
  };
  totalCount: Accessor<number | undefined>;
  hasData?: Accessor<boolean>;
  isInitialLoading?: Accessor<boolean>;
  isLoading?: Accessor<boolean>;
  selectedCount?: Accessor<number>;
  selectableCount?: Accessor<number | undefined>;
  allSelected?: Accessor<boolean>;
  excludedIds?: Accessor<string[]>;
  singleSelect?: boolean;
  isRowSelected?: (row: TData) => boolean;
  isRowSelectable?: (row: TData) => boolean;
  toggleRowSelection?: (row: TData, checked: boolean) => void;
  toggleSelectAll?: (checked: boolean) => void;
  sorting?: Accessor<SortingState>;
  setSorting?: (updater: Updater<SortingState>) => void;
  tableId?: string;
};

/** Retain the existing public data-only controller contract. */
export type UseTableReturn<TData> = TableInfiniteController<TData> & {
  query: {
    data?: { data?: TData[]; totalCount?: number; count?: number };
    isFetching: boolean;
    isLoading: boolean;
    pending: Accessor<boolean>;
  };
  totalCount: Accessor<number>;
};

const ALWAYS_VISIBLE_COLUMN_IDS = new Set(["select", "settings", "actions"]);
const COLUMN_VISIBILITY_STORAGE_KEY_PREFIX = "table-column-visibility:";

function getColumnDisplayName<TData>(column: ColumnDef<TData>, index: number): string {
  if (column.meta?.displayName) return column.meta.displayName;
  const key = getTableColumnId(column, index);
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase())
    .trim();
}

function getColumnPinnedSide<TData>(column: TableColumn<TData>): "left" | "right" | false {
  const pinned = column.columnDef.meta?.pinned;
  if (pinned === "left" || pinned === "right") return pinned;
  return column.id === "actions" ? "right" : false;
}

function isColumnVisible(id: string, visibility: VisibilityState): boolean {
  return ALWAYS_VISIBLE_COLUMN_IDS.has(id) || visibility[id] !== false;
}

function storedColumnVisibility(tableId: string): VisibilityState {
  try {
    const stored = JSON.parse(
      localStorage.getItem(`${COLUMN_VISIBILITY_STORAGE_KEY_PREFIX}${tableId}`) ?? "{}",
    );
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
    return Object.fromEntries(
      Object.entries(stored).filter(([, value]) => typeof value === "boolean"),
    ) as VisibilityState;
  } catch {
    return {};
  }
}

function ColumnVisibilitySettings<TData>(props: {
  columns: ColumnDef<TData>[];
  visibility: VisibilityState;
  setVisibility: (id: string, visible: boolean) => void;
}) {
  const [open, setOpen] = createSignal(false);
  const toggleableColumns = () =>
    props.columns.filter(
      (column, index) =>
        !ALWAYS_VISIBLE_COLUMN_IDS.has(getTableColumnId(column, index)) &&
        column.enableHiding !== false,
    );
  return (
    <div class="flex items-center justify-center h-full">
      <DropdownMenu open={open()} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          aria-label="Column visibility"
          class="flex items-center justify-center p-1 rounded hover:bg-gray-100 transition-colors"
        >
          <Settings class="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-48">
          <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
          <For each={toggleableColumns()}>
            {(column) => {
              const id = () => getTableColumnId(column, props.columns.indexOf(column));
              return (
                <DropdownMenuCheckboxItem
                  checked={props.visibility[id()] !== false}
                  closeOnSelect={false}
                  onChange={(visible) => props.setVisibility(id(), visible)}
                >
                  {getColumnDisplayName(column, props.columns.indexOf(column))}
                </DropdownMenuCheckboxItem>
              );
            }}
          </For>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export interface TableInfiniteProps<TData> {
  table: TableInfiniteController<TData>;
  /** Controlled sorting delegates ordering of every page to the caller. */
  sorting?: SortingState;
  onSortingChange?: (updater: Updater<SortingState>) => void;
  /** Controlled visibility can be persisted by the application instead of localStorage. */
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  columns: ColumnDef<TData>[];
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
  statusBarSummarySlot?: JSX.Element;
}

function columnStyles<TData>(
  column: TableColumn<TData>,
  columns: TableColumn<TData>[],
  visibility: VisibilityState,
): JSX.CSSProperties {
  const pinned = getColumnPinnedSide(column);
  const visible = isColumnVisible(column.id, visibility);
  const size = column.columnDef.size ?? 150;
  const width = size === 150 ? "auto" : `${size}px`;
  const pinnedColumns = columns.filter(
    (item) => getColumnPinnedSide(item) === pinned && isColumnVisible(item.id, visibility),
  );
  const index = pinnedColumns.findIndex((item) => item.id === column.id);
  const siblings =
    pinned === "right" ? pinnedColumns.slice(index + 1) : pinnedColumns.slice(0, index);
  const offset = siblings.reduce((sum, item) => sum + (item.columnDef.size ?? 150), 0);
  return {
    left: pinned === "left" ? `${offset}px` : undefined,
    right: pinned === "right" ? `${offset}px` : undefined,
    position: pinned ? "sticky" : "relative",
    width,
    "min-width": size === 150 ? undefined : width,
    "max-width": size === 150 ? undefined : width,
    "z-index": pinned ? 1 : 0,
    background: pinned ? "var(--xgx-table-row-background, var(--card))" : "transparent",
    "box-shadow":
      pinned === "right"
        ? "-8px 0 12px -12px rgba(0,0,0,0.45)"
        : pinned === "left"
          ? "8px 0 12px -12px rgba(0,0,0,0.45)"
          : undefined,
    display: visible ? undefined : "none",
  };
}

function HeaderContents<TData>(props: { column: TableColumn<TData> }) {
  const render = () => {
    const header = props.column.columnDef.header;
    if (typeof header === "function")
      return header({ column: props.column } satisfies HeaderContext<TData>);
    return header ?? getColumnDisplayName(props.column.columnDef, props.column.index);
  };
  return <>{render()}</>;
}

function CellContents<TData>(props: { row: TableRowContext<TData>; column: TableColumn<TData> }) {
  const context: CellContext<TData> = {
    get row() {
      return props.row;
    },
    get column() {
      return props.column;
    },
    getValue: () => getTableCellValue(props.row.original, props.row.index, props.column.columnDef),
  };
  const render = () => {
    const cell = props.column.columnDef.cell;
    return typeof cell === "function" ? cell(context) : (cell ?? String(context.getValue() ?? ""));
  };
  return <>{render()}</>;
}

export function TableInfinite<TData>(props: TableInfiniteProps<TData>) {
  const tableId = () => props.tableId ?? props.table.tableId ?? "table";
  const [visibility, setVisibility] = createStore<VisibilityState>(
    untrack(
      () =>
        props.columnVisibility ??
        (props.enableColumnVisibility ? storedColumnVisibility(tableId()) : {}),
    ),
  );
  const visibilityState = () => props.columnVisibility ?? visibility;
  const changeVisibility = (id: string, visible: boolean) => {
    if (props.onColumnVisibilityChange) {
      props.onColumnVisibilityChange({ ...visibilityState(), [id]: visible });
    } else {
      setVisibility((draft) => {
        draft[id] = visible;
      });
    }
  };
  const [localSorting, setLocalSorting] = createSignal<SortingState>([]);
  const sorting = () => props.sorting ?? props.table.sorting?.() ?? localSorting();
  const controlledSorting = () =>
    props.onSortingChange !== undefined || props.table.setSorting !== undefined;
  const changeSorting = (updater: Updater<SortingState>) => {
    if (props.onSortingChange) props.onSortingChange(updater);
    else if (props.table.setSorting) props.table.setSorting(updater);
    else setLocalSorting(updater);
  };
  const initialLoading = () =>
    props.table.isInitialLoading?.() ??
    props.table.isLoading?.() ??
    props.table.query?.isLoading ??
    false;
  const hasData = () => props.table.hasData?.() ?? !initialLoading();
  const rowSelected = (row: TData) => props.table.isRowSelected?.(row) ?? false;
  const rowSelectable = (row: TData) => props.table.isRowSelectable?.(row) ?? true;
  const allSelected = () => props.table.allSelected?.() ?? false;
  const excludedIds = () => props.table.excludedIds?.() ?? [];
  createEffect(
    () => ({
      enabled: props.enableColumnVisibility && !props.onColumnVisibilityChange,
      id: tableId(),
      visibility: { ...visibility },
    }),
    (state) => {
      if (!state.enabled) return;
      try {
        localStorage.setItem(
          `${COLUMN_VISIBILITY_STORAGE_KEY_PREFIX}${state.id}`,
          JSON.stringify(state.visibility),
        );
      } catch {
        // Storage may be unavailable in a private browser session.
      }
    },
  );

  let sentinel: HTMLDivElement | undefined;
  let scrollContainer: HTMLDivElement | undefined;
  const [sentinelVisible, setSentinelVisible] = createSignal(false);
  onSettled(() => {
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setSentinelVisible(entries.some((entry) => entry.isIntersecting));
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  });
  createEffect(
    () =>
      sentinelVisible() &&
      props.table.hasMore() &&
      !props.table.isFetchingMore() &&
      !initialLoading(),
    (canLoad) => {
      if (!canLoad) return;
      // A cached page can land before the observer sees its new position.
      const frame = requestAnimationFrame(() => {
        if (!sentinel || !scrollContainer) return;
        const marker = sentinel.getBoundingClientRect();
        const viewport = scrollContainer.getBoundingClientRect();
        if (
          marker.height > 0 &&
          marker.bottom > Math.max(viewport.top, 0) &&
          marker.top < Math.min(viewport.bottom, window.innerHeight)
        )
          props.table.loadMore();
      });
      return () => cancelAnimationFrame(frame);
    },
  );

  const totalCount = () =>
    hasData() ? (props.table.totalCount() ?? props.table.data().length) : 0;
  const selectedCount = () =>
    props.enableRowSelection
      ? (props.table.selectedCount?.() ?? props.table.data().filter(rowSelected).length)
      : 0;
  const headerAllSelected = () =>
    selectedCount() > 0 &&
    (allSelected()
      ? excludedIds().length === 0
      : selectedCount() === (props.table.selectableCount?.() ?? totalCount()));
  const definitions = createMemo<ColumnDef<TData>[]>(() => {
    const columns: ColumnDef<TData>[] = [];
    if (props.enableRowSelection)
      columns.push({
        id: "select",
        size: 40,
        enableSorting: false,
        enableHiding: false,
        meta: { pinned: "left" },
        header: () => (
          <Show when={!props.table.singleSelect}>
            <div
              class="flex items-center justify-center h-full"
              onClick={(event) => event.stopPropagation()}
            >
              <Checkbox
                aria-label="Select all"
                size="md"
                checked={headerAllSelected()}
                indeterminate={selectedCount() > 0 && !headerAllSelected()}
                onChange={() =>
                  props.table.toggleSelectAll?.(!(allSelected() || headerAllSelected()))
                }
              />
            </div>
          </Show>
        ),
        cell: (context) => (
          <div
            class="flex items-center justify-center h-full"
            onClick={(event) => event.stopPropagation()}
          >
            <Checkbox
              aria-label="Select row"
              size="md"
              checked={rowSelected(context.row.original)}
              disabled={!rowSelectable(context.row.original)}
              onChange={(checked) =>
                props.table.toggleRowSelection?.(context.row.original, checked)
              }
            />
          </div>
        ),
      });
    columns.push(...props.columns);
    if (props.enableColumnVisibility)
      columns.push({
        id: "settings",
        size: 40,
        enableSorting: false,
        enableHiding: false,
        meta: { pinned: "right" },
        header: () => (
          <ColumnVisibilitySettings
            columns={props.columns}
            visibility={visibilityState()}
            setVisibility={changeVisibility}
          />
        ),
        cell: () => null,
      });
    return columns;
  });
  const columns = createMemo(() =>
    definitions().map((definition, index) =>
      createTableColumn(definition, index, {
        data: props.table.data,
        enabled: () => props.enableSorting ?? false,
        sorting,
        setSorting: changeSorting,
      }),
    ),
  );
  const visibleColumnCount = () =>
    columns().filter((column) => isColumnVisible(column.id, visibilityState())).length;
  const rows = createMemo(() => {
    const originals = props.table.data();
    const data = originals.map(
      (original, index): TableRowContext<TData> => ({
        original,
        index,
        id: props.getRowId?.(original) ?? (original as { id?: string }).id ?? String(index),
        getIsSelected: () => rowSelected(original),
      }),
    );
    if (controlledSorting() || sorting().length === 0) return data;
    return [...data].sort((left, right) => {
      for (const sort of sorting()) {
        const definition = columns().find((column) => column.id === sort.id)?.columnDef;
        if (!definition) continue;
        const result = compareTableValues(
          getTableCellValue(left.original, left.index, definition),
          getTableCellValue(right.original, right.index, definition),
        );
        if (result !== 0) return sort.desc ? -result : result;
      }
      return left.index - right.index;
    });
  });
  const endOfResults = () =>
    hasData() && !props.table.hasMore() && rows().length > 0 && !initialLoading();

  return (
    <div class={cn("w-full flex-1 min-h-0 flex flex-col", props.class)}>
      <div
        ref={(element) => {
          scrollContainer = element;
        }}
        class="flex-1 min-h-0 overflow-auto"
      >
        <TableRoot>
          <TableHeader
            style={{ position: "sticky", top: "0", "z-index": "10", background: "var(--card)" }}
          >
            <TableRow class="cursor-default hover:bg-transparent">
              <For each={columns()} keyed={false}>
                {(column) => (
                  <TableHead
                    class={[
                      "whitespace-nowrap",
                      { "cursor-pointer select-none": column().getCanSort() },
                    ]}
                    aria-sort={
                      column().getCanSort()
                        ? column().getIsSorted() === "asc"
                          ? "ascending"
                          : column().getIsSorted() === "desc"
                            ? "descending"
                            : "none"
                        : undefined
                    }
                    onClick={(event) => column().getToggleSortingHandler()(event)}
                    style={columnStyles(column(), columns(), visibilityState())}
                  >
                    <HeaderContents column={column()} />
                  </TableHead>
                )}
              </For>
            </TableRow>
          </TableHeader>
          <TableBody>
            <Loading
              fallback={
                <TableRow class="border-none cursor-default hover:bg-transparent">
                  <TableCell
                    colspan={visibleColumnCount()}
                    class="h-24 text-center text-xs text-gray-400"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              }
            >
              <Show
                when={rows().length > 0}
                fallback={
                  <TableRow class="border-none cursor-default hover:bg-transparent">
                    <TableCell
                      colspan={visibleColumnCount()}
                      class="h-24 text-center text-xs text-gray-400"
                    >
                      {props.statusBarEmptyMessage ?? "No results."}
                    </TableCell>
                  </TableRow>
                }
              >
                <For each={rows()} keyed={false}>
                  {(row) => (
                    <TableRow
                      data-state={row().getIsSelected() ? "selected" : undefined}
                      onClick={(event) => {
                        if (props.onRowClick && shouldHandleRowClick(event))
                          props.onRowClick(row().original);
                      }}
                      onMouseEnter={() => props.onRowHover?.(row().original)}
                      class={props.onRowClick ? "cursor-pointer" : undefined}
                    >
                      <For each={columns()} keyed={false}>
                        {(column) => (
                          <TableCell
                            class="overflow-hidden text-ellipsis whitespace-nowrap"
                            style={columnStyles(column(), columns(), visibilityState())}
                          >
                            <CellContents row={row()} column={column()} />
                          </TableCell>
                        )}
                      </For>
                    </TableRow>
                  )}
                </For>
              </Show>
            </Loading>
          </TableBody>
          <TableFooter class="bg-transparent">
            <TableRow class="border-none cursor-default hover:bg-transparent">
              <TableCell colspan={visibleColumnCount()} class="text-center">
                <div
                  ref={(element) => {
                    sentinel = element;
                  }}
                  class="flex justify-center py-4"
                  hidden={!hasData() || !props.table.hasMore() || initialLoading()}
                >
                  <div class="text-xs text-gray-400">Loading more...</div>
                </div>
                <Show when={endOfResults()}>
                  <div class="flex justify-center py-4">
                    <div class="text-xs text-gray-300">
                      {props.statusBarEndMessage ?? "End of results"}
                    </div>
                  </div>
                </Show>
              </TableCell>
            </TableRow>
          </TableFooter>
        </TableRoot>
      </div>
      <Show when={props.showStatusBar}>
        <div class="py-2 text-xs text-gray-600 border-t border-gray-200/50 flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <span>
              {props.statusBarLabel ?? "Total results"}: {totalCount()}
            </span>
            <Show when={props.enableRowSelection}>
              <span class="ml-1 text-muted-foreground">( Selected: {selectedCount()} )</span>
            </Show>
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
}

export const Table = TableInfinite;

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
