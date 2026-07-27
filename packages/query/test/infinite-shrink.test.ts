import { expect, test } from "bun:test";
import { createRoot, flush, resolve } from "solid-js";
import { createInfiniteQuery, QueryClient } from "../src/index.tsx";

/**
 * Regression coverage for the infinite-query page mirror.
 *
 * The legacy implementation caches the first page as its own entry and mirrors it into a
 * separate pages store, with later pages held under synthetic `{ $page: n }` keys. The two
 * behaviours it still gets wrong are marked `test.failing`: they keep the suite green and
 * turn red the moment the legacy path is fixed or deleted, which is the signal to drop the
 * marker. The descriptor path already has all of these — see `infinite-descriptor.test.ts`.
 *
 * "Invalidation preserves already-loaded pages" was the worst of them, and it was fixed
 * here rather than by the rewrite: making `cached()` read the value mirror instead of the
 * deferred signal stopped the sync effect observing a half-updated first page. That matters
 * because the application still runs the legacy path until the Phase 5 cutover.
 *
 * Measured against the current implementation:
 *
 * | Behaviour                                            | Today  |
 * | ---------------------------------------------------- | ------ |
 * | Refetch after a shrink drops absent rows              | passes |
 * | Refetch after a shrink drops absent pages/pageParams  | FAILS  |
 * | Refetch after a shrink withdraws `hasNextPage`        | passes |
 * | Invalidation preserves already-loaded pages           | passes |
 * | Invalidation refetches every loaded page              | FAILS  |
 */

const pageSize = 3;

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

type Row = { id: number };
type Page = { data: Row[]; totalCount: number };

function server(initial: number) {
  let rows = Array.from({ length: initial }, (_, index) => ({ id: index }));
  return {
    shrinkTo(count: number) {
      rows = rows.slice(0, count);
    },
    page(pageParam: number): Page {
      const start = pageParam * pageSize;
      return { data: rows.slice(start, start + pageSize), totalCount: rows.length };
    },
  };
}

function infiniteOptions(source: ReturnType<typeof server>) {
  return () => ({
    queryKey: ["rows"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }) => source.page(pageParam),
    getNextPageParam: (lastPage: Page, allPages: Page[], lastPageParam: number) => {
      const loaded = allPages.reduce((total, page) => total + page.data.length, 0);
      if (loaded >= lastPage.totalCount) return undefined;
      if (lastPage.data.length < pageSize) return undefined;
      return lastPageParam + 1;
    },
  });
}

const rowIds = (pages: readonly Page[]) => pages.flatMap((page) => page.data.map((row) => row.id));

/** Loads two pages and asserts the shared starting point, so failures below are unambiguous. */
async function loadTwoPages(client: QueryClient, source: ReturnType<typeof server>) {
  const query = createInfiniteQuery(infiniteOptions(source), client);

  await resolve(() => query.data());
  flush();
  await query.fetchNextPage();
  flush();

  expect({
    pageCount: query.data().pages.length,
    rows: rowIds(query.data().pages),
  }).toEqual({ pageCount: 2, rows: [0, 1, 2, 3, 4, 5] });

  return query;
}

test("refetching a shrunken collection drops rows that are no longer returned", async () => {
  await inRoot(async () => {
    const source = server(6);
    const query = await loadTwoPages(new QueryClient(), source);

    source.shrinkTo(2);
    await query.refetch();
    flush();

    expect(rowIds(query.data().pages)).toEqual([0, 1]);
  });
});

test.failing("refetching a shrunken collection drops pages that no longer exist", async () => {
  await inRoot(async () => {
    const source = server(6);
    const query = await loadTwoPages(new QueryClient(), source);

    source.shrinkTo(2);
    await query.refetch();
    flush();

    // Today the dead page is refetched as an empty page and kept, so `pages` and
    // `pageParams` still describe a second page that the server no longer has.
    expect({
      pageCount: query.data().pages.length,
      pageParams: [...query.data().pageParams],
    }).toEqual({ pageCount: 1, pageParams: [0] });
  });
});

test("a shrunken collection stops offering a next page", async () => {
  await inRoot(async () => {
    const source = server(6);
    const query = await loadTwoPages(new QueryClient(), source);

    source.shrinkTo(2);
    await query.refetch();
    flush();

    expect(query.hasNextPage()).toBe(false);
  });
});

test("invalidating the family preserves already-loaded pages", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const source = server(6);
    const query = await loadTwoPages(client, source);

    await client.invalidateQueries(["rows"]);
    flush();

    // This was the worst of the mirror's failures: invalidation refetched only the
    // first-page entry and the sync effect then spliced the store down to it, throwing every
    // scrolled table back to its first page on any list-family invalidation. Fixed as a
    // side effect of making `cached()` read the value mirror rather than the deferred
    // signal, so the sync effect no longer observes a half-updated first page.
    expect({
      pageCount: query.data().pages.length,
      rows: rowIds(query.data().pages),
    }).toEqual({ pageCount: 2, rows: [0, 1, 2, 3, 4, 5] });
  });
});

test.failing("invalidating the family refetches every loaded page", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const source = server(6);
    const query = await loadTwoPages(client, source);

    source.shrinkTo(5);
    await client.invalidateQueries(["rows"]);
    flush();

    expect(rowIds(query.data().pages)).toEqual([0, 1, 2, 3, 4]);
  });
});
