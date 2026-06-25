import type { JSX } from "@solidjs/web";
import {
  createContext,
  createEffect,
  createSignal,
  Errored,
  Loading,
  onCleanup,
  untrack,
  useContext,
} from "solid-js";

export type QueryKey = readonly unknown[];
export { Errored, Loading };

export type QueryContext = {
  queryKey: QueryKey;
};

export type QueryOptions<TData> = {
  queryKey: QueryKey;
  queryFn: (context: QueryContext) => Promise<TData>;
  staleTime?: number;
};

export type QueryFactory = {
  invalidate?: () => void;
  prefix?: QueryKey;
};

export type InfiniteQueryFactory<TPage, TPageParam, TArgs extends unknown[]> = QueryFactory &
  ((...args: TArgs) => InfiniteQueryOptions<TPage, TPageParam>);

export type ValueQueryFactory<TData, TArgs extends unknown[]> = QueryFactory &
  ((...args: TArgs) => QueryOptions<TData>);

export type DefineInfiniteQueryOptions<TPage, TPageParam, TArgs extends unknown[]> = {
  key: (...args: TArgs) => QueryKey;
  prefix?: QueryKey;
  initialPageParam: TPageParam;
  queryFn: (
    context: { pageParam: TPageParam; queryKey: QueryKey },
    ...args: TArgs
  ) => Promise<TPage>;
  getNextPageParam?: (
    lastPage: TPage,
    allPages: TPage[],
    lastPageParam: TPageParam,
  ) => TPageParam | undefined;
  enabled?: boolean | (() => boolean);
  placeholderData?: unknown;
  reconcileKey?: string;
};

export type DefineQueryOptions<TData, TArgs extends unknown[]> = {
  key: (...args: TArgs) => QueryKey;
  prefix?: QueryKey;
  queryFn: (context: QueryContext, ...args: TArgs) => Promise<TData>;
  staleTime?: number;
};

export type MutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidates?: Array<QueryFactory | QueryKey>;
  onSuccess?: (data: TData, variables: TVariables) => void;
};

type QueryCacheEntry<TData> = {
  data?: TData;
  error?: unknown;
  key: QueryKey;
  promise?: Promise<TData>;
  updatedAt: number;
};

type ValueQueryState<TData> =
  | { status: "pending"; promise?: Promise<TData> }
  | { status: "success"; data: TData }
  | { status: "error"; error: unknown };

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

export function queryKey(...parts: unknown[]): QueryKey {
  return parts;
}

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

function queryKeyStartsWith(queryKey: QueryKey, prefix: QueryKey): boolean {
  if (prefix.length > queryKey.length) return false;
  return prefix.every((part, index) => Object.is(part, queryKey[index]));
}

function isQueryKey(value: QueryFactory | QueryKey): value is QueryKey {
  return Array.isArray(value);
}

function refreshableKey(key: QueryKey, refresh: number): QueryKey {
  return [...key, { refresh }];
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

export function defineInfiniteQuery<TPage, TPageParam = unknown, TArgs extends unknown[] = []>(
  config: DefineInfiniteQueryOptions<TPage, TPageParam, TArgs>,
): InfiniteQueryFactory<TPage, TPageParam, TArgs> {
  const [refresh, setRefresh] = createSignal(0);
  const factory = ((...args: TArgs) => ({
    queryKey: refreshableKey(config.key(...args), refresh()),
    queryFn: (context: { pageParam: TPageParam; queryKey: QueryKey }) =>
      config.queryFn(context, ...args),
    initialPageParam: config.initialPageParam,
    getNextPageParam: config.getNextPageParam,
    enabled: config.enabled,
    placeholderData: config.placeholderData,
  })) as InfiniteQueryFactory<TPage, TPageParam, TArgs>;

  factory.prefix = config.prefix;
  factory.invalidate = () => setRefresh((value) => value + 1);
  return factory;
}

export function defineQuery<TData, TArgs extends unknown[] = []>(
  config: DefineQueryOptions<TData, TArgs>,
): ValueQueryFactory<TData, TArgs> {
  const [refresh, setRefresh] = createSignal(0);
  const factory = ((...args: TArgs) => ({
    queryKey: refreshableKey(config.key(...args), refresh()),
    queryFn: (context: QueryContext) => config.queryFn(context, ...args),
    staleTime: config.staleTime,
  })) as ValueQueryFactory<TData, TArgs>;

  factory.prefix = config.prefix;
  factory.invalidate = () => setRefresh((value) => value + 1);
  return factory;
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

  const fetchPage = async (
    mode: "initial" | "next",
    pageParam: TPageParam,
    nextOptions = options(),
    previous = state(),
  ) => {
    if (!isEnabled(nextOptions.enabled)) return;

    const currentRequestId = ++requestId;
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
    await fetchPage("initial", nextOptions.initialPageParam, nextOptions);
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
        options: nextOptions,
      };
    },
    ({ enabled, key, options }) => {
      if (!enabled) return;
      if (key === activeKey) return;

      activeKey = key;
      const previous = initialInfiniteState<TPage, TPageParam>();
      setState(previous);
      void fetchPage("initial", options.initialPageParam, options, previous);
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

export class QueryClient {
  #cache = new Map<string, QueryCacheEntry<unknown>>();

  fetchQuery<TData>(query: QueryOptions<TData>): Promise<TData> {
    const key = stableQueryKey(query.queryKey);
    const cached = this.#cache.get(key) as QueryCacheEntry<TData> | undefined;
    const staleTime = query.staleTime ?? 0;
    const now = Date.now();

    if (cached?.data !== undefined && now - cached.updatedAt <= staleTime) {
      return Promise.resolve(cached.data);
    }

    if (cached?.promise) return cached.promise;

    const promise = query
      .queryFn({ queryKey: query.queryKey })
      .then((data) => {
        this.#cache.set(key, {
          data,
          key: query.queryKey,
          updatedAt: Date.now(),
        });
        return data;
      })
      .catch((error) => {
        this.#cache.set(key, {
          error,
          key: query.queryKey,
          updatedAt: Date.now(),
        });
        throw error;
      });

    this.#cache.set(key, {
      ...cached,
      key: query.queryKey,
      promise,
      updatedAt: cached?.updatedAt ?? 0,
    });

    return promise;
  }

  prefetchQuery<TData>(query: QueryOptions<TData>): Promise<TData> {
    return this.fetchQuery(query);
  }

  getQueryData<TData>(queryKey: QueryKey): TData | undefined {
    return this.#cache.get(stableQueryKey(queryKey))?.data as TData | undefined;
  }

  setQueryData<TData>(queryKey: QueryKey, data: TData): void {
    this.#cache.set(stableQueryKey(queryKey), {
      data,
      key: queryKey,
      updatedAt: Date.now(),
    });
  }

  invalidateQueries(prefix?: QueryKey): void {
    if (!prefix) {
      this.#cache.clear();
      return;
    }

    for (const [key, entry] of this.#cache) {
      if (queryKeyStartsWith(entry.key, prefix)) this.#cache.delete(key);
    }
  }

  mount() {}
  unmount() {}
}

const defaultQueryClient = new QueryClient();
const QueryClientContext = createContext<QueryClient>();

export function QueryClientProvider(props: { client?: QueryClient; children?: JSX.Element }) {
  return (
    <QueryClientContext value={props.client ?? defaultQueryClient}>
      {props.children}
    </QueryClientContext>
  );
}

export function useQueryClient(queryClient?: QueryClient) {
  return queryClient ?? useContext(QueryClientContext) ?? defaultQueryClient;
}

export function createValueQuery<TData>(options: () => QueryOptions<TData>) {
  const client = useQueryClient();
  const [state, setState] = createSignal<ValueQueryState<TData>>(
    { status: "pending" },
    {
      equals: false,
    },
  );
  let requestId = 0;

  const load = (query: QueryOptions<TData>) => {
    const currentRequestId = ++requestId;
    const promise = client.fetchQuery(query);

    setState({ status: "pending", promise });

    promise
      .then((data) => {
        if (currentRequestId !== requestId) return;
        setState({ status: "success", data });
      })
      .catch((error) => {
        if (currentRequestId !== requestId) return;
        setState({ status: "error", error });
      });
  };

  createEffect(
    () => options(),
    (query) => load(query),
  );

  return {
    get data() {
      const current = state();
      if (current.status === "success") return current.data;
      if (current.status === "error") throw current.error;
      if (current.promise) throw current.promise;
      throw Promise.resolve();
    },
    refetch() {
      const query = options();
      client.invalidateQueries(query.queryKey);
      load(query);
    },
  };
}

export function createMutation<TData, TVariables>(
  options: () => MutationOptions<TData, TVariables>,
) {
  const client = useQueryClient();
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal<Error>();

  const mutateAsync = async (variables: TVariables) => {
    const mutation = options();
    setPending(true);
    setError(undefined);

    try {
      const data = await mutation.mutationFn(variables);
      for (const invalidation of mutation.invalidates ?? []) {
        if (isQueryKey(invalidation)) {
          client.invalidateQueries(invalidation);
        } else {
          invalidation.invalidate?.();
          if (invalidation.prefix) client.invalidateQueries(invalidation.prefix);
        }
      }
      mutation.onSuccess?.(data, variables);
      return data;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause));
      setError(nextError);
      throw nextError;
    } finally {
      setPending(false);
    }
  };

  return {
    get error() {
      return error();
    },
    get isPending() {
      return pending();
    },
    mutateAsync,
    reset() {
      setError(undefined);
      setPending(false);
    },
  };
}

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
          if (!entries[0]?.isIntersecting || !untrack(options.canLoad)) return;

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
