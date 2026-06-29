# Query

`@xgx/query` is Solid v2-only and uses async memos as the public read model. Query reads are accessors, not status objects.

## Query Result

```tsx
import { Loading, createQuery } from "@xgx/query";

const user = createQuery(() => ({
  queryKey: ["user", props.userId],
  queryFn: () => fetchUser(props.userId),
}));

<Loading fallback={<UserSkeleton />}>
  <UserCard user={user.data()} />
</Loading>;
```

`data()` is the suspending read. Put it under `Loading` and `Errored` boundaries.

`latest()` returns the last resolved value, or `undefined` before the first success. Use it for non-suspending chrome such as counters, selected rows, disabled states, and stale previews.

`pending()` reports active initial/refetch work. It is useful for inline progress when `latest()` is already available.

`refetch()` invalidates the cache entry and resolves with the next `data()` value.

## Infinite Query

```tsx
import { createMemo } from "solid-js";
import { Loading, createInfiniteQuery } from "@xgx/query";

const feed = createInfiniteQuery<Page, number>(() => ({
  queryKey: ["feed", filters()],
  initialPageParam: 0,
  queryFn: ({ pageParam }) => fetchFeed({ page: pageParam, filters: filters() }),
  getNextPageParam: (lastPage, pages, lastPageParam) =>
    pages.flatMap((page) => page.items).length < lastPage.total ? lastPageParam + 1 : undefined,
}));

const rows = createMemo(() => feed.data().pages.flatMap((page) => page.items));
const latestRows = createMemo(() => feed.latest()?.pages.flatMap((page) => page.items) ?? []);

<Loading fallback={<TableSkeleton />}>
  <Table rows={rows()} />
</Loading>;
```

For infinite tables, suspend the initial read and query-key changes with `data()`. Do not suspend "load next page": `fetchNextPage()` appends to the current resolved pages and exposes `fetchingNextPage()` for the footer spinner.

Use `latest()` only where suspension would break layout, such as sticky headers, status bars, row selection summaries, and end-of-results messages.

## Breaking Changes

- Removed `data`, `isLoading`, `isFetching`, `isPending`, `isSuccess`, `error`, `peek`, and placeholder fields from query result objects.
- Removed `placeholderData` and `keepPreviousData`; use `latest()` for stale non-suspending reads.
- Infinite query now exposes `data()`, `latest()`, `pending()`, `fetchingNextPage()`, `hasNextPage()`, `fetchNextPage()`, and `refetch()`.
