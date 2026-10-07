import { expect, test } from "bun:test";
import { createMemo, createRoot, createSignal, flush, resolve } from "solid-js";
import { createInfiniteQuery, infiniteQuery, QueryClient, queryGroup } from "../src/index.tsx";

/**
 * Next-page loading: one request per cache entry, appended only onto the pages it was built
 * from, and aborted (never written) once superseded. See S10's "Pagination" note in
 * docs/solid-2-beta-issues.md.
 *
 * Every fetcher here reads its key, never ambient reactive state: `fetch` must depend only on
 * the key and the page param (docs/query.md).
 */

async function nextTask() {
  await new Promise((done) => setTimeout(done, 0));
  flush();
}

async function inRoot(run: () => Promise<void>): Promise<void> {
  let disposeRoot = () => {};
  const pending = createRoot((dispose) => {
    disposeRoot = dispose;
    return run();
  });
  try {
    await pending;
  } finally {
    disposeRoot();
  }
}

type PageRequest = {
  scope: string;
  pageParam: number;
  signal: AbortSignal;
  complete: (rows: string[]) => void;
  fail: (cause: Error) => void;
};

/** First pages answer at once unless `holdFirstPages`; every other page waits for the test. */
function pagedList(name: string) {
  const requests: PageRequest[] = [];
  const server = { holdFirstPages: false, requests };
  const group = queryGroup(name, {
    list: infiniteQuery({
      key: (scope: string) => ({ scope }),
      initialPageParam: 0,
      fetch: (key, { pageParam, signal }) =>
        pageParam === 0 && !server.holdFirstPages
          ? Promise.resolve([key.scope])
          : new Promise<string[]>((complete, fail) => {
              requests.push({ scope: key.scope, pageParam, signal, complete, fail });
            }),
      getNextPageParam: (_page: string[], pages, pageParam) =>
        pages.length < 3 ? pageParam + 1 : undefined,
    }),
  });
  return { group, server, requests };
}

test("a rejected or superseded previous-key page cannot freeze the current infinite query", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const { group, requests } = pagedList("pagination-filter");
    const [scope, setScope] = createSignal("first");
    const descriptor = createMemo(() => group.list(scope()));
    const observed = createInfiniteQuery(descriptor, client);
    const data = createMemo(() => observed.cached() ?? observed.retained() ?? observed.data());
    expect((await resolve(data)).pages).toEqual([["first"]]);
    flush();

    // A genuine failure rejects, and the query stays usable.
    const failed = observed.fetchNextPage().catch((error: Error) => error);
    requests[0]!.fail(new Error("Page failed"));
    expect(((await failed) as Error).message).toBe("Page failed");
    await nextTask();
    expect(observed.fetchingNextPage()).toBe(false);

    setScope("second");
    flush();
    await nextTask();
    expect(data().pages).toEqual([["second"]]);

    // Moving to a new key supersedes the old key's page: aborted, resolved, never written.
    const superseded = observed.fetchNextPage();
    const previous = requests[1]!;
    setScope("third");
    flush();
    await nextTask();
    expect(previous.signal.aborted).toBe(true);
    previous.fail(new Error("Previous filter failed"));
    expect(await superseded).toBeUndefined();
    await nextTask();

    expect(scope()).toBe("third");
    expect(data().pages).toEqual([["third"]]);
    expect(observed.cached()?.pages).toEqual([["third"]]);
    expect((await resolve(observed.data)).pages).toEqual([["third"]]);
    expect(observed.fetchingNextPage()).toBe(false);
    expect(client.getQueryData<{ pages: string[][] }>(group.list("second").key)?.pages).toEqual([
      ["second"],
    ]);
    client.remove(group.list.all);
  });
});

test("page requests deduplicate per key and report only the current key's activity", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const { group, requests } = pagedList("pagination-concurrency");
    const [scope, setScope] = createSignal("first");
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

    // The first key lost its only observer, so its page was superseded, not appended.
    const [firstRequest, secondRequest] = requests;
    expect(firstRequest!.signal.aborted).toBe(true);
    expect(secondRequest!.signal.aborted).toBe(false);
    firstRequest!.complete(["first-next"]);
    await first;
    flush();
    expect(observed.fetchingNextPage()).toBe(true);
    expect(observed.cached()?.pages).toEqual([["second"]]);

    secondRequest!.complete(["second-next"]);
    await second;
    flush();
    expect(observed.fetchingNextPage()).toBe(false);
    expect(observed.cached()?.pages).toEqual([["second"], ["second-next"]]);
    expect(client.getQueryData<{ pages: string[][] }>(group.list("first").key)?.pages).toEqual([
      ["first"],
    ]);
    client.remove(group.list.all);
  });
});

test("observers of one key share a next-page request, so a page is never appended twice", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const { group, requests } = pagedList("pagination-shared");
    const table = createInfiniteQuery(() => group.list("all"), client);
    const summary = createInfiniteQuery(() => group.list("all"), client);
    await resolve(table.data);
    await resolve(summary.data);
    flush();

    const fromTable = table.fetchNextPage();
    const fromSummary = summary.fetchNextPage();
    flush();
    expect(table.fetchingNextPage()).toBe(true);
    expect(summary.fetchingNextPage()).toBe(true);

    // Land every request in its own flush: two independent appends would leave [0, 1, 1].
    for (const request of [...requests]) {
      request.complete([`page-${request.pageParam}`]);
      await nextTask();
    }
    await Promise.all([fromTable, fromSummary]);
    flush();

    expect(table.cached()?.pageParams).toEqual([0, 1]);
    expect(summary.cached()?.pages).toEqual([["all"], ["page-1"]]);
    expect(requests).toHaveLength(1);
    expect(fromSummary).toBe(fromTable);
    expect(table.fetchingNextPage()).toBe(false);
    expect(summary.fetchingNextPage()).toBe(false);
    client.remove(group.list.all);
  });
});

test("a page is appended only while the entry still ends where it was requested", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const { group, requests } = pagedList("pagination-guard");
    const query = createInfiniteQuery(() => group.list("all"), client);
    const key = group.list("all").key;
    await resolve(query.data);
    flush();

    // Rows edited, same tail: the page still extends it.
    const extended = query.fetchNextPage();
    client.setQueryData(key, { pages: [["edited"]], pageParams: [0] });
    requests[0]!.complete(["page-1"]);
    await extended;
    flush();
    expect(query.cached()).toEqual({ pages: [["edited"], ["page-1"]], pageParams: [0, 1] });

    // Tail moved on before the response landed: the late page is dropped, not duplicated.
    const late = query.fetchNextPage();
    expect(requests[1]!.pageParam).toBe(2);
    client.setQueryData(key, {
      pages: [["edited"], ["page-1"], ["written"]],
      pageParams: [0, 1, 2],
    });
    requests[1]!.complete(["page-2"]);
    await late;
    flush();
    expect(query.cached()).toEqual({
      pages: [["edited"], ["page-1"], ["written"]],
      pageParams: [0, 1, 2],
    });
    expect(query.fetchingNextPage()).toBe(false);
    client.remove(group.list.all);
  });
});

test("a refetch supersedes an in-flight next page", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const { group, requests } = pagedList("pagination-refetch");
    const query = createInfiniteQuery(() => group.list("all"), client);
    await resolve(query.data);
    flush();

    const next = query.fetchNextPage();
    flush();
    expect(query.fetchingNextPage()).toBe(true);
    const refetching = query.refetch();
    expect(requests[0]!.signal.aborted).toBe(true);
    expect(await next).toBeUndefined();

    requests[0]!.complete(["stale"]);
    await refetching;
    await nextTask();
    expect(query.cached()).toEqual({ pages: [["all"]], pageParams: [0] });
    expect(query.fetchingNextPage()).toBe(false);
    client.remove(group.list.all);
  });
});

test("a next page requested during a refresh pages from the refreshed result", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const { group, server, requests } = pagedList("pagination-refresh-wait");
    const query = createInfiniteQuery(() => group.list("all"), client);
    await resolve(query.data);
    flush();

    server.holdFirstPages = true;
    const refreshing = client.invalidate(group.list.all);
    const next = query.fetchNextPage();
    await nextTask();
    expect(query.fetchingNextPage()).toBe(true);
    // Only the reload is out: the next page waits for it rather than racing it.
    expect(requests.map((request) => request.pageParam)).toEqual([0]);

    requests[0]!.complete(["refreshed"]);
    await refreshing;
    await nextTask();
    expect(requests.map((request) => request.pageParam)).toEqual([0, 1]);
    requests[1]!.complete(["page-1"]);
    await next;
    flush();

    expect(query.cached()).toEqual({ pages: [["refreshed"], ["page-1"]], pageParams: [0, 1] });
    expect(query.fetchingNextPage()).toBe(false);
    client.remove(group.list.all);
  });
});

test("cancelling, removing or unmounting the last observer aborts the next page", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const { group, requests } = pagedList("pagination-abort");
    let disposeObserver = () => {};
    const query = createRoot((dispose) => {
      disposeObserver = dispose;
      return createInfiniteQuery(() => group.list("all"), client);
    });
    await resolve(query.data);
    flush();

    const cancelled = query.fetchNextPage();
    client.cancel(group.list.all);
    expect(requests[0]!.signal.aborted).toBe(true);
    expect(await cancelled).toBeUndefined();
    await nextTask();
    expect(query.fetchingNextPage()).toBe(false);

    const removed = query.fetchNextPage();
    client.remove(group.list.all);
    expect(requests[1]!.signal.aborted).toBe(true);
    expect(await removed).toBeUndefined();
    await resolve(query.data);
    await nextTask();

    const unmounted = query.fetchNextPage();
    disposeObserver();
    await Promise.resolve();
    expect(requests[2]!.signal.aborted).toBe(true);
    expect(await unmounted).toBeUndefined();

    for (const request of requests) request.complete(["late"]);
    await nextTask();
    expect(client.getQueryData<{ pages: string[][] }>(group.list("all").key)?.pages).toEqual([
      ["all"],
    ]);
    client.remove(group.list.all);
  });
});
