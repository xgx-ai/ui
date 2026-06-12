import type { JSX } from "@solidjs/web";
import { createEffect, createSignal, onCleanup } from "solid-js";

export type QueryKey = readonly unknown[];

export interface InfiniteData<TPage, TPageParam = unknown> {
  pages: TPage[];
  pageParams: TPageParam[];
}

export interface InfiniteQueryOptions<TPage, TPageParam = unknown> {
  queryKey: QueryKey;
  queryFn: (context: { pageParam: TPageParam; queryKey: QueryKey }) => Promise<TPage>;
  initialPageParam: TPageParam;
  getNextPageParam?: (
    lastPage: TPage,
    allPages: TPage[],
    lastPageParam: TPageParam,
  ) => TPageParam | undefined;
  enabled?: boolean | (() => boolean);
  placeholderData?: unknown;
}

export interface InfiniteQueryResult<TPage, TPageParam = unknown> {
  data: InfiniteData<TPage, TPageParam> | undefined;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isPending: boolean;
  isSuccess: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<void>;
  refetch: () => Promise<void>;
  peek: () => InfiniteData<TPage, TPageParam> | undefined;
  latest: () => InfiniteData<TPage, TPageParam>;
}

type InfiniteQueryState<TPage, TPageParam> = {
  data: InfiniteData<TPage, TPageParam> | undefined;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isPending: boolean;
  isSuccess: boolean;
  hasNextPage: boolean;
  nextPageParam: TPageParam | undefined;
};

const initialInfiniteState = <TPage, TPageParam>(): InfiniteQueryState<TPage, TPageParam> => ({
  data: undefined,
  error: undefined,
  isError: false,
  isFetching: false,
  isFetchingNextPage: false,
  isLoading: false,
  isPending: false,
  isSuccess: false,
  hasNextPage: false,
  nextPageParam: undefined,
});

export const keepPreviousData = Symbol("keepPreviousData");

function stableQueryKey(queryKey: QueryKey): string {
  try {
    return JSON.stringify(queryKey);
  } catch {
    return queryKey.map(String).join("|");
  }
}

function isEnabled(value: boolean | (() => boolean) | undefined): boolean {
  return typeof value === "function" ? value() : (value ?? true);
}

function resultProxy<TResult extends object>(read: () => TResult): TResult {
  return new Proxy({} as TResult, {
    get(_, key) {
      const value = (read() as Record<PropertyKey, unknown>)[key];
      return typeof value === "function" ? value.bind(read()) : value;
    },
    has(_, key) {
      return key in read();
    },
    ownKeys() {
      return Reflect.ownKeys(read());
    },
    getOwnPropertyDescriptor(_, key) {
      const descriptor = Object.getOwnPropertyDescriptor(read(), key);
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
  });
}

export function createInfiniteQuery<TPage, TPageParam = unknown>(
  options: () => InfiniteQueryOptions<TPage, TPageParam>,
): InfiniteQueryResult<TPage, TPageParam> {
  const [state, setState] = createSignal(initialInfiniteState<TPage, TPageParam>(), {
    equals: false,
  });
  let activeKey: string | undefined;
  let requestId = 0;

  const computeNextPageParam = (
    nextOptions: InfiniteQueryOptions<TPage, TPageParam>,
    data: InfiniteData<TPage, TPageParam>,
  ) => {
    const lastPage = data.pages.at(-1);
    const lastPageParam = data.pageParams.at(-1);

    if (lastPage === undefined || lastPageParam === undefined || !nextOptions.getNextPageParam) {
      return undefined;
    }

    return nextOptions.getNextPageParam(lastPage, data.pages, lastPageParam);
  };

  const fetchPage = async (mode: "initial" | "next", pageParam: TPageParam) => {
    const nextOptions = options();
    if (!isEnabled(nextOptions.enabled)) return;

    const currentRequestId = ++requestId;
    const previous = state();
    const previousData = mode === "next" ? previous.data : undefined;

    setState({
      ...previous,
      data: previousData,
      error: undefined,
      isError: false,
      isFetching: true,
      isFetchingNextPage: mode === "next",
      isLoading: mode === "initial" && !previousData,
      isPending: true,
    });

    try {
      const page = await nextOptions.queryFn({
        pageParam,
        queryKey: nextOptions.queryKey,
      });
      if (currentRequestId !== requestId) return;

      const pages = mode === "next" && previousData ? [...previousData.pages, page] : [page];
      const pageParams =
        mode === "next" && previousData ? [...previousData.pageParams, pageParam] : [pageParam];
      const data = { pages, pageParams };
      const nextPageParam = computeNextPageParam(nextOptions, data);

      setState({
        data,
        error: undefined,
        isError: false,
        isFetching: false,
        isFetchingNextPage: false,
        isLoading: false,
        isPending: false,
        isSuccess: true,
        hasNextPage: nextPageParam !== undefined,
        nextPageParam,
      });
    } catch (error) {
      if (currentRequestId !== requestId) return;
      setState({
        ...state(),
        error,
        isError: true,
        isFetching: false,
        isFetchingNextPage: false,
        isLoading: false,
        isPending: false,
        isSuccess: false,
        hasNextPage: false,
        nextPageParam: undefined,
      });
    }
  };

  const refetch = async () => {
    const nextOptions = options();
    activeKey = stableQueryKey(nextOptions.queryKey);
    await fetchPage("initial", nextOptions.initialPageParam);
  };

  const fetchNextPage = async () => {
    const current = state();
    if (!current.hasNextPage || current.nextPageParam === undefined || current.isFetching) return;
    await fetchPage("next", current.nextPageParam);
  };

  createEffect(
    () => {
      const nextOptions = options();
      return {
        enabled: isEnabled(nextOptions.enabled),
        key: stableQueryKey(nextOptions.queryKey),
      };
    },
    ({ enabled, key }) => {
      if (!enabled) return;
      if (key === activeKey && state().data) return;

      activeKey = key;
      requestId += 1;
      setState(initialInfiniteState<TPage, TPageParam>());
      void fetchPage("initial", options().initialPageParam);
    },
  );

  return resultProxy<InfiniteQueryResult<TPage, TPageParam>>(() => {
    const current = state();
    return {
      data: current.data,
      error: current.error,
      isError: current.isError,
      isFetching: current.isFetching,
      isFetchingNextPage: current.isFetchingNextPage,
      isLoading: current.isLoading,
      isPending: current.isPending,
      isSuccess: current.isSuccess,
      hasNextPage: current.hasNextPage,
      fetchNextPage,
      refetch,
      peek: () => current.data,
      latest: () => current.data ?? { pages: [], pageParams: [] },
    };
  });
}

export const useInfiniteQuery = createInfiniteQuery;

export interface IntersectionLoaderOptions {
  canLoad: () => boolean;
  enabled?: () => boolean;
  load: () => void;
  loadDelay?: number;
  rootMargin?: string;
  threshold?: number;
}

export function createIntersectionLoader(options: IntersectionLoaderOptions) {
  const [element, setElement] = createSignal<HTMLElement>();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  createEffect(
    () => ({
      canLoad: options.canLoad(),
      element: element(),
      enabled: options.enabled?.() ?? true,
    }),
    (state) => {
      if (!state.element || !state.enabled) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries[0]?.isIntersecting || !options.canLoad()) return;

          if (options.loadDelay) {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(options.load, options.loadDelay);
          } else {
            options.load();
          }
        },
        {
          rootMargin: options.rootMargin,
          threshold: options.threshold ?? 0,
        },
      );

      observer.observe(state.element);

      return () => {
        observer.disconnect();
        if (timeout) clearTimeout(timeout);
      };
    },
  );

  onCleanup(() => {
    if (timeout) clearTimeout(timeout);
  });

  return {
    ref: (node: HTMLElement) => setElement(node),
  };
}

export class QueryClient {
  mount() {}
  unmount() {}
}

export function QueryClientProvider(props: { client?: QueryClient; children?: JSX.Element }) {
  return <>{props.children}</>;
}

export function useQueryClient(queryClient?: QueryClient) {
  return queryClient ?? new QueryClient();
}
