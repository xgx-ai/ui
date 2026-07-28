import { expect, test } from "bun:test";
import { createEffect, createRoot, createSignal, flush, resolve } from "solid-js";
import {
  createInfiniteQuery,
  createQuery,
  infiniteQuery,
  QueryClient,
  query,
  queryGroup,
} from "../src/index.tsx";

/**
 * Guards the "never start a fetch inside a memo compute" invariant.
 *
 * A memo returning a promise becomes an async computation: the compute throws
 * `NotReadyError`, the node re-enters the pending queue, and once the promise settles any
 * clock advance re-runs the compute. If the compute *starts* the request rather than
 * observing one the cache already holds, every re-run fires a new request and that
 * request's own writes advance the clock — a self-sustaining refetch loop that presents as
 * one request per frame. This is what `createInfiniteQuery` did when `loadInitialPage`
 * was called inside `createMemo`.
 *
 * `createQueryResult` does still call `readQuery` — which can start a request — from
 * inside the `data` memo. Phase 3 set out to move that out, but no scenario could be
 * constructed where it misbehaves: the pending, settled, failed, idle-at-default-stale-time
 * and many-readers paths below all hold. What actually protects the invariant is the cache
 * entry, which owns the promise, so every recompute observes the *same* promise identity
 * rather than creating one. The read path was therefore left alone and these tests pin the
 * property that makes it safe. They fail loudly if that dedupe is ever weakened.
 *
 * Caveat: these run headless, without a web renderer, so effect and memo propagation does
 * not pump the way it does in a browser. They catch a caller-driven storm but cannot prove
 * the absence of a renderer-driven one. The browser check in Phase 1 of the plan is the
 * authoritative verification.
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

function deferred<T>() {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolveDeferred) => {
    resolvePromise = resolveDeferred;
  });
  return { promise, resolve: resolvePromise };
}

/** Advances the reactive clock repeatedly, the way an active application does. */
async function churnClock(times = 20) {
  const [tick, setTick] = createSignal(0);
  for (let index = 0; index < times; index += 1) {
    setTick(index + 1);
    flush();
    tick();
    await Promise.resolve();
  }
}

test("a pending value query does not restart while the clock advances", async () => {
  await inRoot(async () => {
    const request = deferred<string>();
    let calls = 0;
    const storm = queryGroup("storm-pending", {
      value: query({
        key: () => ({}),
        fetch: () => {
          calls += 1;
          return request.promise;
        },
      }),
    });
    const observed = createQuery(() => storm.value());

    const read = resolve(() => observed.data());
    await Promise.resolve();
    await churnClock();

    expect(calls).toBe(1);

    request.resolve("ready");
    expect(await read).toBe("ready");
    expect(calls).toBe(1);
  });
});

test("a settled value query does not restart while the clock advances", async () => {
  await inRoot(async () => {
    let calls = 0;
    const storm = queryGroup("storm-settled", {
      value: query({
        key: () => ({}),
        fetch: async () => {
          calls += 1;
          return calls;
        },
        staleTime: Number.POSITIVE_INFINITY,
      }),
    });
    const observed = createQuery(() => storm.value());

    await resolve(() => observed.data());
    flush();
    await churnClock();

    expect(calls).toBe(1);
  });
});

test("a query function returning a fresh promise each call still runs once", async () => {
  // The dedupe that currently masks the invariant is promise identity held on the cache
  // entry. This asserts the entry — not the caller — is what makes the read idempotent.
  await inRoot(async () => {
    let calls = 0;
    const storm = queryGroup("storm-fresh-promise", {
      value: query({
        key: () => ({}),
        fetch: () => {
          calls += 1;
          return new Promise<number>((resolveRequest) => {
            setTimeout(() => resolveRequest(calls), 1);
          });
        },
        staleTime: Number.POSITIVE_INFINITY,
      }),
    });
    const observed = createQuery(() => storm.value());

    await resolve(() => observed.data());
    flush();
    await churnClock();

    expect(calls).toBe(1);
  });
});

test("many independent readers of one query share a single request", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const request = deferred<string>();
    let calls = 0;
    const storm = queryGroup("storm-shared", {
      value: query({
        key: () => ({}),
        fetch: () => {
          calls += 1;
          return request.promise;
        },
        staleTime: Number.POSITIVE_INFINITY,
      }),
    });

    const readers = Array.from({ length: 5 }, () => createQuery(() => storm.value(), client));
    const reads = readers.map((reader) => resolve(() => reader.data()));
    await Promise.resolve();
    await churnClock();

    expect(calls).toBe(1);

    request.resolve("ready");
    expect(await Promise.all(reads)).toEqual(["ready", "ready", "ready", "ready", "ready"]);
    expect(calls).toBe(1);
  });
});

test("a pending infinite query does not restart its first page", async () => {
  // The original storm: `loadInitialPage` was called inside `createMemo`, so every
  // recompute after settlement fired another first-page request.
  await inRoot(async () => {
    const request = deferred<{ data: number[] }>();
    let calls = 0;
    const storm = queryGroup("storm-infinite", {
      pages: infiniteQuery({
        key: () => ({}),
        initialPageParam: 0,
        fetch: () => {
          calls += 1;
          return request.promise;
        },
        getNextPageParam: () => undefined,
        staleTime: Number.POSITIVE_INFINITY,
      }),
    });
    const observed = createInfiniteQuery(() => storm.pages());

    const read = resolve(() => observed.data());
    await Promise.resolve();
    await churnClock();

    expect(calls).toBe(1);

    request.resolve({ data: [1] });
    await read;
    flush();
    await churnClock();

    expect(calls).toBe(1);
  });
});

test("an active query does not refetch while idle at the default stale time", async () => {
  // The storm path that would matter in production: the entry goes stale immediately
  // (default `staleTime` of 0), and `readQuery` starts a background refresh whenever the
  // memo recomputes while stale. A refresh writes `data`, which the memo observes — so if
  // a settle could trigger a recompute after the stale timer fires, the query would feed
  // itself forever.
  await inRoot(async () => {
    let calls = 0;
    const storm = queryGroup("storm-idle", {
      value: query({
        key: () => ({}),
        fetch: async () => {
          calls += 1;
          return calls;
        },
      }),
    });
    const observed = createQuery(() => storm.value());

    // An active consumer, standing in for a rendered component reading `data()`.
    createEffect(
      () => observed.data(),
      () => {},
    );

    await resolve(() => observed.data());
    flush();
    expect(calls).toBe(1);

    await new Promise((settle) => setTimeout(settle, 200));
    flush();

    expect(calls).toBe(1);
  });
});

test("a failed query does not restart on repeated reads", async () => {
  // On failure the cache clears `entry.promise` and never sets `hasData`, so a compute
  // that re-entered `readQuery` would start a fresh request every time it ran.
  await inRoot(async () => {
    let calls = 0;
    const storm = queryGroup("storm-failed", {
      value: query({
        key: () => ({}),
        fetch: async (): Promise<never> => {
          calls += 1;
          throw new Error("upstream is down");
        },
      }),
    });
    const observed = createQuery(() => storm.value());

    await resolve(() => observed.data()).catch(() => undefined);
    expect(calls).toBe(1);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        observed.data();
      } catch {
        // The read re-throws the stored failure; that must not re-ask the question.
      }
      await Promise.resolve();
    }
    await churnClock();

    expect(calls).toBe(1);
  });
});
