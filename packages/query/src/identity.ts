import { type QueryKey, stableQueryKey } from "./keys.ts";

/**
 * Query identity: groups, scopes and descriptors.
 *
 * A group names a namespace once and its members derive their scope from it, so there is no
 * separate prefix to keep in sync with the key — the drift a hand-written
 * `{ key, prefix }` pair allows cannot be expressed here.
 *
 * `key` is the normaliser. It converts loose UI state into the strict, serialisable identity,
 * and `fetch` receives that identity and nothing else. A value that affects the answer but is
 * missing from the key is therefore unreachable from `fetch`, so a request and its cache key
 * cannot disagree.
 */

declare const scopeBrand: unique symbol;
declare const descriptorBrand: unique symbol;

/** Selects a related family for invalidation, removal or cancellation. */
export type QueryScope = {
  readonly [scopeBrand]: true;
  /** The key prefix every member of this family starts with. */
  readonly path: QueryKey;
};

/** Identifies one exact cache entry and carries its result type. */
export type QueryDescriptor<TData> = {
  readonly [descriptorBrand]: "value";
  readonly key: QueryKey;
  readonly scope: QueryScope;
  readonly fetch: (context: QueryFetchContext) => Promise<TData>;
  readonly options: QueryEntryOptions;
};

/** Identifies one exact infinite cache entry and carries its page and cursor types. */
export type InfiniteDescriptor<TPage, TPageParam> = {
  readonly [descriptorBrand]: "infinite";
  readonly key: QueryKey;
  readonly scope: QueryScope;
  readonly fetch: (context: InfiniteFetchContext<TPageParam>) => Promise<TPage>;
  readonly initialPageParam: TPageParam;
  readonly getNextPageParam?: (
    lastPage: TPage,
    allPages: readonly TPage[],
    lastPageParam: TPageParam,
  ) => TPageParam | undefined;
  readonly options: QueryEntryOptions;
};

export type AnyDescriptor = QueryDescriptor<unknown> | InfiniteDescriptor<unknown, unknown>;

/**
 * Anything `invalidate`, `remove` and `cancel` accept.
 *
 * Structural rather than `QueryScope | AnyDescriptor`: a descriptor's `fetch` is
 * contravariant in its page param, so a concrete `InfiniteDescriptor<Page, number>` is not
 * assignable to `InfiniteDescriptor<unknown, unknown>`. Matching only ever needs the key
 * and the scope, so those are all this asks for.
 */
export type InvalidationTarget =
  | QueryScope
  | { readonly key: QueryKey; readonly scope: QueryScope };

export type QueryFetchContext = {
  readonly queryKey: QueryKey;
  readonly signal: AbortSignal;
};

export type InfiniteFetchContext<TPageParam> = QueryFetchContext & {
  readonly pageParam: TPageParam;
};

/** Per-entry behaviour that is not part of identity. */
export type QueryEntryOptions = {
  gcTime?: number;
  refetchInterval?: number | false;
  refetchOnReconnect?: boolean;
  refetchOnWindowFocus?: boolean;
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
  retryDelay?: number | ((failureCount: number, error: unknown) => number);
  staleTime?: number;
  timeoutMs?: number;
};

/**
 * The serialisable shape a `key` normaliser returns.
 *
 * An object rather than positional parts: a filtered family with ten filters stays one
 * readable object instead of ten positional slots, and adding a filter does not renumber
 * anything.
 */
export type QueryKeyObject = Record<string, unknown>;

type ValueQueryConfig<TArgs extends unknown[], TKey extends QueryKeyObject, TData> = {
  key: (...args: TArgs) => TKey;
  fetch: (key: TKey, context: QueryFetchContext) => Promise<TData>;
} & QueryEntryOptions;

type InfiniteQueryConfig<
  TArgs extends unknown[],
  TKey extends QueryKeyObject,
  TPage,
  TPageParam,
> = {
  key: (...args: TArgs) => TKey;
  fetch: (key: TKey, context: InfiniteFetchContext<TPageParam>) => Promise<TPage>;
  initialPageParam: TPageParam;
  getNextPageParam?: (
    lastPage: TPage,
    allPages: readonly TPage[],
    lastPageParam: TPageParam,
  ) => TPageParam | undefined;
} & QueryEntryOptions;

const definitionKind = Symbol("xgx.queryDefinition");

type ValueQueryDefinition<TArgs extends unknown[], TKey extends QueryKeyObject, TData> = {
  readonly [definitionKind]: "value";
  readonly config: ValueQueryConfig<TArgs, TKey, TData>;
};

type InfiniteQueryDefinition<
  TArgs extends unknown[],
  TKey extends QueryKeyObject,
  TPage,
  TPageParam,
> = {
  readonly [definitionKind]: "infinite";
  readonly config: InfiniteQueryConfig<TArgs, TKey, TPage, TPageParam>;
};

// Definitions are heterogeneous inside a group, so the constraint is deliberately loose.
// Each member's precise types are recovered by `MemberOf` below.
type AnyDefinition =
  | ValueQueryDefinition<any, any, any>
  | InfiniteQueryDefinition<any, any, any, any>;

/**
 * Declares a value query. Only meaningful inside `queryGroup`, which supplies the scope.
 */
export function query<TArgs extends unknown[], TKey extends QueryKeyObject, TData>(
  config: ValueQueryConfig<TArgs, TKey, TData>,
): ValueQueryDefinition<TArgs, TKey, TData> {
  return { [definitionKind]: "value", config };
}

/**
 * Declares an infinite query. The page parameter belongs to the single cached value, not to
 * the key — a caller-selectable page size does belong in the key, because it changes the
 * answer.
 */
export function infiniteQuery<
  TArgs extends unknown[],
  TKey extends QueryKeyObject,
  TPage,
  TPageParam,
>(
  config: InfiniteQueryConfig<TArgs, TKey, TPage, TPageParam>,
): InfiniteQueryDefinition<TArgs, TKey, TPage, TPageParam> {
  return { [definitionKind]: "infinite", config };
}

/** A callable family: `sites.detail(id)` for one entry, `sites.detail.all` for the family. */
export type ValueQueryMember<TArgs extends unknown[], TData> = ((
  ...args: TArgs
) => QueryDescriptor<TData>) & { readonly all: QueryScope };

export type InfiniteQueryMember<TArgs extends unknown[], TPage, TPageParam> = ((
  ...args: TArgs
) => InfiniteDescriptor<TPage, TPageParam>) & { readonly all: QueryScope };

// `TKey` must be inferred, not pinned to `QueryKeyObject`: it appears in both a return
// position (`key`) and a parameter position (`fetch`), so a concrete key type is not
// bidirectionally assignable to the constraint and the conditional collapses to `never`
// for every member. Infinite is tested first because its definition is the narrower shape.
type MemberOf<TDefinition> =
  TDefinition extends InfiniteQueryDefinition<
    infer TArgs,
    infer _TInfiniteKey,
    infer TPage,
    infer TPageParam
  >
    ? InfiniteQueryMember<TArgs, TPage, TPageParam>
    : TDefinition extends ValueQueryDefinition<infer TArgs, infer _TValueKey, infer TData>
      ? ValueQueryMember<TArgs, TData>
      : never;

export type QueryGroup<TMembers extends Record<string, AnyDefinition>> = {
  readonly [K in keyof TMembers]: MemberOf<TMembers[K]>;
} & { readonly all: QueryScope };

function entryOptions(config: QueryEntryOptions): QueryEntryOptions {
  return {
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnReconnect: config.refetchOnReconnect,
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    retry: config.retry,
    retryDelay: config.retryDelay,
    staleTime: config.staleTime,
    timeoutMs: config.timeoutMs,
  };
}

function makeScope(path: QueryKey): QueryScope {
  return { path } as unknown as QueryScope;
}

/** Narrows an invalidation target. Descriptors match exactly; scopes match by prefix. */
export function isQueryScope(target: InvalidationTarget): target is QueryScope {
  return !("key" in target);
}

export function isInfiniteDescriptor(
  descriptor: AnyDescriptor,
): descriptor is InfiniteDescriptor<unknown, unknown> {
  return "initialPageParam" in descriptor;
}

/** The prefix a target matches on: a descriptor's own key, or a scope's path. */
export function targetPrefix(target: InvalidationTarget): QueryKey {
  return isQueryScope(target) ? target.path : target.key;
}

/**
 * Names a namespace and builds its members.
 *
 * @example
 * ```ts
 * export const siteQueries = queryGroup("sites", {
 *   detail: query({
 *     key: (id: string) => ({ id }),
 *     fetch: ({ id }, ctx) => trpc.sites.get.query({ id }, { signal: ctx.signal }),
 *     staleTime: 60_000,
 *   }),
 * });
 *
 * siteQueries.detail("abc") // QueryDescriptor<Site>, key ["sites", "detail", { id: "abc" }]
 * siteQueries.detail.all    // QueryScope,            path ["sites", "detail"]
 * siteQueries.all           // QueryScope,            path ["sites"]
 * ```
 */
export function queryGroup<TMembers extends Record<string, AnyDefinition>>(
  name: string,
  members: TMembers,
): QueryGroup<TMembers> {
  if (Object.hasOwn(members, "all")) {
    throw new TypeError(
      `Query group "${name}" cannot have a member named "all": that name is the group's own scope.`,
    );
  }

  const group: Record<string, unknown> = { all: makeScope([name]) };

  for (const [memberName, definition] of Object.entries(members)) {
    const scope = makeScope([name, memberName]);
    const options: QueryEntryOptions = entryOptions(definition.config);

    const buildKey = (args: unknown[]) => {
      const keyObject = definition.config.key(...args);
      const key: QueryKey = [name, memberName, keyObject];
      // Fail at build time rather than when the entry is later matched: an unserialisable
      // key part is a definition bug, and the stack is far more useful here.
      stableQueryKey(key);
      return { key, keyObject };
    };

    const member =
      definition[definitionKind] === "infinite"
        ? (...args: unknown[]) => {
            const { key, keyObject } = buildKey(args);
            const config = definition.config;
            return {
              key,
              scope,
              fetch: (context: InfiniteFetchContext<unknown>) => config.fetch(keyObject, context),
              initialPageParam: config.initialPageParam,
              getNextPageParam: config.getNextPageParam,
              options,
            } as unknown as InfiniteDescriptor<unknown, unknown>;
          }
        : (...args: unknown[]) => {
            const { key, keyObject } = buildKey(args);
            const config = definition.config;
            return {
              key,
              scope,
              fetch: (context: QueryFetchContext) => config.fetch(keyObject, context),
              options,
            } as unknown as QueryDescriptor<unknown>;
          };

    (member as unknown as { all: QueryScope }).all = scope;
    group[memberName] = member;
  }

  return group as QueryGroup<TMembers>;
}
