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
  isPending,
  onCleanup,
  onSettled,
  refresh,
  runWithOwner,
  type SourceAccessor,
  untrack,
  useContext,
} from "solid-js";

export {
  type AnyDescriptor,
  type InfiniteDescriptor,
  type InfiniteFetchContext,
  type InvalidationTarget,
  infiniteQuery,
  isInfiniteDescriptor,
  isQueryScope,
  type QueryDescriptor,
  type QueryEntryOptions,
  type QueryFetchContext,
  type QueryKeyObject,
  type QueryScope,
  query,
  queryGroup,
  targetPrefix,
} from "./identity.ts";
export { type QueryKey, queryKey, stableQueryKey } from "./keys.ts";

import {
  type InfiniteDescriptor,
  type InvalidationTarget,
  type QueryDescriptor,
  targetPrefix,
} from "./identity.ts";
import { type QueryKey, queryKeyStartsWith, stableQueryKey } from "./keys.ts";

export type QueryContext = {
  queryKey: QueryKey;
  signal: AbortSignal;
};

type RetryOption = boolean | number | ((failureCount: number, error: unknown) => boolean);
type RetryDelayOption = number | ((failureCount: number, error: unknown) => number);
type MaybePromise<T> = T | Promise<T>;
type RefetchIntervalOption<TData> = false | number | ((data: TData | undefined) => false | number);

export type QueryOptions<TData> = {
  queryKey: QueryKey;
  queryFn: (context: QueryContext) => Promise<TData>;
  enabled?: boolean | (() => boolean);
  gcTime?: number;
  refetchInterval?: RefetchIntervalOption<TData>;
  refetchOnReconnect?: boolean;
  refetchOnWindowFocus?: boolean;
  retry?: RetryOption;
  retryDelay?: RetryDelayOption;
  staleTime?: number;
  timeoutMs?: number;
};

export type QueryDefaultOptions = {
  gcTime?: number;
  refetchInterval?: false | number;
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

export interface QueryResult<TData> {
  /**
   * The authoritative read. Participates in `<Loading>` and `<Errored>`, and is the only
   * read that belongs in render: `<Loading>` retains already-rendered content across a
   * revalidation, so nothing extra is needed to keep a list on screen while it reloads.
   */
  data: SourceAccessor<TData>;
  /**
   * A non-suspending peek at the current key's cached value, for event handlers, effect
   * compute phases, `<Loading>` fallbacks and other places with no boundary to read under.
   * Never use it to dodge a boundary in render.
   */
  cached: Accessor<TData | undefined>;
  /** Solid's question-scoped pending verdict for `data`: a declared change is in flight. */
  pending: Accessor<boolean>;
  /** Whether a request is executing, including quiet background work. */
  fetching: Accessor<boolean>;
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

export interface InfiniteQueryResult<TPage, TPageParam = unknown> {
  data: SourceAccessor<InfiniteData<TPage, TPageParam>>;
  cached: Accessor<InfiniteData<TPage, TPageParam> | undefined>;
  /**
   * The last value this query instance resolved, for ANY key, without suspending.
   *
   * This exists for one reason: in Solid 2 beta.25 a keyed `<For>` whose source became
   * pending beneath `<Loading>` keeps rendering its old children after the new value
   * arrives. `<Loading>` retains the old rows as designed, but the update never lands, so
   * a filtered table stays stuck on the previous results. Reading a non-suspending source
   * sidesteps it.
   *
   * Unlike `cached`, this deliberately keeps the previous key's value while the next one
   * loads, so a list does not blank between keys. Use it only for that: any read that can
   * live under a boundary should use `data`. Remove it when the renderer bug is fixed —
   * `packages/query/test/retention-probe` is the check.
   */
  retained: Accessor<InfiniteData<TPage, TPageParam> | undefined>;
  pending: Accessor<boolean>;
  fetching: Accessor<boolean>;
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
  /**
   * The committed value, mirrored outside the signal.
   *
   * Solid defers signal writes until the microtask flush, so `entry.data()` still reports
   * the previous value in the tick a write happens. Reactive reads want that; an imperative
   * `cache.read` immediately after `cache.write` does not.
   */
  value?: unknown;
  /**
   * Whether `value` holds a committed answer.
   *
   * Separate from the value because a query may legitimately resolve to `undefined`, which
   * must stay distinguishable from "nothing cached".
   */
  hasValue: boolean;
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
  refetchTimer?: ReturnType<typeof setTimeout>;
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

function isEnabled(value: boolean | (() => boolean) | undefined): boolean {
  return typeof value === "function" ? value() : (value ?? true);
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
          refetchInterval: query.refetchInterval ?? defaults.refetchInterval,
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
          hasValue: false,
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

    entry.value = data;
    entry.hasValue = true;
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

  // ---------------------------------------------------------------------------
  // Descriptor cache surface.
  //
  // Deliberately not named `getQueryData` / `setQueryData`: an agent reaching for TanStack
  // muscle memory gets a compile error instead of a silent write to an untyped raw key.
  // `read` and `write` take exact descriptors only — a scope will not type-check.
  // ---------------------------------------------------------------------------

  /** Non-suspending peek at one exact entry. */
  read<TData>(descriptor: QueryDescriptor<TData>): TData | undefined {
    const entry = this.#cache.get(stableQueryKey(descriptor.key));
    return entry?.hasValue ? (entry.value as TData) : undefined;
  }

  /**
   * Writes one exact entry.
   *
   * An updater returning `undefined` means "there is no cached entry to update, do
   * nothing" — the shape a read-modify-write on a possibly-absent list needs.
   *
   * When the entry has never fetched, it **adopts the descriptor's `fetch`**, so a later
   * invalidation re-asks the real question. This is the trap in TanStack-shaped
   * `setQueryData`, which fabricates a `queryFn` resolving the written value forever and so
   * silently freezes the entry.
   */
  write<TData>(
    descriptor: QueryDescriptor<TData>,
    value: TData | ((previous: TData | undefined) => TData | undefined),
  ): void {
    const hash = stableQueryKey(descriptor.key);
    const existing = this.#cache.get(hash);
    const previous = existing?.hasValue ? (existing.value as TData) : undefined;
    const next =
      typeof value === "function"
        ? (value as (previous: TData | undefined) => TData | undefined)(previous)
        : value;

    if (next === undefined) return;

    const entry =
      existing ?? this.getOrCreateEntry(this.prepareQuery(optionsFromDescriptor(descriptor)));

    entry.value = next;
    entry.hasValue = true;
    entry.setData(() => next);
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

  /**
   * Marks every match stale, refetches the ones with active observers, and leaves the rest
   * to refresh when next observed. Never removes data and never blanks the screen.
   *
   * A scope matches by prefix; a descriptor matches that one entry.
   */
  invalidate(...targets: InvalidationTarget[]): Promise<void> {
    if (targets.length === 0) return Promise.resolve();
    return this.invalidateQueriesMany(targets.map(targetPrefix));
  }

  /** Deletes every match outright. Separate from `invalidate` on purpose. */
  remove(...targets: InvalidationTarget[]): void {
    for (const target of targets) this.removeQueries(targetPrefix(target));
  }

  /**
   * Aborts in-flight requests for every match.
   *
   * This is the answer to cache-cardinality pressure from search-driven key churn, together
   * with debouncing and `staleTime` — not dropping request-affecting values from the key.
   */
  cancel(...targets: InvalidationTarget[]): void {
    for (const target of targets) {
      const prefix = targetPrefix(target);
      for (const entry of this.#matchingEntries(prefix)) this.#cancelEntry(entry);
    }
  }

  /**
   * `invalidate`, minus entries a mutation has just written.
   *
   * A canonical write followed by an overlapping family invalidation would otherwise throw
   * the freshly-written value away and re-ask for it.
   */
  invalidateExcept(targets: InvalidationTarget[], exclude: ReadonlySet<string>): Promise<void> {
    if (targets.length === 0) return Promise.resolve();
    const prefixes = targets.map(targetPrefix);
    const entries = new Set<QueryCacheEntry>();
    for (const entry of this.#cache.values()) {
      if (exclude.has(entry.hash)) continue;
      if (prefixes.some((prefix) => queryKeyStartsWith(entry.key, prefix))) entries.add(entry);
    }
    return this.#invalidateEntries(entries).then(() => undefined);
  }

  /** Declares a coming change on every match, so `pending()` reflects it. */
  affectTargets(targets: InvalidationTarget[]): void {
    if (targets.length === 0) return;
    this.affectQueriesMany(targets.map(targetPrefix) as QueryKey[]);
  }

  /** How many requests are currently in flight. For tests and network indicators. */
  inFlightCount(): number {
    let count = 0;
    for (const entry of this.#cache.values()) {
      if (entry.promise) count += 1;
    }
    return count;
  }

  /** The only warming operation. Resolves the cached value if it is already fresh. */
  prefetch<TData>(descriptor: QueryDescriptor<TData>): Promise<TData> {
    return this.fetchQuery(optionsFromDescriptor(descriptor));
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
      entry.value = undefined;
      entry.hasValue = false;
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
    this.#scheduleRefetch(entry);

    return () => {
      entry.sources.delete(source);
      if (this.#activeSources(entry).length === 0) this.#clearRefetch(entry);
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
    this.#clearRefetch(entry);
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
          entry.value = data;
          entry.hasValue = true;
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
          this.#scheduleRefetch(entry);
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

  #clearRefetch(entry: QueryCacheEntry): void {
    if (!entry.refetchTimer) return;
    clearTimeout(entry.refetchTimer);
    entry.refetchTimer = undefined;
  }

  #scheduleRefetch(entry: QueryCacheEntry): void {
    this.#clearRefetch(entry);
    if (entry.promise || !entry.options || this.#activeSources(entry).length === 0) return;

    const option = entry.options.refetchInterval;
    const data = entry.hasData() ? entry.data() : undefined;
    const interval = typeof option === "function" ? option(data) : option;
    if (typeof interval !== "number" || interval <= 0) return;

    entry.refetchTimer = setTimeout(() => {
      entry.refetchTimer = undefined;
      if (this.#activeSources(entry).length === 0) return;
      void this.#invalidateEntries(new Set([entry]));
    }, interval);
  }

  #deleteEntry(entry: QueryCacheEntry): void {
    if (entry.sources.size > 0) return;
    if (entry.gcTimer) clearTimeout(entry.gcTimer);
    this.#clearRefetch(entry);
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

/**
 * The cache surface: `read`, `write`, `invalidate`, `remove`, `cancel`, `prefetch`.
 *
 * Named for what it is rather than for the client object it happens to be, so that call
 * sites read as cache operations and not as reaching into a query library's internals.
 */
export function useQueryCache(queryClient?: QueryClient): QueryClient {
  return queryClient ?? useContext(QueryClientContext);
}

function createQueryResult<TData>(
  options: () => QueryOptions<TData>,
  suppliedClient?: QueryClient,
): QueryResult<TData> {
  const client = useQueryCache(suppliedClient);
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

  createEffect(
    () => {
      const current = state();
      return {
        enabled: current.enabled,
        entry: current.entry,
      };
    },
    ({ enabled, entry }) => {
      const stopObserving = untrack(() => client.observe(entry, data, enabled));
      if (enabled) untrack(() => refresh(data));
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
    // Subscribe to the signal so reactive consumers still re-run, but read the mirror so a
    // handler that writes and then peeks in the same tick does not see the previous value.
    entry.hasData();
    return entry.hasValue ? (entry.value as TData) : undefined;
  };
  const fetching = () => state().enabled && state().entry.fetching();

  return {
    data,
    cached,
    pending: () => state().enabled && isPending(() => data()),
    fetching,
    refresh: refreshQuery,
    refetch,
  };
}

/** The sentinel entry a `null` descriptor parks on. It never fetches. */
const absentQueryKey: QueryKey = ["__xgx_query_absent__"];

function optionsFromDescriptor<TData>(descriptor: QueryDescriptor<TData>): QueryOptions<TData> {
  return {
    queryKey: descriptor.key,
    queryFn: (context) => descriptor.fetch(context),
    ...descriptor.options,
  };
}

/**
 * Observes one exact descriptor.
 *
 * Returning `null` means "there is no question to ask yet" — the same shape as "the id is
 * not available". A `null` query never fetches and its `data()` stays not-ready, so it
 * participates in `<Loading>` exactly as an unresolved read does. This replaces `enabled`,
 * which needed a key to be built from inputs that were not there yet and so polluted the
 * cache with placeholder entries.
 *
 * @example
 * ```ts
 * const site = createQuery(() => (props.siteId ? siteQueries.detail(props.siteId) : null));
 * ```
 */
export function createQuery<TData>(
  source: () => QueryDescriptor<TData> | null,
  queryClient?: QueryClient,
): QueryResult<TData> {
  return createQueryResult<TData>(() => {
    const descriptor = source();
    if (!descriptor) {
      return {
        queryKey: absentQueryKey,
        queryFn: () => disabledQueryPromise,
        enabled: false,
      };
    }
    return optionsFromDescriptor(descriptor);
  }, queryClient);
}

/**
 * Observes one exact infinite descriptor, holding every loaded page in a SINGLE cache entry.
 *
 * The design this replaced cached the first page as its own entry and mirrored it into a
 * separate pages store, with later pages under synthetic `{ $page: n }` keys. That split is
 * why a refetch kept pages the server no longer had, and why invalidating a list family
 * silently collapsed every scrolled table back to its first page: invalidation refetched
 * only the first-page entry, and the mirror effect then spliced the store down to it. It is
 * recorded here because the failure is subtle and the split looks reasonable.
 *
 * Here the entry's value *is* the `InfiniteData`, and its `queryFn` re-asks for every
 * currently-loaded page. Invalidation therefore refreshes all of them and keeps the user's
 * scroll position, and a shrunken collection drops the pages that no longer exist because
 * the walk stops as soon as `getNextPageParam` says there is nothing after the page it just
 * received.
 */
function createInfiniteDescriptorQuery<TPage, TPageParam>(
  source: () => InfiniteDescriptor<TPage, TPageParam> | null,
  suppliedClient?: QueryClient,
): InfiniteQueryResult<TPage, TPageParam> {
  const client = useQueryCache(suppliedClient);
  const descriptor = createMemo(source);

  const readEntry = (target: InfiniteDescriptor<TPage, TPageParam>) =>
    client.getQueryData<InfiniteData<TPage, TPageParam>>(target.key);

  /** Re-asks for every page the entry currently holds, dropping any the server has lost. */
  const reloadPages = async (
    target: InfiniteDescriptor<TPage, TPageParam>,
    context: QueryContext,
  ): Promise<InfiniteData<TPage, TPageParam>> => {
    const held = readEntry(target);
    const wanted =
      held && held.pageParams.length > 0 ? [...held.pageParams] : [target.initialPageParam];

    const pages: TPage[] = [];
    const pageParams: TPageParam[] = [];
    for (const pageParam of wanted) {
      const page = await target.fetch({
        pageParam,
        queryKey: context.queryKey,
        signal: context.signal,
      });
      pages.push(page);
      pageParams.push(pageParam);
      if (!target.getNextPageParam) break;
      if (target.getNextPageParam(page, pages, pageParam) === undefined) break;
    }
    return { pageParams, pages };
  };

  const options = (): QueryOptions<InfiniteData<TPage, TPageParam>> => {
    const target = descriptor();
    if (!target) {
      return {
        enabled: false,
        queryFn: () => disabledQueryPromise,
        queryKey: absentQueryKey,
      };
    }
    return {
      queryFn: (context) => reloadPages(target, context),
      queryKey: target.key,
      ...target.options,
    };
  };

  const query = createQueryResult<InfiniteData<TPage, TPageParam>>(options, client);

  // Instance-scoped, cross-key, non-suspending. Not cache state: this exists solely for
  // issue S1 (a keyed `<For>` under `<Loading>` keeps stale children after its source
  // resolves). See docs/solid-2-beta-issues.md.
  const [retained, setRetained] = createSignal<InfiniteData<TPage, TPageParam> | undefined>(
    undefined,
    internalWritableOptions,
  );
  createEffect(
    () => query.cached(),
    (value) => {
      if (value !== undefined) setRetained(() => value);
    },
  );

  const nextPageParam = (value: InfiniteData<TPage, TPageParam> | undefined) => {
    const target = untrack(descriptor);
    if (!target?.getNextPageParam || !value || value.pages.length === 0) return undefined;
    const lastPage = value.pages[value.pages.length - 1] as TPage;
    const lastPageParam = value.pageParams[value.pageParams.length - 1] as TPageParam;
    return target.getNextPageParam(lastPage, value.pages, lastPageParam);
  };

  const [fetchingNextPage, setFetchingNextPage] = createOptimistic(false);
  let activeNextPage: { hash: string; promise: Promise<void> } | undefined;

  const runNextPage = action(function* (
    target: InfiniteDescriptor<TPage, TPageParam>,
    pageParam: TPageParam,
  ) {
    setFetchingNextPage(true);
    const controller = new AbortController();
    const page = yield target.fetch({
      pageParam,
      queryKey: target.key,
      signal: controller.signal,
    });

    const current = readEntry(target);
    if (!current) return;
    client.setQueryData<InfiniteData<TPage, TPageParam>>(target.key, {
      pageParams: [...current.pageParams, pageParam],
      pages: [...current.pages, page as TPage],
    });
  });

  const fetchNextPage = () => {
    const target = untrack(descriptor);
    if (!target) return Promise.resolve();
    const hash = stableQueryKey(target.key);
    if (activeNextPage?.hash === hash) return activeNextPage.promise;

    const pageParam = nextPageParam(readEntry(target));
    if (pageParam === undefined) return Promise.resolve();

    const promise = runNextPage(target, pageParam).finally(() => {
      if (activeNextPage?.promise === promise) activeNextPage = undefined;
    });
    activeNextPage = { hash, promise };
    return promise;
  };

  return {
    cached: query.cached,
    data: query.data,
    fetching: query.fetching,
    fetchingNextPage,
    fetchNextPage,
    hasNextPage: () => nextPageParam(query.cached()) !== undefined,
    pending: query.pending,
    refetch: query.refetch,
    refresh: query.refresh,
    retained,
  };
}

/**
 * Observes one exact infinite descriptor. `null` means "no question yet", exactly as in
 * {@link createQuery}.
 */
export function createInfiniteQuery<TPage, TPageParam>(
  source: () => InfiniteDescriptor<TPage, TPageParam> | null,
  queryClient?: QueryClient,
): InfiniteQueryResult<TPage, TPageParam> {
  return createInfiniteDescriptorQuery(source, queryClient);
}

/**
 * What a mutation does to the cache.
 *
 * `invalidates` is **required**, and `"nothing"` is a real answer. A forgotten invalidation
 * is the most common and least visible failure in this codebase — the mutation succeeds,
 * the screen keeps showing stale data, and nothing throws. An optional field is exactly the
 * thing an agent generating the minimum that type-checks will leave out, so it is not
 * optional. `"nothing"` is greppable in review and distinguishable from an oversight in a
 * way `invalidates: []` would not be.
 */
export type CacheMutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidates:
    | "nothing"
    | ((result: { data: TData; variables: TVariables }) => InvalidationTarget[]);
  /**
   * Whether the mutation stays pending until its declared invalidations settle. Default
   * `true`, so "saved" means "the screen agrees". Opt out when a broad sweep would make the
   * button hang — expected for wide archive/restore invalidations.
   */
  awaitInvalidation?: boolean;
  /** Exact cache writes. Runs BEFORE invalidation; entries written here are not swept. */
  onSuccess?: (data: TData, variables: TVariables, cache: QueryClient) => MaybePromise<unknown>;
  onError?: (error: Error, variables: TVariables) => MaybePromise<unknown>;
  onSettled?: (
    data: TData | undefined,
    error: Error | undefined,
    variables: TVariables,
  ) => MaybePromise<unknown>;
};

/** Records which exact entries a mutation wrote, so the sweep can skip them. */
function recordingCache(client: QueryClient, written: Set<string>): QueryClient {
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === "write") {
        return function write<TData>(
          descriptor: QueryDescriptor<TData>,
          value: TData | ((previous: TData | undefined) => TData | undefined),
        ): void {
          written.add(stableQueryKey(descriptor.key));
          target.write(descriptor, value);
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function createCacheMutation<TData, TVariables>(
  options: () => CacheMutationOptions<TData, TVariables>,
  suppliedClient?: QueryClient,
): UseMutationResult<TData, TVariables> {
  const client = useQueryCache(suppliedClient);
  const [state, setState] = createStore<MutationState<TData>>({
    data: undefined,
    error: undefined,
    isError: false,
    isSuccess: false,
  });
  const [pending, setPending] = createOptimistic(false);
  let mutationId = 0;

  const mutateAsync = action(function* (variables?: TVariables) {
    const resolvedVariables = variables as TVariables;
    const mutation = untrack(options);
    const currentMutationId = ++mutationId;
    setPending(true);
    setState((draft) => {
      draft.data = undefined;
      draft.error = undefined;
      draft.isError = false;
      draft.isSuccess = false;
    });
    let settledCallbackStarted = false;

    try {
      const data: TData = yield mutation.mutationFn(resolvedVariables);

      // Order is fixed: exact writes first, then invalidation. The inverse order — sweeping
      // before `onSuccess` — leaves a canonical write surviving only by accident of timing.
      const written = new Set<string>();
      if (mutation.onSuccess) {
        yield mutation.onSuccess(data, resolvedVariables, recordingCache(client, written));
      }

      const targets =
        mutation.invalidates === "nothing"
          ? []
          : mutation.invalidates({ data, variables: resolvedVariables });

      if (targets.length > 0) {
        // Declared, not quiet: this change is user-visible, so affected queries read as
        // pending for the duration rather than swapping values silently.
        client.affectTargets(targets);
        // A failed refetch never fails a mutation the server already accepted — reporting
        // failure invites a duplicate write. The failure still reaches the query's own
        // <Errored>.
        const sweep = client.invalidateExcept(targets, written).catch(() => undefined);
        if (mutation.awaitInvalidation !== false) yield sweep;
      }

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

/**
 * Runs a mutation and applies its declared cache effect.
 *
 * Not overloaded, deliberately: an overload set defeats contextual typing of the options
 * object, and `invalidates: "nothing"` would widen to `string` and stop compiling.
 */
export function createMutation<TData, TVariables>(
  options: () => CacheMutationOptions<TData, TVariables>,
  queryClient?: QueryClient,
): UseMutationResult<TData, TVariables> {
  return createCacheMutation(options, queryClient);
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
