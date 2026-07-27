import { expect, test } from "bun:test";
import { createRoot, flush, resolve } from "solid-js";
import { createInfiniteQuery, QueryClient } from "../src/index.tsx";

/**
 * Regression coverage for the infinite-query page mirror.
 *
 * The current implementation caches the first page as its own entry and mirrors it into a
 * separate pages store, with later pages held under synthetic `{ $page: n }` keys. Three
 * of these tests describe behaviour the current implementation does not have, so they are
 * marked `test.failing`: they keep the suite green today and turn red the moment the
 * rewrite fixes them, which is the signal to drop the marker. Collapsing infinite state
 * into one `InfiniteData` cache entry is what fixes them — see
 * docs/solidjs2-query-contract-plan.md.
 *
 * Measured against the current implementation:
 *
 * | Behaviour                                            | Today  |
 * | ---------------------------------------------------- | ------ |
 * | Refetch after a shrink drops absent rows              | passes |
 * | Refetch after a shrink drops absent pages/pageParams  | FAILS  |
 * | Refetch after a shrink withdraws `hasNextPage`        | passes |
 * | Invalidation preserves already-loaded pages           | FAILS  |
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

test.failing("invalidating the family preserves already-loaded pages", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const source = server(6);
    const query = await loadTwoPages(client, source);

    await client.invalidateQueries(["rows"]);
    flush();

    // Today invalidation refetches only the first-page entry, and the mirror effect
    // splices the store back down to that single page — silently discarding the pages the
    // user had already scrolled through. Any mutation that invalidates a list family
    // resets every scrolled table in the application to its first page.
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
