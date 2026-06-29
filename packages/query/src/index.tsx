import type { JSX } from "@solidjs/web";
import {
  createContext,
  createEffect,
  createMemo,
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
  enabled?: boolean | (() => boolean);
  gcTime?: number;
  placeholderData?: typeof keepPreviousData | TData | (() => TData | undefined);
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

type QueryState<TData> = {
  data: TData | undefined;
  error: Error | undefined;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  isPending: boolean;
  isPlaceholderData: boolean;
  isSuccess: boolean;
};

export interface UseQueryResult<TData> extends QueryState<TData> {
  refetch: () => Promise<void>;
  peek: () => TData | undefined;
  latest: () => TData | undefined;
}

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

const initialQueryState = <TData,>(): QueryState<TData> => ({
  data: undefined,
  error: undefined,
  isError: false,
  isFetching: false,
  isLoading: false,
  isPending: false,
  isPlaceholderData: false,
  isSuccess: false,
});

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
    placeholderData: config.placeholderData,
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

export function createInfiniteQuery<TPage, TPageParam = unknown>(
  options: () => InfiniteQueryOptions<TPage, TPageParam>,
): InfiniteQueryResult<TPage, TPageParam> {
  const [state, setState] = createSignal(
    initialInfiniteState<TPage, TPageParam>(),
    internalSignalOptions,
  );
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
  const [state, setState] = createSignal<QueryState<TData>>(
    initialQueryState<TData>(),
    internalSignalOptions,
  );
  let activeKey: string | undefined;
  let activeQueryKey: QueryKey | undefined;
  let requestId = 0;

  const fetch = async (
    nextOptions = options(),
    mode: "initial" | "refetch" = "initial",
    previous = state(),
  ) => {
    const resolvedOptions = client.withQueryDefaults(nextOptions);
    if (!isEnabled(resolvedOptions.enabled)) {
      setState({
        ...previous,
        isFetching: false,
        isLoading: false,
        isPending: false,
      });
      return;
    }

    const currentRequestId = ++requestId;
    const hasPreviousData = previous.data !== undefined;
    let failureCount = 0;

    setState({
      ...previous,
      error: undefined,
      isError: false,
      isFetching: true,
      isLoading: mode === "initial" && !hasPreviousData,
      isPending: mode === "initial" && !hasPreviousData,
    });

    while (true) {
      try {
        const data = await client.fetchQuery(resolvedOptions);
        if (currentRequestId !== requestId) return;
        setState({
          data,
          error: undefined,
          isError: false,
          isFetching: false,
          isLoading: false,
          isPending: false,
          isPlaceholderData: false,
          isSuccess: true,
        });
        return;
      } catch (error) {
        failureCount += 1;
        if (!shouldRetry(resolvedOptions.retry, failureCount, error)) {
          if (currentRequestId !== requestId) return;
          const nextError = error instanceof Error ? error : new Error(String(error));
          setState({
            ...state(),
            error: nextError,
            isError: true,
            isFetching: false,
            isLoading: false,
            isPending: false,
            isPlaceholderData: false,
            isSuccess: false,
          });
          return;
        }
      }
    }
  };

  const refetch = async () => {
    const nextOptions = options();
    activeKey = stableQueryKey(nextOptions.queryKey);
    activeQueryKey = nextOptions.queryKey;
    client.removeQueries(nextOptions.queryKey);
    await fetch(nextOptions, "refetch");
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
      if (!enabled) {
        activeKey = key;
        activeQueryKey = options.queryKey;
        setState({
          ...state(),
          isFetching: false,
          isLoading: false,
          isPending: false,
        });
        return;
      }
      if (key === activeKey) return;

      const previous = state();
      activeKey = key;
      activeQueryKey = options.queryKey;

      const placeholder =
        options.placeholderData === keepPreviousData
          ? previous.data
          : typeof options.placeholderData === "function"
            ? (options.placeholderData as () => TData | undefined)()
            : options.placeholderData;

      const nextState =
        placeholder !== undefined
          ? {
              ...initialQueryState<TData>(),
              data: placeholder as TData,
              isFetching: true,
              isPlaceholderData: true,
              isSuccess: true,
            }
          : initialQueryState<TData>();

      setState(nextState);
      void fetch(options, "initial", nextState);
    },
  );

  const unsubscribe = client.subscribe((prefix) => {
    if (activeQueryKey && (!prefix || queryKeyStartsWith(activeQueryKey, prefix))) {
      void fetch(options(), "refetch");
    }
  });
  onCleanup(unsubscribe);

  return resultProxy<UseQueryResult<TData>>(() => {
    const current = state();
    return {
      data: current.data,
      error: current.error,
      isError: current.isError,
      isFetching: current.isFetching,
      isLoading: current.isLoading,
      isPending: current.isPending,
      isPlaceholderData: current.isPlaceholderData,
      isSuccess: current.isSuccess,
      refetch,
      peek: () => current.data,
      latest: () => current.data,
    };
  });
}

export function createValueQuery<TData>(options: () => QueryOptions<TData>) {
  const client = useQueryClient();
  const [refresh, setRefresh] = createSignal(0, internalWritableOptions);
  const data = createMemo<TData>(() => {
    refresh();
    return client.fetchQuery(options());
  });

  return {
    get data() {
      return data();
    },
    refetch() {
      const query = options();
      void client.invalidateQueries(query.queryKey);
      setRefresh((value) => value + 1);
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
