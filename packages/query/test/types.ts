/**
 * Negative type tests for the descriptor contract.
 *
 * Checked by `bun run query:typecheck`, not by the test runner. Every `@ts-expect-error` is
 * an assertion: if the error stops occurring, TypeScript reports the unused directive and
 * the typecheck fails. That makes this file fail in both directions — when a rule breaks,
 * and when a rule silently weakens.
 */

import type { CacheMutationOptions } from "../src/index.tsx";
import {
  createInfiniteQuery,
  createMutation,
  createQuery,
  infiniteQuery,
  QueryClient,
  query,
  queryGroup,
} from "../src/index.tsx";

type Site = { id: string; name: string };
type SitesPage = { data: Site[]; totalCount: number };

const sites = queryGroup("sites", {
  detail: query({
    key: (id: string) => ({ id }),
    fetch: async (key): Promise<Site> => ({ id: key.id, name: "Site" }),
  }),
  list: infiniteQuery({
    key: (clientId?: string) => ({ clientId }),
    initialPageParam: 0,
    fetch: async (): Promise<SitesPage> => ({ data: [], totalCount: 0 }),
    getNextPageParam: () => undefined,
  }),
});

declare const cache: QueryClient;

// ---------------------------------------------------------------------------
// A descriptor carries its result type through the cache.
// ---------------------------------------------------------------------------

const _read: Site | undefined = cache.read(sites.detail("a"));

// @ts-expect-error the descriptor determines the type; a site is not a string
const _wrongRead: string | undefined = cache.read(sites.detail("a"));

cache.write(sites.detail("a"), { id: "a", name: "Site" });

// @ts-expect-error an unrelated value cannot be written to a typed entry
cache.write(sites.detail("a"), { totallyDifferent: true });

// @ts-expect-error the updater's previous value is the descriptor's type
cache.write(sites.detail("a"), (previous: string | undefined) => previous);

// ---------------------------------------------------------------------------
// Exact reads and writes reject a scope; family operations accept both.
// ---------------------------------------------------------------------------

// @ts-expect-error a scope is not an exact cache entry
cache.read(sites.detail.all);

// @ts-expect-error a scope is not an exact cache entry
cache.write(sites.detail.all, { id: "a", name: "Site" });

// @ts-expect-error a whole group is not an exact cache entry
cache.prefetch(sites.all);

cache.invalidate(sites.all, sites.detail.all, sites.detail("a"), sites.list("c1"));
cache.remove(sites.detail.all);
cache.cancel(sites.list("c1"));

// ---------------------------------------------------------------------------
// Members are called with their key's arguments.
// ---------------------------------------------------------------------------

sites.detail("a");
sites.list();
sites.list("c1");

// @ts-expect-error `detail` needs the id its key normaliser takes
sites.detail();

// @ts-expect-error the id is a string
sites.detail(42);

// ---------------------------------------------------------------------------
// `createQuery` takes an exact descriptor, or null for "no question yet".
// ---------------------------------------------------------------------------

createQuery(() => sites.detail("a"));
createQuery(() => null);

// @ts-expect-error a scope is not observable; only an exact entry is
createQuery(() => sites.detail.all);

// @ts-expect-error an infinite descriptor needs createInfiniteQuery
createQuery(() => sites.list("c1"));

// ---------------------------------------------------------------------------
// A mutation cannot omit its cache effect.
// ---------------------------------------------------------------------------

createMutation(() => ({
  mutationFn: async (id: string) => ({ id, name: "Site" }),
  invalidates: "nothing" as const,
}));

createMutation(() => ({
  mutationFn: async (id: string) => ({ id, name: "Site" }),
  invalidates: ({ variables }) => [sites.detail(variables), sites.list.all],
}));

// `createMutation` still carries a legacy overload whose `invalidates` is optional, so the
// requirement cannot be asserted through it until Phase 5 deletes that overload. Assert it
// against the options type directly, which is the contract that actually matters.
declare function cacheMutation<TData, TVariables>(
  options: () => CacheMutationOptions<TData, TVariables>,
): void;

cacheMutation(() => ({
  mutationFn: async (id: string) => ({ id, name: "Site" }),
  invalidates: "nothing" as const,
}));

// @ts-expect-error `invalidates` is required: a forgotten one is silent at runtime
cacheMutation(() => ({
  mutationFn: async (id: string) => ({ id, name: "Site" }),
}));

export type { Site };

// ---------------------------------------------------------------------------
// Overload inference for the legacy paths.
//
// `createInfiniteQuery` and `createMutation` each carry a temporary second overload for
// the descriptor API. Overload order is load-bearing: with the descriptor signature first,
// TypeScript tries to infer `TPage` from a descriptor for a legacy options call, fails, and
// silently degrades every legacy callback parameter to `unknown` — which type-checks at the
// definition and explodes at the call sites. These assertions turn that reorder into a
// compile error here instead. Delete them with the legacy overloads in Phase 5.
// ---------------------------------------------------------------------------

type LegacyPage = { data: Site[]; totalCount: number };

createInfiniteQuery(() => ({
  queryKey: ["legacy", "sites"],
  initialPageParam: 0,
  queryFn: async (context: { pageParam: number }): Promise<LegacyPage> => ({
    data: [],
    totalCount: context.pageParam,
  }),
  getNextPageParam: (lastPage, allPages, lastPageParam) => {
    // Each of these would be `unknown` if the descriptor overload were matched first.
    const total: number = lastPage.totalCount;
    const loaded: number = allPages.reduce((sum, page) => sum + page.data.length, 0);
    const cursor: number = lastPageParam;
    return loaded < total ? cursor + 1 : undefined;
  },
}));

createMutation(() => ({
  mutationFn: async (variables: { id: string }) => ({ id: variables.id, name: "Site" }),
  // Legacy targets are raw keys or factories, not scopes.
  invalidates: [["sites", "detail"]],
  onSuccess: (data, variables) => {
    const savedName: string = data.name;
    const savedId: string = variables.id;
    return `${savedId}:${savedName}`;
  },
}));
