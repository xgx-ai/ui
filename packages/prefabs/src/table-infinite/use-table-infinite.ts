import { type Accessor, createMemo, createSignal } from "solid-js";
import { createInfiniteQuery, type InfiniteQueryResult, type QueryKey } from "@xgx/query";

export interface TableInfinitePage<TData> {
  data: TData[];
  count: number;
  totalCount?: number;
}

export interface UseTableInfiniteParams<TData, TParams = any> {
  queryKey: Accessor<QueryKey> | QueryKey;
  queryFn: (params: TParams & { limit: number; page: number }) => Promise<TableInfinitePage<TData>>;
  limit?: number;
  enabled?: Accessor<boolean> | boolean;
  initialParams?: Omit<TParams, "limit" | "page">;
  singleSelect?: boolean;
  /**
   * Unique identifier for the table, used for persisting state like column visibility.
   * Defaults to a stringified version of the queryKey if not specified.
   */
  tableId?: string;
}

export interface UseTableInfiniteFromQueryParams<TData, TPage, TPageParam = unknown> {
  query: InfiniteQueryResult<TPage, TPageParam>;
  getRows: (page: TPage) => readonly TData[];
  getCount?: (page: TPage) => number | undefined;
  getTotalCount?: (page: TPage) => number | undefined;
  singleSelect?: boolean;
  /**
   * Unique identifier for the table, used for persisting state like column visibility.
   */
  tableId?: string;
}

export interface UseTableInfiniteFromDefaultQueryParams<TData, TPageParam = unknown>
  extends Omit<
    UseTableInfiniteFromQueryParams<TData, TableInfinitePage<TData>, TPageParam>,
    "getRows" | "getCount" | "getTotalCount" | "query"
  > {
  query: InfiniteQueryResult<TableInfinitePage<TData>, TPageParam>;
  getRows?: (page: TableInfinitePage<TData>) => readonly TData[];
  getCount?: (page: TableInfinitePage<TData>) => number | undefined;
  getTotalCount?: (page: TableInfinitePage<TData>) => number | undefined;
}

export interface UseTableInfiniteReturn<
  TData,
  TPage = TableInfinitePage<TData>,
  TPageParam = unknown,
> {
  data: Accessor<TData[]>;
  latestData: Accessor<TData[]>;
  query: InfiniteQueryResult<TPage, TPageParam>;
  isLoading: Accessor<boolean>;
  isFetchingMore: Accessor<boolean>;
  hasMore: Accessor<boolean>;
  loadMore: () => void;
  refetch: () => void;
  count: Accessor<number | undefined>;
  totalCount: Accessor<number | undefined>;

  selected: Accessor<TData[]>;
  allSelected: Accessor<boolean>;
  excludedIds: Accessor<string[]>;
  toggleRowSelection: (row: TData, checked: boolean) => void;
  toggleSelectAll: (checked: boolean) => void;
  isRowSelected: (row: TData) => boolean;
  selectedCount: Accessor<number>;
  setSelected: (selected: TData[]) => void;
  singleSelect: boolean;
  /**
   * Unique identifier for the table, used for persisting state like column visibility.
   */
  tableId: string;
}

// Helper to resolve queryKey whether it's an accessor or static array
function resolveQueryKey(queryKey: Accessor<QueryKey> | QueryKey): QueryKey {
  return typeof queryKey === "function" ? queryKey() : queryKey;
}

function getDefaultRows<TData>(page: TableInfinitePage<TData>): readonly TData[] {
  return page.data;
}

function getDefaultCount<TData>(page: TableInfinitePage<TData>): number | undefined {
  return page.count;
}

function getDefaultTotalCount<TData>(page: TableInfinitePage<TData>): number | undefined {
  return page.totalCount;
}

export function useTableInfiniteFromQuery<TData, TPageParam = unknown>(
  params: UseTableInfiniteFromDefaultQueryParams<TData, TPageParam>,
): UseTableInfiniteReturn<TData, TableInfinitePage<TData>, TPageParam>;
export function useTableInfiniteFromQuery<TData, TPage, TPageParam = unknown>(
  params: UseTableInfiniteFromQueryParams<TData, TPage, TPageParam>,
): UseTableInfiniteReturn<TData, TPage, TPageParam>;
export function useTableInfiniteFromQuery<TData, TPage, TPageParam = unknown>(
  params:
    | UseTableInfiniteFromQueryParams<TData, TPage, TPageParam>
    | UseTableInfiniteFromDefaultQueryParams<TData, TPageParam>,
): UseTableInfiniteReturn<TData, TPage, TPageParam> {
  const singleSelect = params.singleSelect ?? false;
  const query = params.query as InfiniteQueryResult<TPage, TPageParam>;
  const getRows =
    "getRows" in params && params.getRows
      ? (params.getRows as (page: TPage) => readonly TData[])
      : (page: TPage) => getDefaultRows(page as TableInfinitePage<TData>);
  const getCount =
    "getCount" in params && params.getCount
      ? (params.getCount as (page: TPage) => number | undefined)
      : (page: TPage) => getDefaultCount(page as TableInfinitePage<TData>);
  const getTotalCount =
    "getTotalCount" in params && params.getTotalCount
      ? (params.getTotalCount as (page: TPage) => number | undefined)
      : (page: TPage) => getDefaultTotalCount(page as TableInfinitePage<TData>);

  const flattenPages = (pages: readonly TPage[] | undefined): TData[] =>
    pages?.flatMap((page) => [...getRows(page)]) ?? [];

  const data = createMemo(() => {
    return flattenPages(query.data().pages);
  });

  const latestData = createMemo(() => flattenPages(query.latest()?.pages));

  const count = createMemo(() => {
    const pages = query.latest()?.pages;
    if (!pages || pages.length === 0) return undefined;
    const lastPage = pages[pages.length - 1];
    return getCount(lastPage);
  });

  const totalCount = createMemo(() => {
    const pages = query.latest()?.pages;
    if (!pages || pages.length === 0) return undefined;
    const lastPage = pages[pages.length - 1];
    return getTotalCount(lastPage);
  });

  const loadMore = () => {
    if (query.hasNextPage() && !query.fetchingNextPage()) {
      void query.fetchNextPage();
    }
  };

  const refetch = () => {
    void query.refetch();
  };

  const isLoading = createMemo(() => query.pending() && latestData().length === 0);
  const isFetchingMore = createMemo(() => query.fetchingNextPage());
  const hasMore = createMemo(() => query.hasNextPage());

  const [selected, setSelected] = createSignal<TData[]>([]);
  const [allSelected, setAllSelected] = createSignal<boolean>(false);
  const [excludedIds, setExcludedIds] = createSignal<string[]>([]);

  const isRowSelected = (row: TData) => {
    const rowId = (row as any)?.id as string | undefined;
    if (rowId === undefined) return false;
    if (allSelected()) {
      return !new Set(excludedIds()).has(rowId);
    }
    return selected().findIndex((x) => (x as any).id === rowId) !== -1;
  };

  const toggleRowSelection = (row: TData, checked: boolean) => {
    const rowId = (row as any)?.id as string | undefined;
    if (rowId === undefined) return;

    if (singleSelect) {
      if (checked) {
        setSelected([row]);
      } else {
        setSelected([]);
      }
      setAllSelected(false);
      setExcludedIds([]);
      return;
    }

    if (allSelected()) {
      if (!checked) {
        setExcludedIds((prev) => (prev.includes(rowId) ? prev : [...prev, rowId]));
      } else {
        setExcludedIds((prev) => prev.filter((id) => id !== rowId));
      }
    } else {
      if (checked) {
        setSelected((prev) => (prev.some((x) => (x as any).id === rowId) ? prev : [...prev, row]));
      } else {
        setSelected((prev) => prev.filter((x) => (x as any).id !== rowId));
      }
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setAllSelected(true);
      setExcludedIds([]);
      setSelected([]);
    } else {
      setAllSelected(false);
      setExcludedIds([]);
      setSelected([]);
    }
  };

  const selectedCount = createMemo(() => {
    if (allSelected()) {
      const base = latestData().length;
      const excluded = excludedIds().length;
      return Math.min(5000, Math.max(0, base - excluded));
    }
    return Math.min(5000, selected().length);
  });

  return {
    data,
    latestData,
    query,
    isLoading,
    isFetchingMore,
    hasMore,
    loadMore,
    refetch,
    count,
    totalCount,

    selected,
    allSelected,
    excludedIds,
    toggleRowSelection,
    toggleSelectAll,
    isRowSelected,
    selectedCount,
    setSelected,
    singleSelect,
    tableId: params.tableId ?? "table",
  };
}

export function useTableInfinite<TData = any, TParams = any>(
  params: UseTableInfiniteParams<TData, TParams>,
): UseTableInfiniteReturn<TData, TableInfinitePage<TData>, number> {
  const { limit = 10, initialParams = {} as Omit<TParams, "limit" | "page"> } = params;

  // Generate tableId from queryKey if not provided
  const tableId =
    params.tableId ??
    (() => {
      const key = resolveQueryKey(params.queryKey);
      return Array.isArray(key) ? (key[0]?.toString() ?? "table") : String(key);
    })();

  const query = createInfiniteQuery<TableInfinitePage<TData>, number>(() => ({
    queryKey: resolveQueryKey(params.queryKey),
    queryFn: ({ pageParam }) =>
      params.queryFn({
        ...initialParams,
        limit,
        page: pageParam,
      } as TParams & { limit: number; page: number }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const loadedCount = _allPages.reduce((total, page) => total + page.data.length, 0);
      if (typeof lastPage.totalCount === "number" && loadedCount >= lastPage.totalCount) {
        return undefined;
      }

      if (!lastPage || !lastPage.data || lastPage.data.length < limit) {
        return undefined;
      }

      return lastPageParam + 1;
    },
    enabled: () =>
      typeof params.enabled === "function" ? params.enabled() : (params.enabled ?? true),
  }));

  return useTableInfiniteFromQuery({
    query,
    tableId,
    singleSelect: params.singleSelect,
  });
}
