import { expect, test } from "bun:test";
import { createRoot, createSignal, flush, resolve } from "solid-js";
import {
  createInfiniteQuery,
  createMutation,
  createValueQuery,
  QueryClient,
  QueryTimeoutError,
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
    const query = createValueQuery(() => ({
      queryKey: ["default-client"],
      queryFn: async () => "ready",
    }));

    expect(await resolve(() => query.data())).toBe("ready");
    expect(query.cached()).toBe("ready");
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
  const options = () => ({
    queryKey: ["owned-cache"],
    queryFn: async () => {
      calls += 1;
      return "cached";
    },
    gcTime: Number.POSITIVE_INFINITY,
    staleTime: Number.POSITIVE_INFINITY,
  });

  await inRoot(async () => {
    const query = createValueQuery(options, client);
    expect(await resolve(() => query.data())).toBe("cached");
  });

  expect(client.getQueryData<string>(["owned-cache"])).toBe("cached");
  await inRoot(async () => {
    const query = createValueQuery(options, client);
    expect(await resolve(() => query.data())).toBe("cached");
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
  const options = () => ({
    queryKey: ["stale-remount"],
    queryFn: async () => {
      calls += 1;
      return calls === 1 ? 1 : refreshed.promise;
    },
    staleTime: 0,
  });

  expect(await client.fetchQuery(options())).toBe(1);
  await nextTask();

  await inRoot(async () => {
    const query = createValueQuery(options, client);

    expect(query.data()).toBe(1);
    await Promise.resolve();
    expect(calls).toBe(2);
    // Was `loading()` false / `refetching()` true: a request is running while the current
    // key already has data.
    expect(query.fetching()).toBe(true);
    expect(query.cached()).toBe(1);

    refreshed.resolve(2);
    await nextTask();

    expect(query.data()).toBe(2);
    expect(query.cached()).toBe(2);
    expect(query.fetching()).toBe(false);
  });
});

test("prefix invalidation refetches active queries and waits for settlement", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const refreshed = deferred<number>();
    let calls = 0;
    const query = createValueQuery(
      () => ({
        queryKey: ["records", { page: 1 }],
        queryFn: async () => {
          calls += 1;
          return calls === 1 ? 1 : refreshed.promise;
        },
      }),
      client,
    );

    expect(await resolve(() => query.data())).toBe(1);
    flush();

    let settled = false;
    const invalidation = client.invalidateQueries(["records"]).then(() => {
      settled = true;
    });
    await Promise.resolve();

    expect(calls).toBe(2);
    expect(query.fetching()).toBe(true);
    expect(query.pending()).toBe(false);
    expect(settled).toBe(false);

    refreshed.resolve(2);
    await invalidation;
    expect(query.cached()).toBe(2);
    expect(settled).toBe(true);
  });
});

test("an explicit refetch is affected, pending, and returns the new value", async () => {
  await inRoot(async () => {
    const refreshed = deferred<number>();
    const quietlyRefreshed = deferred<number>();
    let calls = 0;
    const query = createValueQuery(() => ({
      queryKey: ["refetch"],
      queryFn: async () => {
        calls += 1;
        if (calls === 1) return 1;
        return calls === 2 ? refreshed.promise : quietlyRefreshed.promise;
      },
    }));

    await resolve(() => query.data());
    const result = query.refetch();
    await Promise.resolve();

    expect(query.fetching()).toBe(true);
    expect(query.pending()).toBe(true);

    refreshed.resolve(2);
    expect(await result).toBe(2);
    expect(query.cached()).toBe(2);
    expect(query.pending()).toBe(false);

    const quietResult = query.refresh();
    await Promise.resolve();
    expect(query.fetching()).toBe(true);
    expect(query.pending()).toBe(false);

    quietlyRefreshed.resolve(3);
    expect(await quietResult).toBe(3);
    expect(query.cached()).toBe(3);
  });
});

test("a superseded key cannot overwrite the current value", async () => {
  await inRoot(async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const [id, setId] = createSignal(1);
    const query = createValueQuery(() => {
      const currentId = id();
      return {
        queryKey: ["record", currentId],
        queryFn: () => (currentId === 1 ? first.promise : second.promise),
      };
    });

    const firstRead = resolve(() => query.data()).catch(() => undefined);
    await Promise.resolve();
    setId(2);
    flush();
    const secondRead = resolve(() => query.data());
    second.resolve("second");

    expect(await secondRead).toBe("second");
    expect(query.cached()).toBe("second");

    first.resolve("first");
    await firstRead;
    await Promise.resolve();
    expect(query.cached()).toBe("second");
  });
});

test("an active query follows key changes when consumers only peek at the cache", async () => {
  await inRoot(async () => {
    const second = deferred<string>();
    const [id, setId] = createSignal(1);
    let calls = 0;
    const query = createValueQuery(() => {
      const currentId = id();
      return {
        queryKey: ["latest-only", currentId],
        queryFn: async () => {
          calls += 1;
          return currentId === 1 ? "first" : second.promise;
        },
      };
    });

    await resolve(() => query.data());
    expect(query.cached()).toBe("first");

    setId(2);
    flush();
    await Promise.resolve();
    expect(calls).toBe(2);

    second.resolve("second");
    await nextTask();
    expect(query.cached()).toBe("second");
  });
});

test("mutation pending includes awaited query invalidation", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const refreshed = deferred<number>();
    let calls = 0;
    const query = createValueQuery(
      () => ({
        queryKey: ["records"],
        queryFn: async () => {
          calls += 1;
          return calls === 1 ? 1 : refreshed.promise;
        },
      }),
      client,
    );
    const mutation = createMutation(
      () => ({
        mutationFn: async () => "saved",
        invalidates: [["records"]],
      }),
      client,
    );

    await resolve(() => query.data());
    flush();
    const result = mutation.mutateAsync(undefined);
    await Promise.resolve();
    await Promise.resolve();

    expect(mutation.isPending).toBe(true);
    expect(query.fetching()).toBe(true);
    expect(query.pending()).toBe(true);

    refreshed.resolve(2);
    expect(await result).toBe("saved");
    expect(mutation.isPending).toBe(false);
    expect(query.cached()).toBe(2);
    expect(query.pending()).toBe(false);
  });
});

test("infinite queries cache later pages and reset on a new key", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const [scope, setScope] = createSignal("first");
    const calls: string[] = [];
    const query = createInfiniteQuery(() => {
      const currentScope = scope();
      return {
        queryKey: ["feed", currentScope],
        initialPageParam: 0,
        queryFn: async ({ pageParam }: { pageParam: number }) => {
          calls.push(`${currentScope}:${pageParam}`);
          return { next: pageParam < 1 ? pageParam + 1 : undefined, value: currentScope };
        },
        getNextPageParam: (page: { next?: number }) => page.next,
      };
    }, client);

    await resolve(() => query.data());
    flush();
    await query.fetchNextPage();
    expect(query.cached()?.pages).toHaveLength(2);

    const refetched = await query.refetch();
    expect(refetched.pages).toHaveLength(2);
    expect(calls).toEqual(["first:0", "first:1", "first:0", "first:1"]);

    setScope("second");
    flush();
    expect(query.hasNextPage()).toBe(false);
    await resolve(() => query.data());
    flush();

    expect(query.cached()?.pages).toEqual([{ next: 1, value: "second" }]);
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
    const query = createValueQuery(() => ({
      queryKey: ["polling"],
      queryFn: async () => {
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
    }));

    expect(await resolve(() => query.data())).toBe(1);
    await secondStarted.promise;
    expect(query.cached()).toBe(1);
    expect(query.fetching()).toBe(true);
    expect(query.pending()).toBe(false);

    releaseSecond.resolve();
    await thirdSucceeded.promise;
    await nextTask();
    flush();
    expect(query.cached()).toBe(3);

    dispose();
    const callsAtDispose = calls;
    await new Promise((resolveWait) => setTimeout(resolveWait, 5));
    expect(calls).toBe(callsAtDispose);
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
