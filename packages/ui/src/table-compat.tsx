import type { JSX } from "@solidjs/web";
import { createInfiniteQuery } from "../../query/src/index.tsx";
import { createMemo, For, Loading, Show } from "solid-js";
import type {
  CellContext,
  ColumnDef,
  HeaderContext,
  TableColumn,
  TableRowContext,
} from "./table-types.ts";

export type UseTableReturn<TData> = {
  data: () => TData[];
  latestData: () => TData[];
  hasMore: () => boolean;
  isFetchingMore: () => boolean;
  loadMore: () => void;
  query: {
    data?: {
      data?: TData[];
      totalCount?: number;
      count?: number;
    };
    isFetching: boolean;
    isLoading: boolean;
    pending: () => boolean;
  };
  totalCount: () => number;
};

type UseTableInfiniteParams<TData> = {
  queryKey: () => readonly unknown[];
  queryFn: (params: { limit: number; page: number }) => Promise<{
    data?: TData[];
    totalCount?: number;
    count?: number;
  }>;
  limit?: number;
  tableId?: string;
};

export function useTableInfinite<TData>(
  params: UseTableInfiniteParams<TData>,
): UseTableReturn<TData> {
  const limit = params.limit ?? 25;
  const query = createInfiniteQuery(() => ({
    queryKey: params.queryKey(),
    queryFn: ({ pageParam }) => params.queryFn({ limit, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      const loadedCount = allPages.reduce((count, page) => count + (page.data?.length ?? 0), 0);
      const totalCount = lastPage.totalCount ?? lastPage.count ?? loadedCount;
      return loadedCount < totalCount ? lastPageParam + 1 : undefined;
    },
  }));

  const rows = createMemo(() => query.data().pages.flatMap((page) => page.data ?? []));
  const latestRows = createMemo(
    () => query.latest()?.pages.flatMap((page) => page.data ?? []) ?? [],
  );
  const totalCount = createMemo(
    () =>
      query.latest()?.pages.at(-1)?.totalCount ??
      query.latest()?.pages.at(-1)?.count ??
      latestRows().length,
  );

  return {
    data: rows,
    latestData: latestRows,
    hasMore: createMemo(() => query.hasNextPage()),
    isFetchingMore: createMemo(() => query.fetchingNextPage()),
    loadMore: () => {
      if (query.hasNextPage()) void query.fetchNextPage();
    },
    query: {
      get data() {
        return {
          count: latestRows().length,
          data: latestRows(),
          totalCount: totalCount(),
        };
      },
      get isFetching() {
        return query.pending() || query.fetchingNextPage();
      },
      get isLoading() {
        return query.pending() && latestRows().length === 0;
      },
      pending: query.pending,
    },
    totalCount,
  };
}

type TableCompatProps<TData> = {
  table: UseTableReturn<TData>;
  columns: ColumnDef<TData>[];
  getRowId?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  enableSorting?: boolean;
  enableRowSelection?: boolean;
  showStatusBar?: boolean;
  statusBarLabel?: string;
  statusBarEmptyMessage?: string;
  statusBarEndMessage?: string;
  enableColumnVisibility?: boolean;
};

function getColumnId<TData>(column: ColumnDef<TData>, index: number) {
  return column.id ?? String(column.accessorKey ?? index);
}

function getColumn<TData>(column: ColumnDef<TData>, index: number): TableColumn<TData> {
  return {
    id: getColumnId(column, index),
    index,
    columnDef: column,
    getCanSort: () => column.enableSorting ?? false,
    getIsSorted: () => false,
    getToggleSortingHandler: () => () => undefined,
  };
}

function getRowContext<TData>(
  row: TData,
  rowIndex: number,
  getRowId?: (row: TData) => string,
): TableRowContext<TData> {
  return {
    id: getRowId?.(row) ?? String(rowIndex),
    index: rowIndex,
    original: row,
    getIsSelected: () => false,
  };
}

function renderHeader<TData>(column: ColumnDef<TData>, index: number) {
  if (typeof column.header === "function") {
    const context: HeaderContext<TData> = {
      column: getColumn(column, index),
    };
    return column.header(context);
  }
  return column.header ?? column.id ?? String(column.accessorKey ?? "");
}

function getCellValue<TData>(row: TData, rowIndex: number, column: ColumnDef<TData>) {
  if (column.accessorFn) return column.accessorFn(row, rowIndex);
  if (!column.accessorKey) return undefined;
  return (row as Record<string, unknown>)[String(column.accessorKey)];
}

function renderCell<TData>(
  row: TData,
  rowIndex: number,
  column: ColumnDef<TData>,
  columnIndex: number,
  getRowId?: (row: TData) => string,
) {
  if (typeof column.cell === "function") {
    const context: CellContext<TData> = {
      column: getColumn(column, columnIndex),
      getValue: () => getCellValue(row, rowIndex, column),
      row: getRowContext(row, rowIndex, getRowId),
    };
    return column.cell(context);
  }

  if (column.cell) return column.cell;

  const value = getCellValue(row, rowIndex, column);
  return value == null ? "" : String(value);
}

export function TableInfinite<TData>(props: TableCompatProps<TData>) {
  const rows = createMemo(() => props.table.data());
  const latestRows = () => props.table.latestData();
  const columnCount = () => Math.max(props.columns.length, 1);

  return (
    <div class="min-h-0 overflow-auto">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/40 text-left">
          <tr>
            <For each={props.columns}>
              {(column, index) => <th class="px-4 py-2">{renderHeader(column, index())}</th>}
            </For>
          </tr>
        </thead>
        <tbody>
          <Loading
            fallback={
              <tr>
                <td class="px-4 py-6 text-center text-muted-foreground" colspan={columnCount()}>
                  Loading...
                </td>
              </tr>
            }
          >
            <For each={rows()}>
              {(row, rowIndex) => (
                <tr class="border-b hover:bg-muted/40" onClick={() => props.onRowClick?.(row)}>
                  <For each={props.columns}>
                    {(column, columnIndex) => (
                      <td class="px-4 py-3 align-middle">
                        {renderCell(row, rowIndex(), column, columnIndex(), props.getRowId)}
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
            <Show when={latestRows().length === 0 && !props.table.query.isLoading}>
              <tr>
                <td class="px-4 py-6 text-center text-muted-foreground" colspan={columnCount()}>
                  No results
                </td>
              </tr>
            </Show>
          </Loading>
        </tbody>
      </table>
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
      disabled={!props.sortable}
      type="button"
      onClick={() => props.onSort?.()}
    >
      {props.title ?? props.children}
      <Show when={props.sorted}>{(direction) => <span>{direction()}</span>}</Show>
    </button>
  );
}
