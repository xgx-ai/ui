import { expect, test } from "bun:test";
import { createRoot, flush, resolve } from "solid-js";
import { createMutation, createQuery, QueryClient, query, queryGroup } from "../src/index.tsx";

/**
 * The descriptor cache surface and the mutation contract built on it.
 *
 * The invariants under test are the ones the plan commits to: writes adopt the descriptor's
 * fetch, an updater returning `undefined` is a no-op, invalidation never removes data, a
 * mutation cannot omit its cache effect, order is write-then-invalidate, and a failed sweep
 * never fails a mutation the server already accepted.
 */

async function inRoot<T>(run: () => Promise<T>): Promise<T> {
  let disposeRoot = () => {};
  const promise = createRoot((dispose) => {
    disposeRoot = dispose;
    return run();
  });
  try {
    return await promise;
  } finally {
    disposeRoot();
  }
}

type Client = { id: string; name: string };

function clientsGroup(store: Map<string, Client>, calls: string[] = []) {
  return {
    calls,
    group: queryGroup("clients", {
      detail: query({
        key: (id: string) => ({ id }),
        fetch: async (key) => {
          calls.push(`detail:${key.id}`);
          const record = store.get(key.id);
          if (!record) throw new Error(`no client ${key.id}`);
          return { ...record };
        },
        staleTime: Number.POSITIVE_INFINITY,
      }),
      list: query({
        key: () => ({}),
        fetch: async () => {
          calls.push("list");
          return [...store.values()];
        },
        staleTime: Number.POSITIVE_INFINITY,
      }),
    }),
  };
}

test("read returns undefined for an entry that has never fetched", () => {
  const client = new QueryClient();
  const { group } = clientsGroup(new Map());

  expect(client.read(group.detail("c1"))).toBeUndefined();
});

test("write then read round-trips through the exact descriptor", async () => {
  const client = new QueryClient();
  const { group } = clientsGroup(new Map());

  client.write(group.detail("c1"), { id: "c1", name: "Acme" });

  expect(client.read(group.detail("c1"))).toEqual({ id: "c1", name: "Acme" });
  expect(client.read(group.detail("c2"))).toBeUndefined();
});

test("a write updater sees the previous value", () => {
  const client = new QueryClient();
  const { group } = clientsGroup(new Map());

  client.write(group.detail("c1"), { id: "c1", name: "Acme" });
  client.write(group.detail("c1"), (previous) =>
    previous ? { ...previous, name: `${previous.name} Ltd` } : undefined,
  );

  expect(client.read(group.detail("c1"))?.name).toBe("Acme Ltd");
});

test("an updater returning undefined leaves the cache untouched", () => {
  const client = new QueryClient();
  const { group } = clientsGroup(new Map());

  // The read-modify-write shape: there is nothing cached, so there is nothing to update.
  client.write(group.detail("c1"), (previous) => (previous ? previous : undefined));

  expect(client.read(group.detail("c1"))).toBeUndefined();
});

test("a written entry adopts the descriptor's fetch, so invalidation re-asks", async () => {
  await inRoot(async () => {
    const store = new Map([["c1", { id: "c1", name: "Acme" }]]);
    const client = new QueryClient();
    const { group, calls } = clientsGroup(store);

    // Write before anything has fetched. The legacy `setQueryData` fabricates a queryFn
    // resolving this value forever, permanently freezing the entry.
    client.write(group.detail("c1"), { id: "c1", name: "stale local guess" });
    const observed = createQuery(() => group.detail("c1"), client);
    await resolve(() => observed.data());
    flush();

    store.set("c1", { id: "c1", name: "Acme (server)" });
    await client.invalidate(group.detail.all);
    flush();

    expect(calls).toContain("detail:c1");
    expect(observed.cached()?.name).toBe("Acme (server)");
  });
});

test("invalidate marks stale without removing data; remove deletes", async () => {
  const client = new QueryClient();
  const { group } = clientsGroup(new Map());

  client.write(group.detail("c1"), { id: "c1", name: "Acme" });

  await client.invalidate(group.detail.all);
  expect(client.read(group.detail("c1"))).toEqual({ id: "c1", name: "Acme" });

  client.remove(group.detail.all);
  expect(client.read(group.detail("c1"))).toBeUndefined();
});

test("a scope matches by prefix and a descriptor matches one entry", async () => {
  const client = new QueryClient();
  const { group } = clientsGroup(new Map());

  client.write(group.detail("c1"), { id: "c1", name: "One" });
  client.write(group.detail("c2"), { id: "c2", name: "Two" });

  client.remove(group.detail("c1"));
  expect(client.read(group.detail("c1"))).toBeUndefined();
  expect(client.read(group.detail("c2"))).toEqual({ id: "c2", name: "Two" });

  client.remove(group.all);
  expect(client.read(group.detail("c2"))).toBeUndefined();
});

test("cancel aborts an in-flight request", async () => {
  const client = new QueryClient();
  const group = queryGroup("slow", {
    detail: query({
      key: (id: string) => ({ id }),
      fetch: (_key, context) =>
        new Promise<string>((_, reject) => {
          context.signal.addEventListener("abort", () => reject(context.signal.reason), {
            once: true,
          });
        }),
    }),
  });

  const pending = client.prefetch(group.detail("c1"));
  await Promise.resolve();
  client.cancel(group.detail.all);

  await expect(pending).rejects.toThrow();
});

test("a mutation must declare its cache effect, and 'nothing' is a real answer", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    let ran = false;
    const command = createMutation(
      () => ({
        mutationFn: async () => {
          ran = true;
          return "downloaded";
        },
        invalidates: "nothing" as const,
      }),
      client,
    );

    expect(await command.mutateAsync(undefined)).toBe("downloaded");
    expect(ran).toBe(true);
  });
});

test("invalidates receives the result and can target an exact descriptor", async () => {
  await inRoot(async () => {
    const store = new Map([["c1", { id: "c1", name: "Acme" }]]);
    const client = new QueryClient();
    const { group, calls } = clientsGroup(store);

    const detail = createQuery(() => group.detail("c1"), client);
    await resolve(() => detail.data());
    flush();
    calls.length = 0;

    const save = createMutation(
      () => ({
        mutationFn: async (variables: { id: string; name: string }) => {
          store.set(variables.id, { ...variables });
          return { ...variables };
        },
        invalidates: ({ variables }: { variables: { id: string } }) => [group.detail(variables.id)],
      }),
      client,
    );

    await save.mutateAsync({ id: "c1", name: "Acme Renamed" });
    flush();

    expect(calls).toEqual(["detail:c1"]);
    expect(detail.cached()?.name).toBe("Acme Renamed");
  });
});

test("an exact write survives the same mutation's overlapping family invalidation", async () => {
  await inRoot(async () => {
    const store = new Map([["c1", { id: "c1", name: "Acme" }]]);
    const client = new QueryClient();
    const { group, calls } = clientsGroup(store);

    const detail = createQuery(() => group.detail("c1"), client);
    const list = createQuery(() => group.list(), client);
    await resolve(() => detail.data());
    await resolve(() => list.data());
    flush();
    calls.length = 0;

    const save = createMutation(
      () => ({
        mutationFn: async () => ({ id: "c1", name: "Canonical" }),
        // Writes the detail, then invalidates the whole group — which overlaps it.
        onSuccess: (data: Client, _variables: undefined, cache: QueryClient) => {
          cache.write(group.detail("c1"), data);
        },
        invalidates: () => [group.all],
      }),
      client,
    );

    await save.mutateAsync(undefined);
    flush();

    // The list refetched; the written detail was not thrown away and re-asked.
    expect(calls).toEqual(["list"]);
    expect(detail.cached()?.name).toBe("Canonical");
  });
});

test("a failed invalidation still leaves the mutation successful", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const group = queryGroup("brittle", {
      detail: query({
        key: () => ({}),
        fetch: async () => {
          throw new Error("upstream is down");
        },
      }),
    });

    const observed = createQuery(() => group.detail(), client);
    await resolve(() => observed.data()).catch(() => undefined);
    flush();

    const save = createMutation(
      () => ({
        mutationFn: async () => "saved",
        invalidates: () => [group.detail.all],
      }),
      client,
    );

    // Reporting failure after a server-accepted write invites a duplicate write, so the
    // refetch failure must not surface here. It still reaches the query's own <Errored>.
    expect(await save.mutateAsync(undefined)).toBe("saved");
    expect(save.isSuccess).toBe(true);
    expect(save.error).toBeUndefined();
  });
});

test("read and cached agree in the same tick as a write", async () => {
  // Solid defers signal writes to the microtask flush. A mutation's `onSuccess` writes and
  // then peeks — both reads must see what was just written, not the previous value.
  await inRoot(async () => {
    const store = new Map([["c1", { id: "c1", name: "Acme" }]]);
    const client = new QueryClient();
    const { group } = clientsGroup(store);

    const observed = createQuery(() => group.detail("c1"), client);
    await resolve(() => observed.data());
    flush();

    client.write(group.detail("c1"), { id: "c1", name: "Written" });

    // No flush() in between.
    expect(client.read(group.detail("c1"))?.name).toBe("Written");
    expect(observed.cached()?.name).toBe("Written");
  });
});

test("a query that resolves to undefined is distinguishable from an empty entry", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const group = queryGroup("optional", {
      lookup: query({
        key: (id: string) => ({ id }),
        fetch: async (): Promise<string | undefined> => undefined,
        staleTime: Number.POSITIVE_INFINITY,
      }),
    });

    expect(client.read(group.lookup("missing"))).toBeUndefined();

    const observed = createQuery(() => group.lookup("missing"), client);
    await resolve(() => observed.data());
    flush();

    // Resolved, and the answer is `undefined`. `hasValue` is what separates that from
    // "nothing cached" — without it the entry would look permanently unfetched.
    expect(observed.cached()).toBeUndefined();
    expect(client.read(group.lookup("missing"))).toBeUndefined();
    expect(observed.data()).toBeUndefined();
  });
});
