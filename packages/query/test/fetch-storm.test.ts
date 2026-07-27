import { expect, test } from "bun:test";
import { createRoot, createSignal, flush, resolve } from "solid-js";
import { createInfiniteQuery, createValueQuery, QueryClient } from "../src/index.tsx";

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
 * These tests pass today only because recomputes hit the cache and receive the same
 * promise identity, so `_inFlight` dedupes them. That is a masked violation, not a safe
 * pattern: they exist to fail loudly if the dedupe is ever weakened, and to stay green
 * once the rewrite moves fetch initiation out of the memo entirely.
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
    const query = createValueQuery(() => ({
      queryKey: ["storm-pending"],
      queryFn: () => {
        calls += 1;
        return request.promise;
      },
    }));

    const read = resolve(() => query.data());
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
    const query = createValueQuery(() => ({
      queryKey: ["storm-settled"],
      queryFn: async () => {
        calls += 1;
        return calls;
      },
      staleTime: Number.POSITIVE_INFINITY,
    }));

    await resolve(() => query.data());
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
    const query = createValueQuery(() => ({
      queryKey: ["storm-fresh-promise"],
      queryFn: () => {
        calls += 1;
        return new Promise<number>((resolveRequest) => {
          setTimeout(() => resolveRequest(calls), 1);
        });
      },
      staleTime: Number.POSITIVE_INFINITY,
    }));

    await resolve(() => query.data());
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
    const options = () => ({
      queryKey: ["storm-shared"],
      queryFn: () => {
        calls += 1;
        return request.promise;
      },
      staleTime: Number.POSITIVE_INFINITY,
    });

    const readers = Array.from({ length: 5 }, () => createValueQuery(options, client));
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
    const query = createInfiniteQuery(() => ({
      queryKey: ["storm-infinite"],
      initialPageParam: 0,
      queryFn: () => {
        calls += 1;
        return request.promise;
      },
      getNextPageParam: () => undefined,
      staleTime: Number.POSITIVE_INFINITY,
    }));

    const read = resolve(() => query.data());
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
