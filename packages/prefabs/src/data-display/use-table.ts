import { createInfiniteQuery, type InfiniteDescriptor, type InfiniteQueryResult } from "@xgx/query";
import { type Accessor, createMemo, createSignal } from "solid-js";

/**
 * Base interface for table row data.
 * Requires an id field for row selection functionality.
 */
export interface TableRowData {
  id: string;
}

export interface UseTableParams<TData extends TableRowData> {
  /**
   * The descriptor to observe, or `null` for "no question yet".
   *
   * Page size, filters and search term all live in the descriptor's key, so this hook has
   * nothing to inject and nothing that can drift from what the request actually sends.
   */
  source: () => InfiniteDescriptor<TablePage<TData>, number> | null;
  /** Only allow single row selection. */
  singleSelect?: boolean;
}

export interface TablePage<TData> {
  data: TData[];
  count: number;
  totalCount?: number;
}

export interface UseTableReturn<TData> {
  data: Accessor<TData[]>;
  query: InfiniteQueryResult<TablePage<TData>, number>;
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
 * const users = queryGroup("users", {
 *   list: infiniteQuery({
 *     key: (search: string) => ({ search: search || undefined, limit: 10 }),
 *     initialPageParam: 0,
 *     fetch: (key, ctx) => fetchUsers({ ...key, page: ctx.pageParam }),
 *     getNextPageParam: (page, pages, cursor) => ...,
 *   }),
 * });
 *
 * const table = useTable({ source: () => users.list(search()) });
 * ```
 */
export function useTable<TData extends TableRowData = TableRowData>(
  params: UseTableParams<TData>,
): UseTableReturn<TData> {
  const { singleSelect = false } = params;

  const query = createInfiniteQuery(params.source);

  // Reads `retained`, not `data`: a keyed `<For>` under `<Loading>` does not pick up the
  // new value in Solid 2 beta.25, so a filtered table would stay stuck on old rows. The
  // first read still suspends, because `retained` is undefined until something resolves.
  const data = createMemo(() => {
    const rows = query.retained();
    if (!rows) return query.data().pages.flatMap((page) => page.data);
    return rows.pages.flatMap((page) => page.data);
  });

  const count = createMemo(() => {
    const pages = query.cached()?.pages;
    if (!pages || pages.length === 0) return undefined;
    const lastPage = pages[pages.length - 1];
    return lastPage.count;
  });

  const totalCount = createMemo(() => {
    const pages = query.cached()?.pages;
    if (!pages || pages.length === 0) return undefined;
    const lastPage = pages[pages.length - 1];
    return lastPage.totalCount;
  });

  const loadMore = () => {
    if (query.hasNextPage() && !query.fetchingNextPage()) {
      void query.fetchNextPage();
    }
  };

  const refetch = () => {
    void query.refetch();
  };

  // No cached value for the current key yet, so nothing can be shown. `<Loading>` owns
  // the first read; this is for chrome that renders outside the boundary.
  const isLoading = createMemo(() => query.fetching() && query.cached() === undefined);
  const isFetchingMore = createMemo(() => query.fetchingNextPage());
  const hasMore = createMemo(() => query.hasNextPage());

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
