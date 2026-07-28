import { createInfiniteQuery, type InfiniteDescriptor, type InfiniteQueryResult } from "@xgx/query";
import { type Accessor, createMemo, createSignal, onCleanup } from "solid-js";

export interface SearchInfinitePage<T> {
  data: T[];
  count?: number;
  totalCount?: number;
  hasMore?: boolean;
}

export interface SearchInfiniteQueryConfig<T> {
  /**
   * Builds the descriptor for one debounced search term.
   *
   * The term is passed in rather than captured, because it belongs in the key: two terms are
   * two different questions and must not share a cache entry. Return `null` for a term this
   * config has no answer for — a minimum length, say — and nothing is fetched.
   */
  descriptor: (search: string) => InfiniteDescriptor<SearchInfinitePage<T>, number> | null;
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

/**
 * The page-shape convention this component understands, for a descriptor's
 * `getNextPageParam` to reuse rather than restate.
 */
export function searchPageHasMore<T>(
  lastPage: SearchInfinitePage<T>,
  allPages: readonly SearchInfinitePage<T>[],
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
    const active =
      params.active() &&
      (typeof config.enabled === "function" ? config.enabled() : (config.enabled ?? true));
    // A closed dropdown has no question to ask. `null` is how that is said now — it never
    // fetches and never mints a placeholder entry, which `enabled` could not avoid.
    if (!active) return null;
    return config.descriptor(debouncedSearchTerm());
  });

  /**
   * Never suspends.
   *
   * A closed dropdown has no descriptor, and a `null` descriptor's `data()` never resolves —
   * so reading it here left the memo permanently pending. Solid defers the *whole* update
   * behind a pending read (issue S5), which meant simply rendering a closed picker could stop
   * the surrounding update from ever committing. `isLoading` below already reports progress
   * from non-suspending state, so there is nothing to gain by blocking here.
   */
  const options = createMemo(() => {
    const rows = query.retained() ?? query.cached();
    return rows ? rows.pages.flatMap((page) => page.data) : [];
  });

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
    // No cached value for the current key yet: the dropdown has nothing to show.
    isLoading: () => query.fetching() && query.cached() === undefined,
    isFetchingMore: query.fetchingNextPage,
    hasMore: query.hasNextPage,
    loadMore,
  };
}
