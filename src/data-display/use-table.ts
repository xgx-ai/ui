import { useInfiniteQuery } from "@tanstack/solid-query";
import { type Accessor, createMemo, createSignal } from "solid-js";

/**
 * Base interface for table row data.
 * Requires an id field for row selection functionality.
 */
export interface TableRowData {
  id: string;
}

export interface UseTableParams<
  TData extends TableRowData,
  TParams = Record<string, unknown>,
> {
  /** Query key for TanStack Query cache */
  queryKey: unknown[];
  /** Function to fetch paginated data */
  queryFn: (
    params: TParams & { limit: number; page: number },
  ) => Promise<{ data: TData[]; count: number; totalCount?: number }>;
  /** Number of items per page (default: 10) */
  limit?: number;
  /** Whether the query is enabled */
  enabled?: Accessor<boolean> | boolean;
  /** Additional params passed to queryFn */
  initialParams?: Omit<TParams, "limit" | "page">;
  /** Only allow single row selection */
  singleSelect?: boolean;
}

export interface UseTableReturn<TData> {
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
}

/**
 * Hook for table data with infinite scroll and built-in selection support.
 * Wraps TanStack Query's useInfiniteQuery with table-specific utilities.
 */
export function useTable<
  TData extends TableRowData = TableRowData,
  TParams = Record<string, unknown>,
>(params: UseTableParams<TData, TParams>): UseTableReturn<TData> {
  const {
    limit = 10,
    initialParams = {} as Omit<TParams, "limit" | "page">,
    singleSelect = false,
  } = params;

  const query = useInfiniteQuery(() => ({
    queryKey: [...params.queryKey],
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
    const rowId = row.id;
    if (allSelected()) {
      return !new Set(excludedIds()).has(rowId);
    }
    return selected().findIndex((x) => x.id === rowId) !== -1;
  };

  const toggleRowSelection = (row: TData, checked: boolean) => {
    const rowId = row.id;

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
          const uniqueIds = new Set(all.map((x) => x.id));
          return all.filter((x) => uniqueIds.has(x.id));
        });
      } else {
        setSelected((prev) => prev.filter((x) => x.id !== rowId));
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
  };
}
