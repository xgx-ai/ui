/**
 * Negative type tests for the descriptor contract.
 *
 * Checked by `bun run query:typecheck`, not by the test runner. Every `@ts-expect-error` is
 * an assertion: if the error stops occurring, TypeScript reports the unused directive and
 * the typecheck fails. That makes this file fail in both directions — when a rule breaks,
 * and when a rule silently weakens.
 */

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

// The page and cursor types come from the descriptor, not from the call site. With an
// overload set they degraded to `unknown`, which type-checked here and exploded at the
// consumer; a single signature makes that unrepresentable.
const _pages = createInfiniteQuery(() => sites.list("c1"));
const _rows: Site[] = _pages.data().pages.flatMap((page) => page.data);
const _cursors: number[] = [..._pages.data().pageParams];

// @ts-expect-error a value descriptor is not an infinite one
createInfiniteQuery(() => sites.detail("a"));

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

// `invalidates` is required, and the requirement is now assertable directly through
// `createMutation`: the overload set that used to defeat contextual typing is gone.
// @ts-expect-error `invalidates` is required: a forgotten one is silent at runtime
createMutation(() => ({
  mutationFn: async (id: string) => ({ id, name: "Site" }),
}));

// The bare literal must survive contextual typing. An overload set would widen it to
// `string` and this line would stop compiling — which is why there is only one signature.
createMutation(() => ({
  mutationFn: async (id: string) => ({ id, name: "Site" }),
  invalidates: "nothing",
}));

export type { Site };
