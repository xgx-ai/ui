import type { JSX } from "@solidjs/web";
import { createInfiniteQuery } from "../../query/src/index.tsx";
import { createMemo, For, Show } from "solid-js";

export type UseTableReturn<TData> = {
  data: () => TData[];
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
      const loadedCount = allPages.reduce(
        (count, page) => count + (page.data?.length ?? 0),
        0,
      );
      const totalCount = lastPage.totalCount ?? lastPage.count ?? loadedCount;
      return loadedCount < totalCount ? lastPageParam + 1 : undefined;
    },
  }));

  const rows = createMemo(
    () => query.data?.pages.flatMap((page) => page.data ?? []) ?? [],
  );
  const totalCount = createMemo(
    () =>
      query.data?.pages.at(-1)?.totalCount ??
      query.data?.pages.at(-1)?.count ??
      rows().length,
  );

  return {
    data: rows,
    hasMore: createMemo(() => query.hasNextPage),
    isFetchingMore: createMemo(() => query.isFetchingNextPage),
    loadMore: () => {
      if (query.hasNextPage) void query.fetchNextPage();
    },
    query: {
      get data() {
        return {
          count: rows().length,
          data: rows(),
          totalCount: totalCount(),
        };
      },
      get isFetching() {
        return query.isFetching;
      },
      get isLoading() {
        return query.isLoading;
      },
    },
    totalCount,
  };
}

export type ColumnLike<TData> = {
  id?: string;
  accessorKey?: keyof TData | string;
  header?: unknown;
  cell?: unknown;
};

type CellRenderer<TData> = (info: {
  getValue: () => unknown;
  row: { original: TData };
}) => JSX.Element;

type TableCompatProps<TData> = {
  table: UseTableReturn<TData>;
  columns: ColumnLike<TData>[];
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

function renderHeader<TData>(column: ColumnLike<TData>) {
  if (typeof column.header === "function") return column.header({});
  return column.header ?? column.id ?? String(column.accessorKey ?? "");
}

function getCellValue<TData>(row: TData, column: ColumnLike<TData>) {
  if (!column.accessorKey) return undefined;
  return (row as Record<string, unknown>)[String(column.accessorKey)];
}

function renderCell<TData>(row: TData, column: ColumnLike<TData>) {
  if (typeof column.cell === "function") {
    return (column.cell as CellRenderer<TData>)({
      getValue: () => getCellValue(row, column),
      row: { original: row },
    });
  }

  const value = getCellValue(row, column);
  return value == null ? "" : String(value);
}

export function TableInfinite<TData>(props: TableCompatProps<TData>) {
  return (
    <div class="min-h-0 overflow-auto">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/40 text-left">
          <tr>
            <For each={props.columns}>
              {(column) => <th class="px-4 py-2">{renderHeader(column)}</th>}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={props.table.data()}>
            {(row) => (
              <tr
                class="border-b hover:bg-muted/40"
                onClick={() => props.onRowClick?.(row)}
              >
                <For each={props.columns}>
                  {(column) => (
                    <td class="px-4 py-3 align-middle">{renderCell(row, column)}</td>
                  )}
                </For>
              </tr>
            )}
          </For>
          <Show when={props.table.data().length === 0 && !props.table.query.isLoading}>
            <tr>
              <td
                class="px-4 py-6 text-center text-muted-foreground"
                colspan={props.columns.length}
              >
                No results
              </td>
            </tr>
          </Show>
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
