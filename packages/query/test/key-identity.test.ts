import { expect, test } from "bun:test";
import { QueryClient } from "../src/index.tsx";

/**
 * Characterisation tests for query key identity.
 *
 * These lock the CURRENT behaviour so the descriptor rewrite can show exactly what it
 * changes. Cases marked "changes in Phase 4" assert today's behaviour deliberately and
 * are expected to be inverted by the rewrite — see docs/solidjs2-query-contract-plan.md.
 */

function countingClient() {
  const client = new QueryClient();
  const calls: string[] = [];
  const fetch = (queryKey: readonly unknown[], label = "value") => {
    return client.fetchQuery({
      queryKey,
      queryFn: async () => {
        calls.push(label);
        return label;
      },
      staleTime: Number.POSITIVE_INFINITY,
    });
  };
  return { calls, client, fetch };
}

test("object property order does not affect identity", async () => {
  const { calls, fetch } = countingClient();

  await fetch(["records", { page: 1, search: "north" }], "first");
  await fetch(["records", { search: "north", page: 1 }], "second");

  expect(calls).toEqual(["first"]);
});

test("nested object property order does not affect identity", async () => {
  const { calls, fetch } = countingClient();

  await fetch(["records", { filters: { a: 1, b: 2 }, sort: "name" }], "first");
  await fetch(["records", { sort: "name", filters: { b: 2, a: 1 } }], "second");

  expect(calls).toEqual(["first"]);
});

test("array order is significant", async () => {
  const { calls, fetch } = countingClient();

  await fetch(["records", { regionIds: ["a", "b"] }], "first");
  await fetch(["records", { regionIds: ["b", "a"] }], "second");

  expect(calls).toEqual(["first", "second"]);
});

test("an explicit default is a different question from an omitted value", async () => {
  const { calls, fetch } = countingClient();

  await fetch(["records", { status: "active" }], "explicit");
  await fetch(["records", {}], "omitted");

  expect(calls).toEqual(["explicit", "omitted"]);
});

test("an undefined property is currently distinct from an omitted property", async () => {
  // Changes in Phase 4: the descriptor rewrite adopts TanStack semantics, where an
  // `undefined` object property is equivalent to an omitted property. Today they are two
  // cache entries, which is why a normaliser that emits `{ clientId: undefined }` splits
  // the cache against one that omits the key.
  const { calls, fetch } = countingClient();

  await fetch(["records", { clientId: undefined, search: "north" }], "undefined-property");
  await fetch(["records", { search: "north" }], "omitted-property");

  expect(calls).toEqual(["undefined-property", "omitted-property"]);
});

test("an undefined positional key part is distinct from a missing part", async () => {
  const { calls, fetch } = countingClient();

  await fetch(["records", undefined], "undefined-part");
  await fetch(["records"], "missing-part");

  expect(calls).toEqual(["undefined-part", "missing-part"]);
});

test("primitive types are not conflated", async () => {
  const { calls, fetch } = countingClient();

  await fetch(["records", 1], "number");
  await fetch(["records", "1"], "string");
  await fetch(["records", true], "boolean");
  await fetch(["records", null], "null");

  expect(calls).toEqual(["number", "string", "boolean", "null"]);
});

test("dates encode by instant, not by identity", async () => {
  const { calls, fetch } = countingClient();
  const instant = "2026-07-27T09:00:00.000Z";

  await fetch(["records", { from: new Date(instant) }], "first");
  await fetch(["records", { from: new Date(instant) }], "second");

  expect(calls).toEqual(["first"]);
});

test("unsupported key values are rejected", () => {
  const { client } = countingClient();
  const reject = (queryKey: readonly unknown[]) =>
    expect(() => client.getQueryData(queryKey)).toThrow(TypeError);

  reject(["records", () => "value"]);
  reject(["records", Symbol("value")]);
  reject(["records", new Map([["a", 1]])]);
  reject(["records", new (class Filters {})()]);

  const circular: Record<string, unknown> = {};
  circular.self = circular;
  reject(["records", circular]);
});

test("the cache hash snapshots the key, but the retained key stays live", async () => {
  // Characterises the reactive-input hazard the normaliser rule exists to prevent.
  // `prepareQuery` hashes the key immediately, so the entry stays reachable by its
  // original value — but the entry also retains the caller's object by reference, and
  // prefix matching reads that live object. Mutating the input therefore orphans the
  // entry from the invalidation that should have matched it.
  const client = new QueryClient();
  const filters = { status: "active" };
  let calls = 0;

  await client.fetchQuery({
    queryKey: ["records", filters],
    queryFn: async () => {
      calls += 1;
      return calls;
    },
    gcTime: Number.POSITIVE_INFINITY,
    staleTime: Number.POSITIVE_INFINITY,
  });

  filters.status = "archived";

  // The hash was taken at prepare time, so the original value still finds the entry.
  expect(client.getQueryData(["records", { status: "active" }])).toBe(1);
  expect(client.getQueryData(["records", { status: "archived" }])).toBeUndefined();

  // But prefix matching walks the retained live object, so the entry no longer matches
  // the value it was cached under. `removeQueries` is the discriminating probe: it
  // deletes every match, so a surviving entry proves the match failed.
  client.removeQueries(["records", { status: "active" }]);
  expect(client.getQueryData(["records", { status: "active" }])).toBe(1);

  // It matches the mutated value instead — identity has silently moved.
  client.removeQueries(["records", { status: "archived" }]);
  expect(client.getQueryData(["records", { status: "active" }])).toBeUndefined();
});
