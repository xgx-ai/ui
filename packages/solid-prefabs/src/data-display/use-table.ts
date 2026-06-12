import { type Accessor, createMemo, createSignal } from "solid-js";
import { createInfiniteQuery, type InfiniteQueryResult, type QueryKey } from "@xgx/solid-query";

/**
 * Base interface for table row data.
 * Requires an id field for row selection functionality.
 */
export interface TableRowData {
  id: string;
}

export interface UseTableParams<TData extends TableRowData, TParams = Record<string, unknown>> {
  /** Query key for the local infinite query cache. */
  queryKey: QueryKey;
  /** Function to fetch paginated data. */
  queryFn: (
    params: TParams & { limit: number; page: number },
  ) => Promise<{ data: TData[]; count: number; totalCount?: number }>;
  /** Number of items per page. */
  limit?: number;
  /** Whether the query is enabled. */
  enabled?: Accessor<boolean> | boolean;
  /** Additional params passed to queryFn. */
  initialParams?: Omit<TParams, "limit" | "page">;
  /** Only allow single row selection. */
  singleSelect?: boolean;
}

export interface UseTableReturn<TData> {
  data: Accessor<TData[]>;
  query: InfiniteQueryResult<
    {
      data: TData[];
      count: number;
      totalCount?: number;
    },
    number
  >;
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
}

/**
 * Hook for table data with infinite scroll and built-in selection support.
 *
 * @example
 * ```tsx
 * const table = useTable({
 *   queryKey: ["users"],
 *   queryFn: ({ limit, page }) => fetchUsers({ limit, page }),
 * });
 * ```
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

  const query = createInfiniteQuery<{ data: TData[]; count: number; totalCount?: number }, number>(
    () => ({
      queryKey: params.queryKey,
      queryFn: ({ pageParam }) =>
        params.queryFn({
          ...initialParams,
          limit,
          page: pageParam,
        } as TParams & { limit: number; page: number }),
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages, lastPageParam) => {
        const loadedCount = allPages.reduce((total, page) => total + page.data.length, 0);
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
    }),
  );

  const data = createMemo(() => {
    query.isFetchingNextPage;
    query.hasNextPage;
    return query.peek()?.pages.flatMap((page) => page.data) ?? [];
  });

  const count = createMemo(() => {
    query.isFetchingNextPage;
    query.hasNextPage;
    const pages = query.peek()?.pages;
    if (!pages || pages.length === 0) return undefined;
    const lastPage = pages[pages.length - 1];
    return lastPage.count;
  });

  const totalCount = createMemo(() => {
    query.isFetchingNextPage;
    query.hasNextPage;
    const pages = query.peek()?.pages;
    if (!pages || pages.length === 0) return undefined;
    const lastPage = pages[pages.length - 1];
    return lastPage.totalCount;
  });

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  };

  const refetch = () => {
    void query.refetch();
  };

  const isLoading = createMemo(() => {
    query.isFetchingNextPage;
    query.hasNextPage;
    return !query.peek();
  });
  const isFetchingMore = createMemo(() => query.isFetchingNextPage);
  const hasMore = createMemo(() => query.hasNextPage);

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
      setSelected(checked ? [row] : []);
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
    } else if (checked) {
      setSelected((prev) => (prev.some((x) => x.id === rowId) ? prev : [...prev, row]));
    } else {
      setSelected((prev) => prev.filter((x) => x.id !== rowId));
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    setAllSelected(checked);
    setExcludedIds([]);
    setSelected([]);
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
  };
}
