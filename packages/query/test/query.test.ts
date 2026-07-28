import { expect, test } from "bun:test";
import { createEffect, createRoot, createSignal, flush, resolve } from "solid-js";
import {
  createInfiniteQuery,
  createMutation,
  createQuery,
  infiniteQuery,
  QueryClient,
  QueryTimeoutError,
  query,
  queryGroup,
} from "../src/index.tsx";

function deferred<T>() {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolveDeferred, rejectDeferred) => {
    resolvePromise = resolveDeferred;
    rejectPromise = rejectDeferred;
  });
  return { promise, reject: rejectPromise, resolve: resolvePromise };
}

function nextTask() {
  return new Promise<void>((resolveTask) => setTimeout(resolveTask, 0));
}

async function inRoot<T>(run: (dispose: () => void) => Promise<T>): Promise<T> {
  let disposeRoot = () => {};
  const promise = createRoot((dispose) => {
    disposeRoot = dispose;
    return run(dispose);
  });

  try {
    return await promise;
  } finally {
    disposeRoot();
  }
}

test("the default client works without a provider", async () => {
  await inRoot(async () => {
    const group = queryGroup("default-client", {
      value: query({ key: () => ({}), fetch: async () => "ready" }),
    });
    const observed = createQuery(() => group.value());

    expect(await resolve(() => observed.data())).toBe("ready");
    expect(observed.cached()).toBe("ready");
  });
});

test("structurally equal keys deduplicate requests", async () => {
  const client = new QueryClient();
  const request = deferred<string>();
  let calls = 0;
  const first = client.fetchQuery({
    queryKey: ["records", { page: 1, search: "north" }],
    queryFn: async () => {
      calls += 1;
      return request.promise;
    },
  });
  const second = client.fetchQuery({
    queryKey: ["records", { search: "north", page: 1 }],
    queryFn: async () => {
      calls += 1;
      return "duplicate";
    },
  });

  await Promise.resolve();
  expect(calls).toBe(1);
  request.resolve("shared");
  expect(await first).toBe("shared");
  expect(await second).toBe("shared");
});

test("cache ownership survives the component that first observed it", async () => {
  const client = new QueryClient();
  let calls = 0;
  const group = queryGroup("owned-cache", {
    value: query({
      key: () => ({}),
      fetch: async () => {
        calls += 1;
        return "cached";
      },
      gcTime: Number.POSITIVE_INFINITY,
      staleTime: Number.POSITIVE_INFINITY,
    }),
  });

  await inRoot(async () => {
    const observed = createQuery(() => group.value(), client);
    expect(await resolve(() => observed.data())).toBe("cached");
  });

  expect(client.read(group.value())).toBe("cached");
  await inRoot(async () => {
    const observed = createQuery(() => group.value(), client);
    expect(await resolve(() => observed.data())).toBe("cached");
  });
  expect(calls).toBe(1);
});

test("stale time waits for a later trigger instead of looping after settlement", async () => {
  const client = new QueryClient();
  let calls = 0;
  const options = {
    queryKey: ["stale"],
    queryFn: async () => ++calls,
    staleTime: 0,
  };

  expect(await client.fetchQuery(options)).toBe(1);
  expect(await client.fetchQuery(options)).toBe(1);
  await nextTask();
  expect(await client.fetchQuery(options)).toBe(2);
});

test("a remounted stale query renders cached data while refreshing", async () => {
  const client = new QueryClient();
  const refreshed = deferred<number>();
  let calls = 0;
  const group = queryGroup("stale-remount", {
    value: query({
      key: () => ({}),
      fetch: async () => {
        calls += 1;
        return calls === 1 ? 1 : refreshed.promise;
      },
      staleTime: 0,
    }),
  });

  expect(await client.prefetch(group.value())).toBe(1);
  await nextTask();

  await inRoot(async () => {
    const observed = createQuery(() => group.value(), client);

    expect(observed.data()).toBe(1);
    await Promise.resolve();
    expect(calls).toBe(2);
    // Was `loading()` false / `refetching()` true: a request is running while the current
    // key already has data.
    expect(observed.fetching()).toBe(true);
    expect(observed.cached()).toBe(1);

    refreshed.resolve(2);
    await nextTask();

    expect(observed.data()).toBe(2);
    expect(observed.cached()).toBe(2);
    expect(observed.fetching()).toBe(false);
  });
});

test("prefix invalidation refetches active queries and waits for settlement", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const refreshed = deferred<number>();
    let calls = 0;
    const group = queryGroup("records", {
      page: query({
        key: (page: number) => ({ page }),
        fetch: async () => {
          calls += 1;
          return calls === 1 ? 1 : refreshed.promise;
        },
      }),
    });
    const observed = createQuery(() => group.page(1), client);

    expect(await resolve(() => observed.data())).toBe(1);
    flush();

    let settled = false;
    const invalidation = client.invalidate(group.all).then(() => {
      settled = true;
    });
    await Promise.resolve();

    expect(calls).toBe(2);
    expect(observed.fetching()).toBe(true);
    expect(observed.pending()).toBe(false);
    expect(settled).toBe(false);

    refreshed.resolve(2);
    await invalidation;
    expect(observed.cached()).toBe(2);
    expect(settled).toBe(true);
  });
});

test("an explicit refetch is affected, pending, and returns the new value", async () => {
  await inRoot(async () => {
    const refreshed = deferred<number>();
    const quietlyRefreshed = deferred<number>();
    let calls = 0;
    const group = queryGroup("refetch", {
      value: query({
        key: () => ({}),
        fetch: async () => {
          calls += 1;
          if (calls === 1) return 1;
          return calls === 2 ? refreshed.promise : quietlyRefreshed.promise;
        },
      }),
    });
    const observed = createQuery(() => group.value());

    await resolve(() => observed.data());
    const result = observed.refetch();
    await Promise.resolve();

    expect(observed.fetching()).toBe(true);
    expect(observed.pending()).toBe(true);

    refreshed.resolve(2);
    expect(await result).toBe(2);
    expect(observed.cached()).toBe(2);
    expect(observed.pending()).toBe(false);

    const quietResult = observed.refresh();
    await Promise.resolve();
    expect(observed.fetching()).toBe(true);
    expect(observed.pending()).toBe(false);

    quietlyRefreshed.resolve(3);
    expect(await quietResult).toBe(3);
    expect(observed.cached()).toBe(3);
  });
});

test("a superseded key cannot overwrite the current value", async () => {
  await inRoot(async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const [id, setId] = createSignal(1);
    const group = queryGroup("record", {
      detail: query({
        key: (recordId: number) => ({ recordId }),
        fetch: (key) => (key.recordId === 1 ? first.promise : second.promise),
      }),
    });
    const observed = createQuery(() => group.detail(id()));

    const firstRead = resolve(() => observed.data()).catch(() => undefined);
    await Promise.resolve();
    setId(2);
    flush();
    const secondRead = resolve(() => observed.data());
    second.resolve("second");

    expect(await secondRead).toBe("second");
    expect(observed.cached()).toBe("second");

    first.resolve("first");
    await firstRead;
    await Promise.resolve();
    expect(observed.cached()).toBe("second");
  });
});

test("an active query follows key changes when consumers only peek at the cache", async () => {
  await inRoot(async () => {
    const second = deferred<string>();
    const [id, setId] = createSignal(1);
    let calls = 0;
    const group = queryGroup("latest-only", {
      detail: query({
        key: (recordId: number) => ({ recordId }),
        fetch: async (key) => {
          calls += 1;
          return key.recordId === 1 ? "first" : second.promise;
        },
      }),
    });
    const observed = createQuery(() => group.detail(id()));

    await resolve(() => observed.data());
    expect(observed.cached()).toBe("first");

    setId(2);
    flush();
    await Promise.resolve();
    expect(calls).toBe(2);

    second.resolve("second");
    await nextTask();
    expect(observed.cached()).toBe("second");
  });
});

test("mutation pending includes awaited query invalidation", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const refreshed = deferred<number>();
    let calls = 0;
    const group = queryGroup("records", {
      list: query({
        key: () => ({}),
        fetch: async () => {
          calls += 1;
          return calls === 1 ? 1 : refreshed.promise;
        },
      }),
    });
    const observed = createQuery(() => group.list(), client);
    const mutation = createMutation(
      () => ({
        mutationFn: async () => "saved",
        invalidates: () => [group.all],
      }),
      client,
    );

    await resolve(() => observed.data());
    flush();
    const result = mutation.mutateAsync(undefined);
    await Promise.resolve();
    await Promise.resolve();

    expect(mutation.isPending).toBe(true);
    expect(observed.pending()).toBe(true);
    // `fetching()` is a plain signal, and `mutateAsync` runs inside a Solid `action` — so
    // the write that flips it lands in the action's transition and outside readers keep
    // seeing the pre-mutation value until the action settles. `pending()` is the
    // transition-aware answer and is what a spinner should read during a mutation.
    expect(observed.fetching()).toBe(false);

    refreshed.resolve(2);
    expect(await result).toBe("saved");
    expect(mutation.isPending).toBe(false);
    expect(observed.cached()).toBe(2);
    expect(observed.pending()).toBe(false);
    expect(observed.fetching()).toBe(false);
  });
});

type FeedPage = { next: number | undefined; value: string };

test("infinite queries cache later pages and reset on a new key", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const [scope, setScope] = createSignal("first");
    const calls: string[] = [];
    const group = queryGroup("feed", {
      pages: infiniteQuery({
        key: (feedScope: string) => ({ scope: feedScope }),
        initialPageParam: 0,
        fetch: async (key, context): Promise<FeedPage> => {
          calls.push(`${key.scope}:${context.pageParam}`);
          return {
            next: context.pageParam < 1 ? context.pageParam + 1 : undefined,
            value: key.scope,
          };
        },
        getNextPageParam: (page: FeedPage) => page.next,
      }),
    });
    const observed = createInfiniteQuery(() => group.pages(scope()), client);

    await resolve(() => observed.data());
    flush();
    await observed.fetchNextPage();
    expect(observed.cached()?.pages).toHaveLength(2);

    const refetched = await observed.refetch();
    expect(refetched.pages).toHaveLength(2);
    expect(calls).toEqual(["first:0", "first:1", "first:0", "first:1"]);

    setScope("second");
    flush();
    expect(observed.hasNextPage()).toBe(false);
    await resolve(() => observed.data());
    flush();

    expect(observed.cached()?.pages).toEqual([{ next: 1, value: "second" }]);
    expect(calls).toEqual(["first:0", "first:1", "first:0", "first:1", "second:0"]);
  });
});

test("retry and timeout policies are enforced", async () => {
  const client = new QueryClient();
  let attempts = 0;
  const value = await client.fetchQuery({
    queryKey: ["retry"],
    queryFn: async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("try again");
      return "ready";
    },
    retry: 2,
    retryDelay: 0,
  });

  expect(value).toBe("ready");
  expect(attempts).toBe(3);

  await expect(
    client.fetchQuery({
      queryKey: ["timeout"],
      queryFn: ({ signal }) =>
        new Promise<never>((_, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
      timeoutMs: 5,
    }),
  ).rejects.toBeInstanceOf(QueryTimeoutError);
});

test("active queries poll quietly, recover from failure, and stop when disposed", async () => {
  let calls = 0;
  const secondStarted = deferred<void>();
  const releaseSecond = deferred<void>();
  const thirdSucceeded = deferred<void>();

  await inRoot(async (dispose) => {
    const group = queryGroup("polling", {
      value: query({
        key: () => ({}),
        fetch: async () => {
          calls += 1;
          if (calls === 2) {
            secondStarted.resolve();
            await releaseSecond.promise;
            throw new Error("temporary");
          }
          if (calls === 3) thirdSucceeded.resolve();
          return calls;
        },
        refetchInterval: 1,
      }),
    });
    const observed = createQuery(() => group.value());

    expect(await resolve(() => observed.data())).toBe(1);
    await secondStarted.promise;
    expect(observed.cached()).toBe(1);
    expect(observed.fetching()).toBe(true);
    expect(observed.pending()).toBe(false);

    releaseSecond.resolve();
    await thirdSucceeded.promise;
    await nextTask();
    flush();
    expect(observed.cached()).toBe(3);

    dispose();
    const callsAtDispose = calls;
    await new Promise((resolveWait) => setTimeout(resolveWait, 5));
    expect(calls).toBe(callsAtDispose);
  });
});

test("cached() re-runs reactive consumers on every write, not just the first", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    let status = "draft";
    const group = queryGroup("cached-reactivity", {
      value: query({
        key: () => ({}),
        fetch: async () => ({ status }),
      }),
    });
    const observed = createQuery(() => group.value(), client);
    const seen: string[] = [];
    createEffect(
      () => observed.cached(),
      (value) => {
        if (value) seen.push(value.status);
      },
    );

    await resolve(() => observed.data());
    flush();
    expect(seen).toEqual(["draft"]);

    status = "published";
    await client.invalidate(group.all);
    flush();

    // `hasData` stays true across a refetch, so subscribing to it alone froze every consumer
    // of `cached` on the first answer — a table row kept its old status after the mutation
    // that invalidated it.
    expect(observed.cached()?.status).toBe("published");
    expect(seen).toEqual(["draft", "published"]);
  });
});

test("an infinite query's retained pages follow an invalidation refetch", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    let status = "draft";
    const group = queryGroup("cached-reactivity-infinite", {
      list: infiniteQuery({
        key: () => ({}),
        initialPageParam: 0,
        fetch: async () => ({ data: [{ id: "a", status }] }),
        getNextPageParam: () => undefined,
      }),
    });
    const observed = createInfiniteQuery(() => group.list(), client);

    await resolve(() => observed.data());
    flush();
    expect(observed.retained()?.pages[0].data[0].status).toBe("draft");

    status = "published";
    await client.invalidate(group.all);
    flush();

    expect(observed.cached()?.pages[0].data[0].status).toBe("published");
    expect(observed.retained()?.pages[0].data[0].status).toBe("published");
  });
});

test("inactive query data is garbage collected", async () => {
  const client = new QueryClient();
  await client.fetchQuery({
    queryKey: ["temporary"],
    queryFn: async () => "cached",
    gcTime: 0,
    staleTime: Number.POSITIVE_INFINITY,
  });
  await nextTask();

  expect(client.getQueryData<string>(["temporary"])).toBeUndefined();
});
