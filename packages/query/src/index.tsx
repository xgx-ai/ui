import type { JSX } from "@solidjs/web";
import {
  type Accessor,
  action,
  affects,
  createContext,
  createEffect,
  createMemo,
  createOptimistic,
  createRoot,
  createSignal,
  createStore,
  Errored,
  isPending,
  Loading,
  onCleanup,
  onSettled,
  refresh,
  runWithOwner,
  type SourceAccessor,
  untrack,
  useContext,
} from "solid-js";

export type QueryKey = readonly unknown[];
export { Errored, Loading };

export type QueryContext = {
  queryKey: QueryKey;
  signal: AbortSignal;
};

type RetryOption = boolean | number | ((failureCount: number, error: unknown) => boolean);
type RetryDelayOption = number | ((failureCount: number, error: unknown) => number);
type MaybePromise<T> = T | Promise<T>;

export type QueryOptions<TData> = {
  queryKey: QueryKey;
  queryFn: (context: QueryContext) => Promise<TData>;
  enabled?: boolean | (() => boolean);
  gcTime?: number;
  refetchOnReconnect?: boolean;
  refetchOnWindowFocus?: boolean;
  retry?: RetryOption;
  retryDelay?: RetryDelayOption;
  staleTime?: number;
  timeoutMs?: number;
};

export type QueryDefaultOptions = {
  gcTime?: number;
  refetchOnReconnect?: boolean;
  refetchOnWindowFocus?: boolean;
  retry?: RetryOption;
  retryDelay?: RetryDelayOption;
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
  prefix: QueryKey;
};

export type InfiniteQueryFactory<TPage, TPageParam, TArgs extends unknown[]> = QueryFactory &
  ((...args: TArgs) => InfiniteQueryOptions<TPage, TPageParam>);

export type ValueQueryFactory<TData, TArgs extends unknown[]> = QueryFactory &
  ((...args: TArgs) => QueryOptions<TData>);

type SharedDefineQueryOptions = {
  gcTime?: number;
  refetchOnReconnect?: boolean;
  refetchOnWindowFocus?: boolean;
  retry?: RetryOption;
  retryDelay?: RetryDelayOption;
  staleTime?: number;
  timeoutMs?: number;
};

export type DefineInfiniteQueryOptions<
  TPage,
  TPageParam,
  TArgs extends unknown[],
> = SharedDefineQueryOptions & {
  key: (...args: TArgs) => QueryKey;
  prefix: QueryKey;
  initialPageParam: TPageParam;
  queryFn: (
    context: { pageParam: TPageParam; queryKey: QueryKey; signal: AbortSignal },
    ...args: TArgs
  ) => Promise<TPage>;
  getNextPageParam?: (
    lastPage: TPage,
    allPages: TPage[],
    lastPageParam: TPageParam,
  ) => TPageParam | undefined;
  enabled?: boolean | (() => boolean);
};

export type DefineQueryOptions<TData, TArgs extends unknown[]> = SharedDefineQueryOptions & {
  key: (...args: TArgs) => QueryKey;
  prefix: QueryKey;
  queryFn: (context: QueryContext, ...args: TArgs) => Promise<TData>;
  enabled?: boolean | (() => boolean);
};

export type MutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidates?: Array<QueryFactory | QueryKey>;
  onError?: (error: Error, variables: TVariables) => MaybePromise<unknown>;
  onSettled?: (
    data: TData | undefined,
    error: Error | undefined,
    variables: TVariables,
  ) => MaybePromise<unknown>;
  onSuccess?: (data: TData, variables: TVariables) => MaybePromise<unknown>;
};

export interface QueryResult<TData> {
  /** The current authoritative value. Initial reads participate in `Loading`. */
  data: SourceAccessor<TData>;
  /** The last value resolved by this query instance, without suspending. */
  latest: Accessor<TData | undefined>;
  /** The cached value for the current key, without stale data from a previous key. */
  cached: Accessor<TData | undefined>;
  /** Whether the current key has cached data. */
  hasData: Accessor<boolean>;
  /** Solid's question-scoped pending verdict for `data`. */
  pending: Accessor<boolean>;
  /** Whether a request is executing, including quiet background work. */
  fetching: Accessor<boolean>;
  /** Whether the first request for the current key is executing. */
  loading: Accessor<boolean>;
  /** Whether a request is executing while current-key data remains available. */
  refetching: Accessor<boolean>;
  /** A quiet background refresh that does not declare a value change. */
  refresh: () => Promise<TData>;
  /** A declared, user-visible refetch. */
  refetch: () => Promise<TData>;
}

export type UseQueryResult<TData> = QueryResult<TData>;

type MutationState<TData> = {
  data: TData | undefined;
  error: Error | undefined;
  isError: boolean;
  isSuccess: boolean;
};

export interface UseMutationResult<TData, TVariables> extends MutationState<TData> {
  isPending: boolean;
  mutate: (variables?: TVariables) => void;
  mutateAsync: (variables?: TVariables) => Promise<TData>;
  reset: () => void;
}

export interface InfiniteData<TPage, TPageParam = unknown> {
  pages: TPage[];
  pageParams: TPageParam[];
}

export interface InfiniteQueryOptions<TPage, TPageParam = unknown>
  extends SharedDefineQueryOptions {
  queryKey: QueryKey;
  queryFn: (context: {
    pageParam: TPageParam;
    queryKey: QueryKey;
    signal: AbortSignal;
  }) => Promise<TPage>;
  initialPageParam: TPageParam;
  getNextPageParam?: (
    lastPage: TPage,
    allPages: TPage[],
    lastPageParam: TPageParam,
  ) => TPageParam | undefined;
  enabled?: boolean | (() => boolean);
}

export interface InfiniteQueryResult<TPage, TPageParam = unknown> {
  data: SourceAccessor<InfiniteData<TPage, TPageParam>>;
  latest: Accessor<InfiniteData<TPage, TPageParam> | undefined>;
  pending: Accessor<boolean>;
  fetching: Accessor<boolean>;
  loading: Accessor<boolean>;
  refetching: Accessor<boolean>;
  fetchingNextPage: Accessor<boolean>;
  hasNextPage: Accessor<boolean>;
  fetchNextPage: () => Promise<void>;
  refresh: () => Promise<InfiniteData<TPage, TPageParam>>;
  refetch: () => Promise<InfiniteData<TPage, TPageParam>>;
}

type PreparedQuery<TData> = QueryOptions<TData> & {
  hash: string;
};

type InternalSetter<T> = (value: T | ((previous: T) => T)) => T;

type QueryCacheEntry = {
  controller?: AbortController;
  data: Accessor<unknown>;
  dispose: () => void;
  error?: unknown;
  fetching: Accessor<boolean>;
  gcTime: number;
  gcTimer?: ReturnType<typeof setTimeout>;
  hasData: Accessor<boolean>;
  hash: string;
  invalidationVersion: number;
  key: QueryKey;
  options?: PreparedQuery<unknown>;
  promise?: Promise<unknown>;
  requestId: number;
  setData: InternalSetter<unknown>;
  setFetching: InternalSetter<boolean>;
  setHasData: InternalSetter<boolean>;
  sources: Map<SourceAccessor<unknown>, boolean>;
  stale: boolean;
  staleTimer?: ReturnType<typeof setTimeout>;
  updatedAt: number;
};

const DEFAULT_GC_TIME = 5 * 60_000;
const disabledQueryPromise = new Promise<never>(() => {});
const internalWritableOptions = { ownedWrite: true } as const;

export function queryKey(...parts: unknown[]): QueryKey {
  return parts;
}

function serialiseQueryKeyPart(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "undefined":
      return "undefined";
    case "boolean":
      return value ? "boolean:true" : "boolean:false";
    case "number":
      if (Number.isNaN(value)) return "number:NaN";
      if (Object.is(value, -0)) return "number:-0";
      return `number:${value}`;
    case "bigint":
      return `bigint:${value}`;
    case "string":
      return `string:${JSON.stringify(value)}`;
    case "function":
    case "symbol":
      throw new TypeError("Query keys must contain serialisable values.");
    case "object": {
      if (seen.has(value)) throw new TypeError("Query keys cannot contain circular values.");
      seen.add(value);

      let result: string;
      if (Array.isArray(value)) {
        result = `[${value.map((item) => serialiseQueryKeyPart(item, seen)).join(",")}]`;
      } else if (value instanceof Date) {
        result = `date:${value.toISOString()}`;
      } else {
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) {
          throw new TypeError("Query keys may only contain arrays, dates, and plain objects.");
        }
        const record = value as Record<string, unknown>;
        const body = Object.keys(record)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${serialiseQueryKeyPart(record[key], seen)}`)
          .join(",");
        result = `{${body}}`;
      }

      seen.delete(value);
      return result;
    }
  }

  throw new TypeError("Unsupported query key value.");
}

function stableQueryKey(key: QueryKey): string {
  return serialiseQueryKeyPart(key);
}

function queryKeyStartsWith(key: QueryKey, prefix: QueryKey): boolean {
  if (prefix.length > key.length) return false;
  return prefix.every(
    (part, index) => serialiseQueryKeyPart(part) === serialiseQueryKeyPart(key[index]),
  );
}

function isEnabled(value: boolean | (() => boolean) | undefined): boolean {
  return typeof value === "function" ? value() : (value ?? true);
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
  retry: RetryOption | undefined,
  failureCount: number,
  error: unknown,
): boolean {
  if (typeof retry === "function") return retry(failureCount, error);
  if (typeof retry === "number") return failureCount <= retry;
  if (retry === true) return failureCount <= 3;
  return false;
}

function retryDelay(delay: RetryDelayOption | undefined, failureCount: number, error: unknown) {
  if (typeof delay === "function") return Math.max(0, delay(failureCount, error));
  if (typeof delay === "number") return Math.max(0, delay);
  return Math.min(1_000 * 2 ** Math.max(0, failureCount - 1), 30_000);
}

export class QueryTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Query timed out after ${timeoutMs}ms`);
    this.name = "QueryTimeoutError";
  }
}

export class QueryCancelledError extends Error {
  constructor() {
    super("Query was cancelled");
    this.name = "QueryCancelledError";
  }
}

export class QueryDisabledError extends Error {
  constructor() {
    super("Cannot refetch a disabled query without cached data");
    this.name = "QueryDisabledError";
  }
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new QueryCancelledError();
}

function waitForRetry(delay: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolveWait, reject) => {
    if (signal.aborted) {
      reject(abortReason(signal));
      return;
    }

    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolveWait();
    }, delay);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(abortReason(signal));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function runQueryAttempt<TData>(
  query: PreparedQuery<TData>,
  controller: AbortController,
): Promise<TData> {
  const signal = controller.signal;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let removeAbortListener = () => {};

  const aborted = new Promise<TData>((_, reject) => {
    const onAbort = () => reject(abortReason(signal));
    if (signal.aborted) onAbort();
    else {
      signal.addEventListener("abort", onAbort, { once: true });
      removeAbortListener = () => signal.removeEventListener("abort", onAbort);
    }
  });

  if (query.timeoutMs && query.timeoutMs > 0) {
    timeout = setTimeout(() => {
      controller.abort(new QueryTimeoutError(query.timeoutMs!));
    }, query.timeoutMs);
  }

  const request = Promise.resolve().then(() => query.queryFn({ queryKey: query.queryKey, signal }));

  return Promise.race([request, aborted]).finally(() => {
    removeAbortListener();
    if (timeout) clearTimeout(timeout);
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
  const factory = ((...args: TArgs) => ({
    queryKey: config.key(...args),
    queryFn: (context: { pageParam: TPageParam; queryKey: QueryKey; signal: AbortSignal }) =>
      config.queryFn(context, ...args),
    initialPageParam: config.initialPageParam,
    getNextPageParam: config.getNextPageParam,
    enabled: config.enabled,
    gcTime: config.gcTime,
    refetchOnReconnect: config.refetchOnReconnect,
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    retry: config.retry,
    retryDelay: config.retryDelay,
    staleTime: config.staleTime,
    timeoutMs: config.timeoutMs,
  })) as InfiniteQueryFactory<TPage, TPageParam, TArgs>;

  factory.prefix = config.prefix;
  return factory;
}

export function defineQuery<TData, TArgs extends unknown[] = []>(
  config: DefineQueryOptions<TData, TArgs>,
): ValueQueryFactory<TData, TArgs> {
  const factory = ((...args: TArgs) => ({
    queryKey: config.key(...args),
    queryFn: (context: QueryContext) => config.queryFn(context, ...args),
    enabled: config.enabled,
    gcTime: config.gcTime,
    refetchOnReconnect: config.refetchOnReconnect,
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    retry: config.retry,
    retryDelay: config.retryDelay,
    staleTime: config.staleTime,
    timeoutMs: config.timeoutMs,
  })) as ValueQueryFactory<TData, TArgs>;

  factory.prefix = config.prefix;
  return factory;
}

export class QueryClient {
  #cache = new Map<string, QueryCacheEntry>();
  #config: QueryClientConfig;
  #mountCount = 0;
  #onFocus = () => {
    void this.#refreshStaleQueries("focus").catch(() => {});
  };
  #onOnline = () => {
    void this.#refreshStaleQueries("reconnect").catch(() => {});
  };

  constructor(config: QueryClientConfig = {}) {
    this.#config = config;
  }

  prepareQuery<TData>(query: QueryOptions<TData>): PreparedQuery<TData> {
    const defaults = this.#config.defaultOptions?.queries;
    const resolved = defaults
      ? {
          ...query,
          gcTime: query.gcTime ?? defaults.gcTime,
          refetchOnReconnect: query.refetchOnReconnect ?? defaults.refetchOnReconnect,
          refetchOnWindowFocus: query.refetchOnWindowFocus ?? defaults.refetchOnWindowFocus,
          retry: query.retry ?? defaults.retry,
          retryDelay: query.retryDelay ?? defaults.retryDelay,
          staleTime: query.staleTime ?? defaults.staleTime,
          timeoutMs: query.timeoutMs ?? defaults.timeoutMs,
        }
      : query;

    return { ...resolved, hash: stableQueryKey(resolved.queryKey) };
  }

  getOrCreateEntry<TData>(query: PreparedQuery<TData>): QueryCacheEntry {
    const existing = this.#cache.get(query.hash);
    if (existing) {
      const previousStaleTime = existing.options?.staleTime ?? 0;
      const nextStaleTime = query.staleTime ?? 0;
      existing.key = query.queryKey;
      existing.options = query as PreparedQuery<unknown>;
      existing.gcTime = query.gcTime ?? existing.gcTime;
      if (existing.hasData() && !existing.stale && previousStaleTime !== nextStaleTime) {
        if (nextStaleTime === Number.POSITIVE_INFINITY) {
          if (existing.staleTimer) clearTimeout(existing.staleTimer);
          existing.staleTimer = undefined;
        } else {
          const remaining = nextStaleTime - (Date.now() - existing.updatedAt);
          if (remaining <= 0) {
            if (existing.staleTimer) clearTimeout(existing.staleTimer);
            existing.staleTimer = undefined;
            existing.stale = true;
          } else {
            this.#scheduleStale(existing, remaining);
          }
        }
      }
      return existing;
    }

    const entry = runWithOwner(null, () =>
      createRoot((dispose) => {
        const [data, setData] = createSignal<unknown>(undefined, internalWritableOptions);
        const [hasData, setHasData] = createSignal(false, internalWritableOptions);
        const [fetching, setFetching] = createSignal(false, internalWritableOptions);

        return {
          data,
          dispose,
          fetching,
          gcTime: query.gcTime ?? this.#config.defaultOptions?.queries?.gcTime ?? DEFAULT_GC_TIME,
          hasData,
          hash: query.hash,
          invalidationVersion: 0,
          key: query.queryKey,
          options: query as PreparedQuery<unknown>,
          requestId: 0,
          setData,
          setFetching,
          setHasData,
          sources: new Map(),
          stale: true,
          updatedAt: 0,
        } satisfies QueryCacheEntry;
      }),
    );

    this.#cache.set(query.hash, entry);
    return entry;
  }

  readQuery<TData>(query: PreparedQuery<TData>): TData | Promise<TData> {
    const entry = this.getOrCreateEntry(query);
    if (entry.hasData()) {
      if (entry.stale && !entry.promise) {
        void this.#startFetch(entry, query).catch(() => undefined);
      }
      return entry.data() as TData;
    }
    if (entry.promise) return entry.promise as Promise<TData>;
    return this.#startFetch(entry, query);
  }

  fetchQuery<TData>(query: QueryOptions<TData>): Promise<TData> {
    const prepared = this.prepareQuery(query);
    const entry = this.getOrCreateEntry(prepared);
    if (entry.hasData() && !entry.stale) return Promise.resolve(entry.data() as TData);
    if (entry.promise) return entry.promise as Promise<TData>;
    return this.#startFetch(entry, prepared);
  }

  withQueryDefaults<TData>(query: QueryOptions<TData>): QueryOptions<TData> {
    const { hash: _, ...resolved } = this.prepareQuery(query);
    return resolved;
  }

  notifyMutationError(error: unknown): void {
    this.#config.defaultOptions?.mutations?.onError?.(error);
  }

  prefetchQuery<TData>(query: QueryOptions<TData>): Promise<TData> {
    return this.fetchQuery(query);
  }

  refetchQuery<TData>(query: QueryOptions<TData>): Promise<TData> {
    const prepared = this.prepareQuery(query);
    const entry = this.getOrCreateEntry(prepared);
    entry.invalidationVersion += 1;
    entry.stale = true;
    if (entry.staleTimer) {
      clearTimeout(entry.staleTimer);
      entry.staleTimer = undefined;
    }
    this.#cancelEntry(entry);

    const request = this.#startFetch(entry, prepared);
    for (const source of this.#activeSources(entry)) refresh(source);
    return request;
  }

  ensureQueryData<TData>(query: QueryOptions<TData>): Promise<TData> {
    return this.fetchQuery(query);
  }

  getQueryData<TData>(queryKey: QueryKey): TData | undefined {
    const entry = this.#cache.get(stableQueryKey(queryKey));
    return entry?.hasData() ? (entry.data() as TData) : undefined;
  }

  setQueryData<TData>(queryKey: QueryKey, data: TData): void {
    const hash = stableQueryKey(queryKey);
    const entry =
      this.#cache.get(hash) ??
      this.getOrCreateEntry({
        hash,
        queryKey,
        queryFn: () => Promise.resolve(data),
      });

    entry.setData(() => data);
    entry.setHasData(true);
    entry.error = undefined;
    entry.stale = false;
    entry.updatedAt = Date.now();
    this.#scheduleStale(entry, entry.options?.staleTime);
    for (const [source, enabled] of entry.sources) {
      if (enabled) refresh(source);
    }
    this.#scheduleGc(entry);
  }

  removeQueries(input?: QueryKey | { queryKey?: QueryKey }): void {
    const prefix = normaliseQueryPrefix(input);
    for (const entry of this.#matchingEntries(prefix)) {
      const activeSources = this.#activeSources(entry);
      if (activeSources.length === 0) {
        this.#deleteEntry(entry);
        continue;
      }

      entry.invalidationVersion += 1;
      entry.stale = true;
      entry.setData(undefined);
      entry.setHasData(false);
      this.#cancelEntry(entry);
      for (const source of activeSources) refresh(source);
    }
  }

  invalidateQueries(input?: QueryKey | { queryKey?: QueryKey }): Promise<void> {
    return this.invalidateQueriesMany([normaliseQueryPrefix(input)]);
  }

  invalidateQueriesMany(prefixes: Array<QueryKey | undefined>): Promise<void> {
    const entries = new Set<QueryCacheEntry>();
    for (const entry of this.#cache.values()) {
      if (prefixes.some((prefix) => !prefix || queryKeyStartsWith(entry.key, prefix))) {
        entries.add(entry);
      }
    }
    return this.#invalidateEntries(entries).then(() => undefined);
  }

  affectQueriesMany(prefixes: QueryKey[]): void {
    for (const entry of this.#cache.values()) {
      if (!prefixes.some((prefix) => queryKeyStartsWith(entry.key, prefix))) continue;
      for (const source of this.#activeSources(entry)) affects(source);
    }
  }

  affectEntry(entry: QueryCacheEntry, fallbackSource?: SourceAccessor<unknown>): void {
    const sources = this.#activeSources(entry);
    if (fallbackSource && !sources.includes(fallbackSource)) sources.push(fallbackSource);
    for (const source of sources) affects(source);
  }

  refreshEntry<TData>(
    entry: QueryCacheEntry,
    fallbackSource?: SourceAccessor<unknown>,
  ): Promise<TData> {
    return this.#invalidateEntries(new Set([entry]), fallbackSource, true).then(
      (values) => values[0] as TData,
    );
  }

  observe(entry: QueryCacheEntry, source: SourceAccessor<unknown>, enabled: boolean): () => void {
    if (entry.gcTimer) {
      clearTimeout(entry.gcTimer);
      entry.gcTimer = undefined;
    }
    entry.sources.set(source, enabled);

    return () => {
      entry.sources.delete(source);
      this.#scheduleGc(entry);
    };
  }

  mount(): void {
    this.#mountCount += 1;
    if (this.#mountCount !== 1 || typeof window === "undefined") return;
    window.addEventListener("focus", this.#onFocus);
    window.addEventListener("online", this.#onOnline);
  }

  unmount(): void {
    this.#mountCount = Math.max(0, this.#mountCount - 1);
    if (this.#mountCount !== 0 || typeof window === "undefined") return;
    window.removeEventListener("focus", this.#onFocus);
    window.removeEventListener("online", this.#onOnline);
  }

  #startFetch<TData>(entry: QueryCacheEntry, query: PreparedQuery<TData>): Promise<TData> {
    const requestId = ++entry.requestId;
    const invalidationVersion = entry.invalidationVersion;
    const controller = new AbortController();
    entry.controller = controller;
    entry.options = query as PreparedQuery<unknown>;
    entry.gcTime = query.gcTime ?? entry.gcTime;
    entry.setFetching(true);

    const promise = (async () => {
      let failureCount = 0;
      while (true) {
        try {
          return await runQueryAttempt(query, controller);
        } catch (error) {
          if (controller.signal.aborted || error instanceof QueryTimeoutError) throw error;
          failureCount += 1;
          if (!shouldRetry(query.retry, failureCount, error)) throw error;
          await waitForRetry(retryDelay(query.retryDelay, failureCount, error), controller.signal);
        }
      }
    })()
      .then((data) => {
        if (requestId === entry.requestId) {
          entry.setData(() => data);
          entry.setHasData(true);
          entry.error = undefined;
          entry.stale = invalidationVersion !== entry.invalidationVersion;
          entry.updatedAt = Date.now();
          this.#scheduleStale(entry, query.staleTime);
        }
        return data;
      })
      .catch((error) => {
        if (requestId === entry.requestId) entry.error = error;
        throw error;
      })
      .finally(() => {
        if (requestId === entry.requestId) {
          entry.promise = undefined;
          entry.controller = undefined;
          entry.setFetching(false);
          this.#scheduleGc(entry);
        }
      });

    entry.promise = promise;
    return promise;
  }

  #activeSources(entry: QueryCacheEntry): SourceAccessor<unknown>[] {
    const sources: SourceAccessor<unknown>[] = [];
    for (const [source, enabled] of entry.sources) {
      if (enabled) sources.push(source);
    }
    return sources;
  }

  #cancelEntry(entry: QueryCacheEntry): void {
    if (!entry.controller) return;
    entry.requestId += 1;
    entry.promise = undefined;
    entry.controller.abort(new QueryCancelledError());
    entry.controller = undefined;
  }

  #invalidateEntries(
    entries: Set<QueryCacheEntry>,
    fallbackSource?: SourceAccessor<unknown>,
    throwOnError = false,
  ): Promise<unknown[]> {
    const pending: Promise<unknown>[] = [];

    for (const entry of entries) {
      entry.invalidationVersion += 1;
      entry.stale = true;
      if (entry.staleTimer) {
        clearTimeout(entry.staleTimer);
        entry.staleTimer = undefined;
      }
      const activeSources = this.#activeSources(entry);
      if (fallbackSource && entries.size === 1 && !activeSources.includes(fallbackSource)) {
        activeSources.push(fallbackSource);
      }
      if (activeSources.length === 0) continue;

      this.#cancelEntry(entry);
      if (entry.options) pending.push(this.#startFetch(entry, entry.options));
      for (const source of activeSources) refresh(source);
    }

    return throwOnError
      ? Promise.all(pending)
      : Promise.allSettled(pending).then((results) =>
          results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : [])),
        );
  }

  #matchingEntries(prefix?: QueryKey): QueryCacheEntry[] {
    return [...this.#cache.values()].filter(
      (entry) => !prefix || queryKeyStartsWith(entry.key, prefix),
    );
  }

  #scheduleGc(entry: QueryCacheEntry): void {
    if (entry.sources.size > 0 || entry.promise || entry.gcTimer) return;
    if (entry.gcTime === Number.POSITIVE_INFINITY) return;

    entry.gcTimer = setTimeout(
      () => {
        entry.gcTimer = undefined;
        if (entry.sources.size === 0 && !entry.promise) this.#deleteEntry(entry);
      },
      Math.max(0, entry.gcTime),
    );
  }

  #scheduleStale(entry: QueryCacheEntry, staleTime = 0): void {
    if (entry.staleTimer) clearTimeout(entry.staleTimer);
    entry.staleTimer = undefined;
    if (entry.stale || staleTime === Number.POSITIVE_INFINITY) return;

    entry.staleTimer = setTimeout(
      () => {
        entry.staleTimer = undefined;
        entry.stale = true;
      },
      Math.max(0, staleTime),
    );
  }

  #deleteEntry(entry: QueryCacheEntry): void {
    if (entry.sources.size > 0) return;
    if (entry.gcTimer) clearTimeout(entry.gcTimer);
    if (entry.staleTimer) clearTimeout(entry.staleTimer);
    entry.controller?.abort(new QueryCancelledError());
    if (this.#cache.get(entry.hash) === entry) this.#cache.delete(entry.hash);
    entry.dispose();
  }

  #entryIsStale(entry: QueryCacheEntry): boolean {
    if (entry.stale || !entry.hasData()) return true;
    const staleTime = entry.options?.staleTime ?? 0;
    return staleTime !== Number.POSITIVE_INFINITY && Date.now() - entry.updatedAt >= staleTime;
  }

  #refreshStaleQueries(reason: "focus" | "reconnect"): Promise<void> {
    const entries = new Set<QueryCacheEntry>();
    for (const entry of this.#cache.values()) {
      if (this.#activeSources(entry).length === 0 || !this.#entryIsStale(entry)) continue;
      const enabled =
        reason === "focus"
          ? entry.options?.refetchOnWindowFocus
          : entry.options?.refetchOnReconnect;
      if (enabled) entries.add(entry);
    }
    return this.#invalidateEntries(entries).then(() => undefined);
  }
}

const defaultQueryClient = new QueryClient();
const QueryClientContext = createContext(defaultQueryClient);

export function QueryClientProvider(props: { client?: QueryClient; children?: JSX.Element }) {
  const client = () => props.client ?? defaultQueryClient;
  onSettled(() => {
    const current = client();
    current.mount();
    return () => current.unmount();
  });

  return <QueryClientContext value={client()}>{props.children}</QueryClientContext>;
}

export function useQueryClient(queryClient?: QueryClient) {
  return queryClient ?? useContext(QueryClientContext);
}

function createQueryResult<TData>(
  options: () => QueryOptions<TData>,
  suppliedClient?: QueryClient,
): QueryResult<TData> {
  const client = useQueryClient(suppliedClient);
  const state = createMemo(() => {
    const query = client.prepareQuery(options());
    return {
      enabled: isEnabled(query.enabled),
      entry: client.getOrCreateEntry(query),
      query,
    };
  });

  const data = createMemo<TData>(() => {
    const current = state();
    if (!current.enabled) {
      if (current.entry.hasData()) return current.entry.data() as TData;
      return disabledQueryPromise;
    }
    return client.readQuery(current.query);
  });

  const [latestData, setLatestData] = createSignal<TData | undefined>();

  createEffect(
    () => {
      const current = state();
      if (!current.entry.hasData()) return undefined;
      return {
        hash: current.entry.hash,
        value: current.entry.data() as TData,
      };
    },
    (value) => {
      if (value) setLatestData(() => value.value);
    },
  );

  createEffect(
    () => {
      const current = state();
      return {
        enabled: current.enabled,
        entry: current.entry,
      };
    },
    ({ enabled, entry }) => {
      const stopObserving = client.observe(entry, data, enabled);
      if (enabled) refresh(data);
      return stopObserving;
    },
  );

  const refreshQuery = () => {
    const current = untrack(state);
    if (!current.enabled) {
      return current.entry.hasData()
        ? Promise.resolve(current.entry.data() as TData)
        : Promise.reject(new QueryDisabledError());
    }

    return client.refreshEntry<TData>(current.entry, data);
  };

  const refetch = action(function* () {
    const current = untrack(state);
    if (current.enabled) client.affectEntry(current.entry, data);
    return yield refreshQuery();
  });

  const cached = () => {
    const entry = state().entry;
    return entry.hasData() ? (entry.data() as TData) : undefined;
  };
  const fetching = () => state().enabled && state().entry.fetching();
  const loading = () => fetching() && !state().entry.hasData();

  return {
    data,
    latest: latestData,
    cached,
    hasData: () => state().entry.hasData(),
    pending: () => state().enabled && isPending(() => data()),
    fetching,
    loading,
    refetching: () => fetching() && state().entry.hasData(),
    refresh: refreshQuery,
    refetch,
  };
}

export function useQuery<TData>(
  options: () => QueryOptions<TData>,
  queryClient?: QueryClient,
): UseQueryResult<TData> {
  return createQueryResult(options, queryClient);
}

export const createQuery = useQuery;
export const createValueQuery = useQuery;

function infinitePageKey<TPageParam>(key: QueryKey, pageParam: TPageParam): QueryKey {
  return [...key, { $page: pageParam }];
}

export function createInfiniteQuery<TPage, TPageParam = unknown>(
  options: () => InfiniteQueryOptions<TPage, TPageParam>,
  suppliedClient?: QueryClient,
): InfiniteQueryResult<TPage, TPageParam> {
  const client = useQueryClient(suppliedClient);
  const descriptor = createMemo(options);
  const firstPage = createValueQuery<TPage>(() => {
    const current = descriptor();
    return {
      queryKey: current.queryKey,
      queryFn: ({ queryKey, signal }) =>
        current.queryFn({
          pageParam: current.initialPageParam,
          queryKey,
          signal,
        }),
      enabled: current.enabled,
      gcTime: current.gcTime,
      refetchOnReconnect: current.refetchOnReconnect,
      refetchOnWindowFocus: current.refetchOnWindowFocus,
      retry: current.retry,
      retryDelay: current.retryDelay,
      staleTime: current.staleTime,
      timeoutMs: current.timeoutMs,
    };
  }, client);

  const [pages, setPages] = createStore<InfiniteData<TPage, TPageParam>>({
    pages: [],
    pageParams: [],
  });
  const [pagesHash, setPagesHash] = createSignal("", internalWritableOptions);

  createEffect(
    () => {
      const current = descriptor();
      return {
        hash: stableQueryKey(current.queryKey),
        page: firstPage.cached(),
        pageParam: current.initialPageParam,
        ready: firstPage.hasData(),
      };
    },
    (current) => {
      if (!current.ready) return;
      setPagesHash(current.hash);
      setPages((draft) => {
        draft.pages.splice(0, draft.pages.length, current.page as TPage);
        draft.pageParams.splice(0, draft.pageParams.length, current.pageParam);
      });
    },
  );

  const nextPageParam = createMemo(() => {
    const current = descriptor();
    if (pagesHash() !== stableQueryKey(current.queryKey)) return undefined;
    const lastPage = pages.pages.at(-1);
    const lastPageParam = pages.pageParams.at(-1);
    if (lastPage === undefined || lastPageParam === undefined || !current.getNextPageParam) {
      return undefined;
    }
    return current.getNextPageParam(lastPage, [...pages.pages], lastPageParam);
  });

  const [fetchingNextPage, setFetchingNextPage] = createOptimistic(false);
  let activeNextPage:
    | {
        hash: string;
        promise: Promise<void>;
      }
    | undefined;

  const runNextPage = action(function* (hash: string, pageParam: TPageParam) {
    setFetchingNextPage(true);
    const current = untrack(descriptor);
    const page = yield client.fetchQuery<TPage>({
      queryKey: infinitePageKey(current.queryKey, pageParam),
      queryFn: ({ signal }) => current.queryFn({ pageParam, queryKey: current.queryKey, signal }),
      gcTime: current.gcTime,
      refetchOnReconnect: current.refetchOnReconnect,
      refetchOnWindowFocus: current.refetchOnWindowFocus,
      retry: current.retry,
      retryDelay: current.retryDelay,
      staleTime: current.staleTime,
      timeoutMs: current.timeoutMs,
    });

    if (stableQueryKey(untrack(descriptor).queryKey) !== hash) return;
    setPagesHash(hash);
    setPages((draft) => {
      draft.pages.push(page);
      draft.pageParams.push(pageParam);
    });
  });

  const fetchNextPage = () => {
    const current = untrack(descriptor);
    const hash = stableQueryKey(current.queryKey);
    const pageParam = untrack(nextPageParam);
    if (pageParam === undefined || !isEnabled(current.enabled)) return Promise.resolve();
    if (activeNextPage?.hash === hash) return activeNextPage.promise;

    const promise = runNextPage(hash, pageParam).finally(() => {
      if (activeNextPage?.promise === promise) activeNextPage = undefined;
    });
    activeNextPage = { hash, promise };
    return promise;
  };

  const data = (() => {
    firstPage.data();
    return pages;
  }) as SourceAccessor<InfiniteData<TPage, TPageParam>>;

  const refreshPages = async () => {
    const current = untrack(descriptor);
    const hash = stableQueryKey(current.queryKey);
    if (!isEnabled(current.enabled)) {
      const value = firstPage.latest();
      if (value === undefined) throw new QueryDisabledError();
      return pages;
    }

    const pageParams =
      pagesHash() === hash && pages.pageParams.length > 0
        ? [...pages.pageParams]
        : [current.initialPageParam];
    const nextPages = await Promise.all(
      pageParams.map((pageParam, index) =>
        client.refetchQuery<TPage>({
          queryKey: index === 0 ? current.queryKey : infinitePageKey(current.queryKey, pageParam),
          queryFn: ({ signal }) =>
            current.queryFn({ pageParam, queryKey: current.queryKey, signal }),
          gcTime: current.gcTime,
          refetchOnReconnect: current.refetchOnReconnect,
          refetchOnWindowFocus: current.refetchOnWindowFocus,
          retry: current.retry,
          retryDelay: current.retryDelay,
          staleTime: current.staleTime,
          timeoutMs: current.timeoutMs,
        }),
      ),
    );
    const result: InfiniteData<TPage, TPageParam> = {
      pages: nextPages,
      pageParams,
    };
    if (stableQueryKey(untrack(descriptor).queryKey) !== hash) return result;
    setPagesHash(hash);
    setPages((draft) => {
      draft.pages.splice(0, draft.pages.length, ...nextPages);
      draft.pageParams.splice(0, draft.pageParams.length, ...pageParams);
    });
    return result;
  };

  const refetch = action(function* () {
    const current = untrack(descriptor);
    if (isEnabled(current.enabled)) client.affectQueriesMany([current.queryKey]);
    return yield refreshPages();
  });

  return {
    data,
    latest: () => (firstPage.latest() === undefined ? undefined : pages),
    pending: firstPage.pending,
    fetching: firstPage.fetching,
    loading: firstPage.loading,
    refetching: firstPage.refetching,
    fetchingNextPage,
    hasNextPage: () => nextPageParam() !== undefined,
    fetchNextPage,
    refresh: refreshPages,
    refetch,
  };
}

export const useInfiniteQuery = createInfiniteQuery;

function invalidationPrefixes(invalidations: Array<QueryFactory | QueryKey> | undefined) {
  const prefixes: QueryKey[] = [];
  for (const invalidation of invalidations ?? []) {
    const prefix = isQueryKey(invalidation) ? invalidation : invalidation.prefix;
    const hash = stableQueryKey(prefix);
    if (!prefixes.some((candidate) => stableQueryKey(candidate) === hash)) prefixes.push(prefix);
  }
  return prefixes;
}

export function createMutation<TData, TVariables>(
  options: () => MutationOptions<TData, TVariables>,
  suppliedClient?: QueryClient,
): UseMutationResult<TData, TVariables> {
  const client = useQueryClient(suppliedClient);
  const [state, setState] = createStore<MutationState<TData>>({
    data: undefined,
    error: undefined,
    isError: false,
    isSuccess: false,
  });
  const [pending, setPending] = createOptimistic(false);
  let mutationId = 0;

  const mutateAndInvalidate = async (input: {
    mutation: MutationOptions<TData, TVariables>;
    prefixes: QueryKey[];
    variables: TVariables;
  }) => {
    const data = await input.mutation.mutationFn(input.variables);
    if (input.prefixes.length > 0) await client.invalidateQueriesMany(input.prefixes);
    return data;
  };

  const mutateAsync = action(function* (variables?: TVariables) {
    const resolvedVariables = variables as TVariables;
    const mutation = untrack(options);
    const prefixes = invalidationPrefixes(mutation.invalidates);
    const currentMutationId = ++mutationId;
    client.affectQueriesMany(prefixes);
    setPending(true);
    setState((draft) => {
      draft.data = undefined;
      draft.error = undefined;
      draft.isError = false;
      draft.isSuccess = false;
    });
    let settledCallbackStarted = false;

    try {
      const data = yield mutateAndInvalidate({
        mutation,
        prefixes,
        variables: resolvedVariables,
      });
      if (mutation.onSuccess) yield mutation.onSuccess(data, resolvedVariables);
      if (mutation.onSettled) {
        settledCallbackStarted = true;
        yield mutation.onSettled(data, undefined, resolvedVariables);
      }
      if (currentMutationId === mutationId) {
        setState((draft) => {
          draft.data = data;
          draft.error = undefined;
          draft.isError = false;
          draft.isSuccess = true;
        });
      }
      return data;
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      client.notifyMutationError(error);
      if (mutation.onError) yield mutation.onError(error, resolvedVariables);
      if (mutation.onSettled && !settledCallbackStarted) {
        yield mutation.onSettled(undefined, error, resolvedVariables);
      }
      if (currentMutationId === mutationId) {
        setState((draft) => {
          draft.data = undefined;
          draft.error = error;
          draft.isError = true;
          draft.isSuccess = false;
        });
      }
      throw error;
    }
  });

  return resultProxy<UseMutationResult<TData, TVariables>>(() => ({
    data: state.data,
    error: state.error,
    isError: state.isError,
    isPending: pending(),
    isSuccess: state.isSuccess,
    mutate: (variables?: TVariables) => {
      void mutateAsync(variables).catch(() => {});
    },
    mutateAsync,
    reset() {
      setState((draft) => {
        draft.data = undefined;
        draft.error = undefined;
        draft.isError = false;
        draft.isSuccess = false;
      });
    },
  }));
}

export const useMutation = createMutation;

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
  root?: () => Element | null | undefined;
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
      root: options.root?.() ?? null,
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
          root: state.root,
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
