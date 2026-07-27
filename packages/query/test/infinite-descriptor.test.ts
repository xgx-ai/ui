import { expect, test } from "bun:test";
import { createRoot, flush, resolve } from "solid-js";
import {
  createInfiniteQuery,
  infiniteQuery,
  QueryClient,
  queryGroup,
  stableQueryKey,
} from "../src/index.tsx";

/**
 * The descriptor path holds every loaded page in one cache entry.
 *
 * These are the same scenarios as `infinite-shrink.test.ts`, which pins the legacy
 * mirror's behaviour with three `test.failing` cases. Here they must actually pass — that
 * contrast is the point of the file.
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
  const requested: number[] = [];
  return {
    page(pageParam: number): Page {
      requested.push(pageParam);
      const start = pageParam * pageSize;
      return { data: rows.slice(start, start + pageSize), totalCount: rows.length };
    },
    requested,
    shrinkTo(count: number) {
      rows = rows.slice(0, count);
    },
  };
}

function rowsGroup(source: ReturnType<typeof server>) {
  return queryGroup("rows", {
    list: infiniteQuery({
      key: (scope: string) => ({ scope }),
      initialPageParam: 0,
      fetch: async (_key, context) => source.page(context.pageParam),
      getNextPageParam: (lastPage: Page, allPages: readonly Page[], lastPageParam: number) => {
        const loaded = allPages.reduce((total, page) => total + page.data.length, 0);
        if (loaded >= lastPage.totalCount) return undefined;
        if (lastPage.data.length < pageSize) return undefined;
        return lastPageParam + 1;
      },
    }),
  });
}

const rowIds = (pages: readonly Page[]) => pages.flatMap((page) => page.data.map((row) => row.id));

async function loadTwoPages(client: QueryClient, source: ReturnType<typeof server>) {
  const group = rowsGroup(source);
  const query = createInfiniteQuery(() => group.list("all"), client);

  await resolve(() => query.data());
  flush();
  await query.fetchNextPage();
  flush();

  expect({
    pageCount: query.data().pages.length,
    rows: rowIds(query.data().pages),
  }).toEqual({ pageCount: 2, rows: [0, 1, 2, 3, 4, 5] });

  return { group, query };
}

test("every loaded page lives in one cache entry", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const source = server(6);
    const { group } = await loadTwoPages(client, source);

    // One entry, holding both pages — not a first-page entry plus synthetic page keys.
    const held = client.getQueryData<{ pages: Page[]; pageParams: number[] }>(
      group.list("all").key,
    );
    expect(held?.pages).toHaveLength(2);
    expect(held?.pageParams).toEqual([0, 1]);
    expect(stableQueryKey(group.list("all").key)).not.toContain("$page");
  });
});

test("refetching a shrunken collection drops rows that are no longer returned", async () => {
  await inRoot(async () => {
    const source = server(6);
    const { query } = await loadTwoPages(new QueryClient(), source);

    source.shrinkTo(2);
    await query.refetch();
    flush();

    expect(rowIds(query.data().pages)).toEqual([0, 1]);
  });
});

test("refetching a shrunken collection drops pages that no longer exist", async () => {
  await inRoot(async () => {
    const source = server(6);
    const { query } = await loadTwoPages(new QueryClient(), source);

    source.shrinkTo(2);
    await query.refetch();
    flush();

    expect({
      pageCount: query.data().pages.length,
      pageParams: [...query.data().pageParams],
    }).toEqual({ pageCount: 1, pageParams: [0] });
  });
});

test("a shrunken collection stops offering a next page", async () => {
  await inRoot(async () => {
    const source = server(6);
    const { query } = await loadTwoPages(new QueryClient(), source);

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
    const { group, query } = await loadTwoPages(client, source);

    await client.invalidate(group.list.all);
    flush();

    // The legacy mirror collapsed to a single page here, throwing a scrolled table back to
    // its first 30 rows on any mutation that invalidated the list.
    expect({
      pageCount: query.data().pages.length,
      rows: rowIds(query.data().pages),
    }).toEqual({ pageCount: 2, rows: [0, 1, 2, 3, 4, 5] });
  });
});

test("invalidating the family refetches every loaded page", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const source = server(6);
    const { group, query } = await loadTwoPages(client, source);

    source.requested.length = 0;
    source.shrinkTo(5);
    await client.invalidate(group.list.all);
    flush();

    expect(source.requested).toEqual([0, 1]);
    expect(rowIds(query.data().pages)).toEqual([0, 1, 2, 3, 4]);
  });
});

test("an exact descriptor invalidates only its own entry", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const source = server(6);
    const group = rowsGroup(source);
    const first = createInfiniteQuery(() => group.list("first"), client);
    const second = createInfiniteQuery(() => group.list("second"), client);

    await resolve(() => first.data());
    await resolve(() => second.data());
    flush();

    source.requested.length = 0;
    await client.invalidate(group.list("first"));
    flush();

    expect(source.requested).toEqual([0]);
  });
});

test("a null descriptor never fetches", async () => {
  await inRoot(async () => {
    const client = new QueryClient();
    const source = server(6);
    const group = rowsGroup(source);
    const query = createInfiniteQuery(
      () => ((false as boolean) ? group.list("all") : null),
      client,
    );

    flush();
    await Promise.resolve();

    expect(source.requested).toEqual([]);
    expect(query.cached()).toBeUndefined();
    expect(query.hasNextPage()).toBe(false);
  });
});
