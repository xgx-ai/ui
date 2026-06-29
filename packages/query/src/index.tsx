import type { JSX } from "@solidjs/web";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  Errored,
  flush,
  Loading,
  onCleanup,
  resolve,
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
  enabled?: boolean | (() => boolean);
  gcTime?: number;
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
  staleTime?: number;
  timeoutMs?: number;
};

export type QueryDefaultOptions = {
  experimental_prefetchInRender?: boolean;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  retry?: QueryOptions<unknown>["retry"];
  staleTime?: number;
  timeoutMs?: number;
};

export type MutationDefaultOptions = {
  onError?: (error: unknown) => void;
};

export type QueryClientConfig = {
  defaultOptions?: {
    mutations?: MutationDefaultOptions;
    queries?: QueryDefaultOptions;
  };
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
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | undefined, variables: TVariables) => void;
  onSuccess?: (data: TData, variables: TVariables) => void;
};

type QueryCacheEntry<TData> = {
  data?: TData;
  error?: unknown;
  key: QueryKey;
  promise?: Promise<TData>;
  updatedAt: number;
};

export interface QueryResult<TData> {
  data: () => TData;
  latest: () => TData | undefined;
  pending: () => boolean;
  refetch: () => Promise<TData>;
}

export type UseQueryResult<TData> = QueryResult<TData>;

type MutationState<TData> = {
  data: TData | undefined;
  error: Error | undefined;
  isError: boolean;
  isPending: boolean;
  isSuccess: boolean;
};

export interface UseMutationResult<TData, TVariables> extends MutationState<TData> {
  mutate: (variables?: TVariables) => void;
  mutateAsync: (variables?: TVariables) => Promise<TData>;
  reset: () => void;
}

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
}

export interface InfiniteQueryResult<TPage, TPageParam = unknown> {
  data: () => InfiniteData<TPage, TPageParam>;
  latest: () => InfiniteData<TPage, TPageParam> | undefined;
  pending: () => boolean;
  fetchingNextPage: () => boolean;
  hasNextPage: () => boolean;
  fetchNextPage: () => Promise<void>;
  refetch: () => Promise<InfiniteData<TPage, TPageParam>>;
}

const internalSignalOptions = { equals: false, ownedWrite: true } as const;
const internalWritableOptions = { ownedWrite: true } as const;

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

function normaliseQueryPrefix(input?: QueryKey | { queryKey?: QueryKey }): QueryKey | undefined {
  if (!input) return undefined;
  if (Array.isArray(input)) return input as QueryKey;
  return (input as { queryKey?: QueryKey }).queryKey;
}

function shouldRetry(
  retry: QueryOptions<unknown>["retry"],
  failureCount: number,
  error: unknown,
): boolean {
  if (typeof retry === "function") return retry(failureCount, error);
  if (typeof retry === "number") return failureCount <= retry;
  if (retry === false) return false;
  if (retry === true) return failureCount <= 3;
  return false;
}

function refreshableKey(key: QueryKey, refresh: number): QueryKey {
  return [...key, { refresh }];
}

export class QueryTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Query timed out after ${timeoutMs}ms`);
    this.name = "QueryTimeoutError";
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return promise;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new QueryTimeoutError(timeoutMs)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
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
  const [refresh, setRefresh] = createSignal(0, internalWritableOptions);
  const factory = ((...args: TArgs) => ({
    queryKey: refreshableKey(config.key(...args), refresh()),
    queryFn: (context: { pageParam: TPageParam; queryKey: QueryKey }) =>
      config.queryFn(context, ...args),
    initialPageParam: config.initialPageParam,
    getNextPageParam: config.getNextPageParam,
    enabled: config.enabled,
  })) as InfiniteQueryFactory<TPage, TPageParam, TArgs>;

  factory.prefix = config.prefix;
  factory.invalidate = () => setRefresh((value) => value + 1);
  return factory;
}

export function defineQuery<TData, TArgs extends unknown[] = []>(
  config: DefineQueryOptions<TData, TArgs>,
): ValueQueryFactory<TData, TArgs> {
  const [refresh, setRefresh] = createSignal(0, internalWritableOptions);
  const factory = ((...args: TArgs) => ({
    queryKey: refreshableKey(config.key(...args), refresh()),
    queryFn: (context: QueryContext) => config.queryFn(context, ...args),
    staleTime: config.staleTime,
  })) as ValueQueryFactory<TData, TArgs>;

  factory.prefix = config.prefix;
  factory.invalidate = () => setRefresh((value) => value + 1);
  return factory;
}

const disabledQueryPromise = <TData,>() => new Promise<TData>(() => {});

async function fetchQueryWithRetry<TData>(
  client: QueryClient,
  query: QueryOptions<TData>,
): Promise<TData> {
  const resolvedQuery = client.withQueryDefaults(query);
  let failureCount = 0;

  while (true) {
    try {
      return await client.fetchQuery(resolvedQuery);
    } catch (error) {
      failureCount += 1;
      if (!shouldRetry(resolvedQuery.retry, failureCount, error)) throw error;
    }
  }
}

export function createInfiniteQuery<TPage, TPageParam = unknown>(
  options: () => InfiniteQueryOptions<TPage, TPageParam>,
): InfiniteQueryResult<TPage, TPageParam> {
  const [refresh, setRefresh] = createSignal(0, internalWritableOptions);
  const [latestData, setLatestData] = createSignal<InfiniteData<TPage, TPageParam>>();
  const [pending, setPending] = createSignal(false, internalWritableOptions);
  const [fetchingNextPage, setFetchingNextPage] = createSignal(false, internalWritableOptions);
  const [hasNextPage, setHasNextPage] = createSignal(false, internalWritableOptions);
  const [nextPageParam, setNextPageParam] = createSignal<TPageParam>();
  let activeKey: string | undefined;
  let initialPromise: Promise<InfiniteData<TPage, TPageParam>> | undefined;
  let initialRequestId = 0;
  let nextPageRequestId = 0;

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

  const loadInitialPage = (
    pageParam: TPageParam,
    nextOptions: InfiniteQueryOptions<TPage, TPageParam>,
  ): Promise<InfiniteData<TPage, TPageParam>> => {
    const currentRequestId = ++initialRequestId;
    const requestKey = stableQueryKey(nextOptions.queryKey);
    setPending(true);
    setFetchingNextPage(false);

    const promise = Promise.resolve()
      .then(() =>
        nextOptions.queryFn({
          pageParam,
          queryKey: nextOptions.queryKey,
        }),
      )
      .then((page) => {
        if (currentRequestId !== initialRequestId || requestKey !== activeKey) {
          return latestData() ?? { pages: [], pageParams: [] };
        }

        const data = { pages: [page], pageParams: [pageParam] };
        const nextParam = computeNextPageParam(nextOptions, data);
        setLatestData(data);
        setHasNextPage(nextParam !== undefined);
        setNextPageParam(() => nextParam);
        return data;
      })
      .finally(() => {
        if (currentRequestId === initialRequestId && requestKey === activeKey) {
          setPending(false);
        }
      });

    initialPromise = promise;
    return promise;
  };

  const sourceData = createMemo<InfiniteData<TPage, TPageParam>>(() => {
    refresh();
    const nextOptions = options();
    activeKey = stableQueryKey(nextOptions.queryKey);

    if (!isEnabled(nextOptions.enabled)) {
      setPending(false);
      const current = latestData();
      if (current) {
        initialPromise = Promise.resolve(current);
        return current;
      }

      const promise = disabledQueryPromise<InfiniteData<TPage, TPageParam>>();
      initialPromise = promise;
      return promise;
    }

    return loadInitialPage(nextOptions.initialPageParam, nextOptions);
  });

  const data = () => {
    const source = sourceData();
    return latestData() ?? source;
  };

  const fetchNextPage = async () => {
    const current = latestData();
    const pageParam = nextPageParam();
    if (!current || !hasNextPage() || pageParam === undefined || pending() || fetchingNextPage())
      return;

    const nextOptions = options();
    const requestKey = stableQueryKey(nextOptions.queryKey);
    if (requestKey !== activeKey || !isEnabled(nextOptions.enabled)) return;

    const currentRequestId = ++nextPageRequestId;
    setFetchingNextPage(true);

    try {
      const page = await nextOptions.queryFn({
        pageParam,
        queryKey: nextOptions.queryKey,
      });
      if (currentRequestId !== nextPageRequestId || requestKey !== activeKey) return;

      const currentData = latestData();
      if (!currentData) return;

      const pages = [...currentData.pages, page];
      const pageParams = [...currentData.pageParams, pageParam];
      const data = { pages, pageParams };
      const nextPageParam = computeNextPageParam(nextOptions, data);
      setLatestData(data);
      setHasNextPage(nextPageParam !== undefined);
      setNextPageParam(() => nextPageParam);
    } finally {
      if (currentRequestId === nextPageRequestId && requestKey === activeKey) {
        setFetchingNextPage(false);
      }
    }
  };

  const refetch = async () => {
    setRefresh((value) => value + 1);
    flush();
    try {
      sourceData();
    } catch {
      // Initial reads suspend; the active promise is awaited below.
    }
    return initialPromise ?? resolve(data);
  };

  return {
    data,
    latest: latestData,
    pending,
    fetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  };
}

export const useInfiniteQuery = createInfiniteQuery;

export class QueryClient {
  #cache = new Map<string, QueryCacheEntry<unknown>>();
  #config: QueryClientConfig;
  #listeners = new Set<(prefix?: QueryKey) => void>();

  constructor(config: QueryClientConfig = {}) {
    this.#config = config;
  }

  fetchQuery<TData>(query: QueryOptions<TData>): Promise<TData> {
    const resolvedQuery = this.#withQueryDefaults(query);
    const key = stableQueryKey(resolvedQuery.queryKey);
    const cached = this.#cache.get(key) as QueryCacheEntry<TData> | undefined;
    const staleTime = resolvedQuery.staleTime ?? 0;
    const now = Date.now();

    if (cached?.data !== undefined && now - cached.updatedAt <= staleTime) {
      return Promise.resolve(cached.data);
    }

    if (cached?.promise) return cached.promise;

    const promise = withTimeout(
      Promise.resolve().then(() => resolvedQuery.queryFn({ queryKey: resolvedQuery.queryKey })),
      resolvedQuery.timeoutMs,
    )
      .then((data) => {
        this.#cache.set(key, {
          data,
          key: resolvedQuery.queryKey,
          updatedAt: Date.now(),
        });
        return data;
      })
      .catch((error) => {
        this.#cache.set(key, {
          error,
          key: resolvedQuery.queryKey,
          updatedAt: Date.now(),
        });
        throw error;
      });

    this.#cache.set(key, {
      ...cached,
      key: resolvedQuery.queryKey,
      promise,
      updatedAt: cached?.updatedAt ?? 0,
    });

    return promise;
  }

  withQueryDefaults<TData>(query: QueryOptions<TData>): QueryOptions<TData> {
    return this.#withQueryDefaults(query);
  }

  notifyMutationError(error: unknown): void {
    this.#config.defaultOptions?.mutations?.onError?.(error);
  }

  #withQueryDefaults<TData>(query: QueryOptions<TData>): QueryOptions<TData> {
    const defaults = this.#config.defaultOptions?.queries;
    if (!defaults) return query;
    return {
      ...query,
      gcTime: query.gcTime ?? defaults.gcTime,
      retry: query.retry ?? defaults.retry,
      staleTime: query.staleTime ?? defaults.staleTime,
      timeoutMs: query.timeoutMs ?? defaults.timeoutMs,
    };
  }

  prefetchQuery<TData>(query: QueryOptions<TData>): Promise<TData> {
    return this.fetchQuery(query);
  }

  ensureQueryData<TData>(query: QueryOptions<TData>): Promise<TData> {
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

  removeQueries(input?: QueryKey | { queryKey?: QueryKey }): void {
    const prefix = normaliseQueryPrefix(input);
    if (!prefix) {
      this.#cache.clear();
      return;
    }

    for (const [key, entry] of this.#cache) {
      if (queryKeyStartsWith(entry.key, prefix)) this.#cache.delete(key);
    }
  }

  invalidateQueries(input?: QueryKey | { queryKey?: QueryKey }): Promise<void> {
    const prefix = normaliseQueryPrefix(input);
    this.removeQueries(prefix);
    this.#notify(prefix);
    return Promise.resolve();
  }

  subscribe(listener: (prefix?: QueryKey) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify(prefix?: QueryKey): void {
    for (const listener of this.#listeners) {
      listener(prefix);
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

export function useQuery<TData>(options: () => QueryOptions<TData>): UseQueryResult<TData> {
  const client = useQueryClient();
  const [refresh, setRefresh] = createSignal(0, internalWritableOptions);
  const [latestData, setLatestData] = createSignal<TData | undefined>(
    undefined,
    internalSignalOptions,
  );
  const [pending, setPending] = createSignal(false, internalWritableOptions);
  let activeQueryKey: QueryKey | undefined;
  let requestId = 0;
  let activePromise: Promise<TData> | undefined;

  const data = createMemo<TData>(() => {
    refresh();
    const nextOptions = options();
    activeQueryKey = nextOptions.queryKey;

    if (!isEnabled(nextOptions.enabled)) {
      setPending(false);
      const current = latestData();
      if (current !== undefined) {
        activePromise = Promise.resolve(current);
        return current;
      }

      const promise = disabledQueryPromise<TData>();
      activePromise = promise;
      return promise;
    }

    const currentRequestId = ++requestId;
    setPending(true);
    const promise = fetchQueryWithRetry(client, nextOptions)
      .then((nextData) => {
        if (currentRequestId === requestId) {
          setLatestData(() => nextData);
        }
        return nextData;
      })
      .finally(() => {
        if (currentRequestId === requestId) setPending(false);
      });

    activePromise = promise;
    return promise;
  });

  const refetch = async () => {
    const nextOptions = options();
    activeQueryKey = nextOptions.queryKey;
    client.removeQueries(nextOptions.queryKey);
    setRefresh((value) => value + 1);
    flush();
    try {
      data();
    } catch {
      // Initial reads suspend; the active promise is awaited below.
    }
    return activePromise ?? resolve(data);
  };

  const unsubscribe = client.subscribe((prefix) => {
    if (activeQueryKey && (!prefix || queryKeyStartsWith(activeQueryKey, prefix))) {
      setRefresh((value) => value + 1);
    }
  });
  onCleanup(unsubscribe);

  return {
    data,
    latest: latestData,
    pending,
    refetch,
  };
}

export function createValueQuery<TData>(options: () => QueryOptions<TData>): QueryResult<TData> {
  const client = useQueryClient();
  const [refresh, setRefresh] = createSignal(0, internalWritableOptions);
  const [latestData, setLatestData] = createSignal<TData | undefined>(
    undefined,
    internalSignalOptions,
  );
  const [pending, setPending] = createSignal(false, internalWritableOptions);
  let activePromise: Promise<TData> | undefined;
  const data = createMemo<TData>(() => {
    refresh();
    const nextOptions = options();

    if (!isEnabled(nextOptions.enabled)) {
      setPending(false);
      const current = latestData();
      if (current !== undefined) {
        activePromise = Promise.resolve(current);
        return current;
      }

      const promise = disabledQueryPromise<TData>();
      activePromise = promise;
      return promise;
    }

    setPending(true);
    const promise = fetchQueryWithRetry(client, nextOptions)
      .then((nextData) => {
        setLatestData(() => nextData);
        return nextData;
      })
      .finally(() => setPending(false));
    activePromise = promise;
    return promise;
  });

  return {
    data,
    latest: latestData,
    pending,
    refetch: async () => {
      const query = options();
      void client.invalidateQueries(query.queryKey);
      setRefresh((value) => value + 1);
      flush();
      try {
        data();
      } catch {
        // Initial reads suspend; the active promise is awaited below.
      }
      return activePromise ?? resolve(data);
    },
  };
}

export function createMutation<TData, TVariables>(
  options: () => MutationOptions<TData, TVariables>,
): UseMutationResult<TData, TVariables> {
  const client = useQueryClient();
  const [state, setState] = createSignal<MutationState<TData>>(
    {
      data: undefined,
      error: undefined,
      isError: false,
      isPending: false,
      isSuccess: false,
    },
    internalSignalOptions,
  );

  const mutateAsync = async (variables?: TVariables) => {
    const resolvedVariables = variables as TVariables;
    const mutation = options();
    setState({
      data: undefined,
      error: undefined,
      isError: false,
      isPending: true,
      isSuccess: false,
    });

    try {
      const data = await mutation.mutationFn(resolvedVariables);
      for (const invalidation of mutation.invalidates ?? []) {
        if (isQueryKey(invalidation)) {
          void client.invalidateQueries(invalidation);
        } else {
          invalidation.invalidate?.();
          if (invalidation.prefix) void client.invalidateQueries(invalidation.prefix);
        }
      }
      mutation.onSuccess?.(data, resolvedVariables);
      mutation.onSettled?.(data, undefined, resolvedVariables);
      setState({
        data,
        error: undefined,
        isError: false,
        isPending: false,
        isSuccess: true,
      });
      return data;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause));
      client.notifyMutationError(nextError);
      mutation.onError?.(nextError, resolvedVariables);
      mutation.onSettled?.(undefined, nextError, resolvedVariables);
      setState({
        data: undefined,
        error: nextError,
        isError: true,
        isPending: false,
        isSuccess: false,
      });
      throw nextError;
    }
  };

  return resultProxy<UseMutationResult<TData, TVariables>>(() => {
    const current = state();
    return {
      data: current.data,
      error: current.error,
      isError: current.isError,
      isPending: current.isPending,
      isSuccess: current.isSuccess,
      mutate: (variables?: TVariables) => {
        void mutateAsync(variables).catch(() => {});
      },
      mutateAsync,
      reset() {
        setState({
          data: undefined,
          error: undefined,
          isError: false,
          isPending: false,
          isSuccess: false,
        });
      },
    };
  });
}

export const useMutation = createMutation;

export function createQuery<TData>(options: () => QueryOptions<TData>): UseQueryResult<TData> {
  return useQuery(options);
}

export function queryOptions<TData>(options: QueryOptions<TData>): QueryOptions<TData> {
  return options;
}

export function mutationOptions<TData, TVariables>(
  options: MutationOptions<TData, TVariables>,
): MutationOptions<TData, TVariables> {
  return options;
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
  const [element, setElement] = createSignal<HTMLElement | null>(null, internalWritableOptions);
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
