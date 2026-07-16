import { createInfiniteQuery, type InfiniteQueryResult, type QueryKey } from "@xgx/query";
import { type Accessor, createMemo, createSignal, onCleanup } from "solid-js";

export interface SearchInfinitePage<T> {
  data: T[];
  count?: number;
  totalCount?: number;
  hasMore?: boolean;
}

export interface SearchInfiniteQueryConfig<T> {
  queryKey: QueryKey;
  queryFn: (params: {
    search: string;
    limit: number;
    page: number;
  }) => Promise<SearchInfinitePage<T>>;
  limit?: number;
  enabled?: Accessor<boolean> | boolean;
}

export interface CreateSearchInfiniteParams<T> {
  queryConfig: Accessor<SearchInfiniteQueryConfig<T>>;
  /** Gates fetching; typically whether the search dropdown is open. */
  active: Accessor<boolean>;
  debounceMs?: Accessor<number | undefined>;
}

export interface SearchInfiniteState<T> {
  query: InfiniteQueryResult<SearchInfinitePage<T>, number>;
  options: Accessor<T[]>;
  searchTerm: Accessor<string>;
  setSearch: (value: string) => void;
  clearSearch: () => void;
  isLoading: Accessor<boolean>;
  isFetchingMore: Accessor<boolean>;
  hasMore: Accessor<boolean>;
  loadMore: () => void;
}

function pageHasMore<T>(
  lastPage: SearchInfinitePage<T>,
  allPages: SearchInfinitePage<T>[],
  limit: number,
): boolean {
  if (lastPage.hasMore !== undefined) return lastPage.hasMore;
  if (typeof lastPage.totalCount === "number") {
    const loaded = allPages.reduce((total, page) => total + page.data.length, 0);
    return loaded < lastPage.totalCount;
  }
  return lastPage.data.length >= limit;
}

export function createSearchInfinite<T>(
  params: CreateSearchInfiniteParams<T>,
): SearchInfiniteState<T> {
  const [searchTerm, setSearchTerm] = createSignal("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = createSignal("");
  let debounceTimeout: ReturnType<typeof setTimeout> | undefined;

  const setSearch = (value: string) => {
    setSearchTerm(value);
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => setDebouncedSearchTerm(value), params.debounceMs?.() ?? 300);
  };

  const clearSearch = () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    setSearchTerm("");
    setDebouncedSearchTerm("");
  };

  onCleanup(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
  });

  const query = createInfiniteQuery<SearchInfinitePage<T>, number>(() => {
    const config = params.queryConfig();
    const limit = config.limit ?? 20;
    const search = debouncedSearchTerm();

    return {
      queryKey: [...config.queryKey, { limit, search }],
      initialPageParam: 0,
      queryFn: ({ pageParam }) => config.queryFn({ search, limit, page: pageParam }),
      getNextPageParam: (lastPage, allPages, lastPageParam) =>
        pageHasMore(lastPage, allPages, limit) ? lastPageParam + 1 : undefined,
      enabled: () =>
        params.active() &&
        (typeof config.enabled === "function" ? config.enabled() : (config.enabled ?? true)),
    };
  });

  const options = createMemo(() => query.latest()?.pages.flatMap((page) => page.data) ?? []);

  const loadMore = () => {
    if (query.hasNextPage() && !query.fetching() && !query.fetchingNextPage()) {
      void query.fetchNextPage();
    }
  };

  return {
    query,
    options,
    searchTerm,
    setSearch,
    clearSearch,
    isLoading: query.loading,
    isFetchingMore: query.fetchingNextPage,
    hasMore: query.hasNextPage,
    loadMore,
  };
}
