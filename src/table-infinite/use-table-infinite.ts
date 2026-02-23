import { keepPreviousData, useInfiniteQuery } from "@tanstack/solid-query";
import { type Accessor, createMemo, createSignal } from "solid-js";

export interface UseTableInfiniteParams<TData, TParams = any> {
  queryKey: Accessor<any[]> | any[];
  queryFn: (
    params: TParams & { limit: number; page: number },
  ) => Promise<{ data: TData[]; count: number; totalCount?: number }>;
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

export interface UseTableInfiniteReturn<TData> {
  data: Accessor<TData[]>;
  query: ReturnType<
    typeof useInfiniteQuery<{
      data: TData[];
      count: number;
      totalCount?: number;
    }>
  >;
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
function resolveQueryKey(queryKey: Accessor<any[]> | any[]): any[] {
  return typeof queryKey === "function" ? queryKey() : queryKey;
}

export function useTableInfinite<TData = any, TParams = any>(
  params: UseTableInfiniteParams<TData, TParams>,
): UseTableInfiniteReturn<TData> {
  const {
    limit = 10,
    initialParams = {} as Omit<TParams, "limit" | "page">,
    singleSelect = false,
  } = params;

  // Generate tableId from queryKey if not provided
  const tableId =
    params.tableId ??
    (() => {
      const key = resolveQueryKey(params.queryKey);
      return Array.isArray(key) ? (key[0]?.toString() ?? "table") : String(key);
    })();

  const query = useInfiniteQuery(() => ({
    queryKey: resolveQueryKey(params.queryKey),
    queryFn: ({ pageParam }) =>
      params.queryFn({
        ...initialParams,
        limit,
        page: pageParam,
      } as TParams & { limit: number; page: number }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      // If the last page returned fewer items than the limit, there's no more data
      if (!lastPage || !lastPage.data || lastPage.data.length < limit) {
        return undefined;
      }
      // Otherwise, increment the page number
      return lastPageParam + 1;
    },
    get enabled() {
      return typeof params.enabled === "function"
        ? params.enabled()
        : (params.enabled ?? true);
    },
    // Keep showing previous data while new data is loading (prevents Suspense flash)
    placeholderData: keepPreviousData,
  }));

  // Flatten all pages into a single array
  const data = createMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) => page.data);
  });

  const count = createMemo(() => {
    if (!query.data?.pages || query.data.pages.length === 0) return undefined;
    const lastPage = query.data.pages[query.data.pages.length - 1];
    return lastPage.count;
  });

  const totalCount = createMemo(() => {
    if (!query.data?.pages || query.data.pages.length === 0) return undefined;
    const lastPage = query.data.pages[query.data.pages.length - 1];
    return lastPage.totalCount;
  });

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetching) {
      query.fetchNextPage();
    }
  };

  const refetch = () => {
    query.refetch();
  };

  const isFetchingMore = createMemo(() => query.isFetchingNextPage);
  const hasMore = createMemo(() => query.hasNextPage ?? false);

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
        setExcludedIds((prev) =>
          prev.includes(rowId) ? prev : [...prev, rowId],
        );
      } else {
        setExcludedIds((prev) => prev.filter((id) => id !== rowId));
      }
    } else {
      if (checked) {
        setSelected((prev) => {
          const all = [...prev, row];
          const uniqueIds = new Set(all.map((x) => (x as any).id));
          return all.filter((x) => uniqueIds.has((x as any).id));
        });
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
      const base = data().length;
      const excluded = excludedIds().length;
      return Math.min(5000, Math.max(0, base - excluded));
    }
    return Math.min(5000, selected().length);
  });

  return {
    data,
    query,
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
    tableId,
  };
}
