import { expect, test } from "bun:test";
import { createMemo, createRoot, createSignal, flush, resolve } from "solid-js";
import { createInfiniteQuery, infiniteQuery, QueryClient, queryGroup } from "../src/index.tsx";

async function nextTask() {
  await new Promise((done) => setTimeout(done, 0));
  flush();
}

test("a rejected previous-key page cannot freeze the current infinite query", async () => {
  let disposeRoot = () => {};
  const pendingTest = createRoot((dispose) => {
    disposeRoot = dispose;
    return (async () => {
      const client = new QueryClient();
      const [scope, setScope] = createSignal("first");
      let rejectPage!: (cause: Error) => void;
      const group = queryGroup("pagination-filter", {
        list: infiniteQuery({
          key: (scope: string) => ({ scope }),
          initialPageParam: 0,
          fetch: (_key, { pageParam }) =>
            pageParam === 0
              ? Promise.resolve([scope()])
              : new Promise<string[]>((_complete, reject) => {
                  rejectPage = reject;
                }),
          getNextPageParam: (_page: string[], _pages, pageParam) =>
            pageParam === 0 ? 1 : undefined,
        }),
      });
      const descriptor = createMemo(() => group.list(scope()));
      const observed = createInfiniteQuery(descriptor, client);
      const data = createMemo(() => observed.cached() ?? observed.retained() ?? observed.data());
      expect((await resolve(data)).pages).toEqual([["first"]]);
      flush();
      const firstPending = observed.fetchNextPage().catch((error) => error);
      rejectPage(new Error("Page failed"));
      expect((await firstPending).message).toBe("Page failed");
      await nextTask();
      setScope("second");
      flush();
      await nextTask();
      expect(data().pages).toEqual([["second"]]);
      const secondPending = observed.fetchNextPage().catch((error) => error);
      const rejectPrevious = rejectPage;
      setScope("third");
      flush();
      await nextTask();
      rejectPrevious(new Error("Previous filter failed"));
      expect((await secondPending).message).toBe("Previous filter failed");
      await nextTask();
      expect(scope()).toBe("third");
      expect(data().pages).toEqual([["third"]]);
      expect(observed.cached()?.pages).toEqual([["third"]]);
      expect((await resolve(observed.data)).pages).toEqual([["third"]]);
      expect(observed.fetchingNextPage()).toBe(false);
      client.remove(group.list.all);
    })();
  });
  try {
    await pendingTest;
  } finally {
    disposeRoot();
  }
});

test("page requests deduplicate per key and report only the current key's activity", async () => {
  let disposeRoot = () => {};
  const pendingTest = createRoot((dispose) => {
    disposeRoot = dispose;
    return (async () => {
      const client = new QueryClient();
      const [scope, setScope] = createSignal("first");
      const pages = new Map<string, (value: string[]) => void>();
      const group = queryGroup("pagination-concurrency", {
        list: infiniteQuery({
          key: (scope: string) => ({ scope }),
          initialPageParam: 0,
          fetch: (key, { pageParam }) =>
            pageParam === 0
              ? Promise.resolve([key.scope])
              : new Promise<string[]>((complete) => {
                  pages.set(key.scope, complete);
                }),
          getNextPageParam: (_page: string[], _pages, pageParam) =>
            pageParam === 0 ? 1 : undefined,
        }),
      });
      const observed = createInfiniteQuery(() => group.list(scope()), client);
      await resolve(observed.data);
      flush();
      const first = observed.fetchNextPage();
      expect(observed.fetchNextPage()).toBe(first);
      flush();
      expect(observed.fetchingNextPage()).toBe(true);
      setScope("second");
      flush();
      await nextTask();
      expect(observed.fetchingNextPage()).toBe(false);
      const second = observed.fetchNextPage();
      expect(observed.fetchNextPage()).toBe(second);
      flush();
      expect(observed.fetchingNextPage()).toBe(true);
      pages.get("first")!(["first-next"]);
      await first;
      flush();
      expect(observed.fetchingNextPage()).toBe(true);
      expect(observed.cached()?.pages).toEqual([["second"]]);
      pages.get("second")!(["second-next"]);
      await second;
      flush();
      expect(observed.fetchingNextPage()).toBe(false);
      expect(observed.cached()?.pages).toEqual([["second"], ["second-next"]]);
      expect(client.getQueryData<{ pages: string[][] }>(group.list("first").key)?.pages).toEqual([
        ["first"],
        ["first-next"],
      ]);
      client.remove(group.list.all);
    })();
  });
  try {
    await pendingTest;
  } finally {
    disposeRoot();
  }
});
