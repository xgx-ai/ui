import { expect, test } from "bun:test";
import { infiniteQuery, query, queryGroup, stableQueryKey } from "../src/index.tsx";

/**
 * Identity is derived, not declared: a member's scope comes from the group name and the
 * member name, so a key and its prefix cannot drift apart. These tests pin that, plus the
 * rule that `fetch` only ever sees the normalised key.
 */

type Site = { id: string; name: string };
type SitesPage = { data: Site[]; totalCount: number };
type SitesFilters = { clientId?: string; search?: string; status?: string };

function sitesGroup(record: { fetched: unknown[] } = { fetched: [] }) {
  const group = queryGroup("sites", {
    detail: query({
      key: (id: string) => ({ id }),
      fetch: async (key) => {
        record.fetched.push(key);
        return { id: key.id, name: `Site ${key.id}` } satisfies Site;
      },
      staleTime: 60_000,
    }),
    list: infiniteQuery({
      key: (filters: SitesFilters | undefined) => ({
        clientId: filters?.clientId,
        search: filters?.search?.trim() || undefined,
        status: filters?.status,
      }),
      initialPageParam: 0,
      fetch: async (key, context) => {
        record.fetched.push({ ...key, pageParam: context.pageParam });
        return { data: [], totalCount: 0 } satisfies SitesPage;
      },
      getNextPageParam: () => undefined,
    }),
    summary: query({
      key: () => ({}),
      fetch: async () => ({ total: 0 }),
    }),
  });
  return { group, record };
}

test("a member's key is the group name, the member name, then the normalised key", () => {
  const { group } = sitesGroup();

  expect(group.detail("abc").key).toEqual(["sites", "detail", { id: "abc" }]);
  expect(group.summary().key).toEqual(["sites", "summary", {}]);
});

test("scopes are derived from the member path, so they cannot drift from the key", () => {
  const { group } = sitesGroup();

  expect(group.all.path).toEqual(["sites"]);
  expect(group.detail.all.path).toEqual(["sites", "detail"]);
  expect(group.list.all.path).toEqual(["sites", "list"]);

  // Every descriptor in the family starts with its own scope path.
  const descriptor = group.detail("abc");
  expect(descriptor.key.slice(0, 2)).toEqual([...group.detail.all.path]);
  expect(descriptor.scope.path).toEqual(["sites", "detail"]);
});

test("semantically equal filters produce one identity", () => {
  const { group } = sitesGroup();

  const a = group.list({ clientId: "c1", search: "  north  ", status: undefined });
  const b = group.list({ search: "north", clientId: "c1" });

  expect(stableQueryKey(a.key)).toBe(stableQueryKey(b.key));
});

test("a request-affecting difference produces a different identity", () => {
  const { group } = sitesGroup();

  const base = group.list({ clientId: "c1" });
  expect(stableQueryKey(group.list({ clientId: "c2" }).key)).not.toBe(stableQueryKey(base.key));
  expect(stableQueryKey(group.list({ clientId: "c1", status: "active" }).key)).not.toBe(
    stableQueryKey(base.key),
  );
});

test("an empty search normalises to the same identity as no search", () => {
  const { group } = sitesGroup();

  const blank = stableQueryKey(group.list({ search: "   " }).key);
  expect(blank).toBe(stableQueryKey(group.list({}).key));
  expect(blank).toBe(stableQueryKey(group.list(undefined).key));
});

test("fetch receives the normalised key, never the caller's input", async () => {
  const { group, record } = sitesGroup();

  const descriptor = group.list({ clientId: "c1", search: "  north  ", status: undefined });
  await descriptor.fetch({
    queryKey: descriptor.key,
    pageParam: 0,
    signal: new AbortController().signal,
  });

  // Trimmed, `undefined` preserved as a property, and no stray input fields.
  expect(record.fetched).toEqual([
    { clientId: "c1", search: "north", status: undefined, pageParam: 0 },
  ]);
});

test("an unserialisable key is rejected where the definition is used, not later", () => {
  const group = queryGroup("bad", {
    detail: query({
      key: (value: unknown) => ({ value }),
      fetch: async () => "value",
    }),
  });

  expect(() => group.detail(() => "nope")).toThrow(TypeError);
  expect(() => group.detail(new Map())).toThrow(TypeError);
  expect(() => group.detail("fine")).not.toThrow();
});

test("a member cannot be called `all`, which is the group's own scope", () => {
  expect(() =>
    queryGroup("clash", {
      all: query({ key: () => ({}), fetch: async () => 1 }),
    }),
  ).toThrow(/cannot have a member named "all"/);
});

test("infinite descriptors carry their cursor, and the page param stays out of the key", () => {
  const { group } = sitesGroup();
  const descriptor = group.list({ clientId: "c1" });

  expect(descriptor.initialPageParam).toBe(0);
  expect(descriptor.key).toEqual([
    "sites",
    "list",
    { clientId: "c1", search: undefined, status: undefined },
  ]);
  expect(stableQueryKey(descriptor.key)).not.toContain("pageParam");
});

test("per-entry options ride on the descriptor without affecting identity", () => {
  const { group } = sitesGroup();

  expect(group.detail("abc").options.staleTime).toBe(60_000);
  expect(stableQueryKey(group.detail("abc").key)).toBe(
    stableQueryKey(["sites", "detail", { id: "abc" }]),
  );
});
