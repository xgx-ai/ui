# Query

`@xgx/query` is Solid v2-only and uses async memos as the public read model. Query reads are accessors, not status objects.

## Descriptors

A query is asked through a descriptor built by a group. `key` normalises loose UI state into the serialisable identity; `fetch` receives that identity and a context, and nothing else.

```ts
import { infiniteQuery, query, queryGroup } from "@xgx/query";

export const userQueries = queryGroup("users", {
  detail: query({
    key: (id: string) => ({ id }),
    fetch: ({ id }, { signal }) => api.users.get({ id }, { signal }),
    staleTime: 60_000,
  }),
  feed: infiniteQuery({
    key: (filters: FeedFilters) => ({ ...filters }),
    initialPageParam: 0,
    fetch: (filters, { pageParam, signal }) => api.feed.list({ ...filters, page: pageParam }, { signal }),
    getNextPageParam: (lastPage, pages, lastPageParam) =>
      pages.flatMap((page) => page.items).length < lastPage.total ? lastPageParam + 1 : undefined,
  }),
});

userQueries.detail("abc"); // descriptor, key ["users", "detail", { id: "abc" }]
userQueries.detail.all; // scope for invalidation, path ["users", "detail"]
```

### `fetch` depends only on the key and page param

A request may run long after the descriptor was built — on a refresh, an invalidation, a focus refetch, the next page — and always outside a tracking scope. Reactive state read inside `fetch` is whatever that state holds at that moment, and during a transition a plain signal still reads its pre-transition value (S5 in [the beta register](./solid-2-beta-issues.md)). The library only guarantees what the key carries, so:

- Every value that changes the answer belongs in the key, and `fetch` reads it from the key.
- Never read signals, props, stores or a captured closure over them inside `fetch`. Adapters that wrap a legacy `queryFn` closure must make that closure read only values the key also carries.
- When a key is built from a bare signal that a transition might hold, build it from `latest(signal)` so the query follows the change (S5).

## Query Result

```tsx
import { Loading } from "solid-js";
import { createQuery } from "@xgx/query";

const user = createQuery(() => (props.userId ? userQueries.detail(props.userId) : null));

<Loading fallback={<UserSkeleton />}>
  <UserCard user={user.data()} />
</Loading>;
```

`createQuery` takes an accessor returning a descriptor, or `null` for "no question yet". A `null` query never fetches and its `data()` stays not-ready.

- `data()` is the suspending read. Put it under `Loading` and `Errored` boundaries; `Loading` keeps already-rendered content across a revalidation.
- `cached()` peeks at the current key's cached value without suspending, or `undefined`. Use it in handlers, effect compute phases and fallbacks, not to dodge a boundary in render.
- `pending()` is Solid's pending verdict for `data()`: a declared change is in flight.
- `fetching()` reports whether a request is executing, including quiet background work.
- `refresh()` re-asks quietly; `refetch()` declares a user-visible refetch so `pending()` reports it. Both resolve with the new value.

## Infinite Query

```tsx
import { createMemo, Loading } from "solid-js";
import { createInfiniteQuery } from "@xgx/query";

const feed = createInfiniteQuery(() => userQueries.feed(filters()));

const rows = createMemo(() => feed.data().pages.flatMap((page) => page.items));

<Loading fallback={<TableSkeleton />}>
  <Table rows={rows()} onEndReached={() => void feed.fetchNextPage()} />
</Loading>;
```

Every loaded page lives in one cache entry. `refetch()`, `refresh()` and invalidation re-ask for every loaded page, keeping the scroll position and dropping pages the server no longer returns.

- `data()`, `cached()`, `pending()`, `fetching()`, `refresh()` and `refetch()` behave as for `createQuery`, with `InfiniteData` (`pages` and `pageParams`) as the value.
- `hasNextPage()` asks `getNextPageParam` about the current key's cached pages.
- `fetchNextPage()` appends the next page without suspending. Call it from handlers and observers, never from a memo or component body. It returns the entry's in-flight request if there is one, so every observer of a key shares a single request.
- `fetchingNextPage()` reports that shared request for the current key only; an older key's request never shows here.
- `retained()` is the last value this instance resolved for any key. It exists only for S1 in the beta register; table hooks read it for rows.

A next-page request is aborted through its `signal`, never written and its promise resolved when it is superseded: the entry is refreshed, invalidated, cancelled, removed or garbage-collected, or loses its last observer (the observer moved to another key or unmounted). A request made while the entry is refreshing waits and pages from the refreshed result. A page is appended only while the entry still ends at the page it was requested after. A genuine fetch failure rejects.

The cache surface offers the same operation as `useQueryCache().fetchNextPage(descriptor)`.

## Mutations and the Cache

`createMutation` requires `invalidates`, which is either the scopes and descriptors the mutation affects or the literal `"nothing"`. `onSuccess` receives the cache for exact `write`s, which run before invalidation and are not swept by it.

`useQueryCache()` returns the cache surface: `read`, `write`, `invalidate`, `remove`, `cancel`, `prefetch` and `fetchNextPage`. Scopes match a family by prefix; descriptors match one entry.

## Migration Notes

- Results are accessors: `data`, `isLoading`, `isFetching`, `isPending`, `isSuccess`, `error`, `peek` and placeholder fields are gone. Read `data()` under `Loading`/`Errored`, `cached()` for non-suspending peeks, and `pending()`/`fetching()` for progress.
- `placeholderData`, `keepPreviousData` and `latest()` are gone. `Loading` retains rendered content across key changes; infinite tables read `retained()` (S1).
- `queryKey`/`queryFn` options objects are gone from `createQuery` and `createInfiniteQuery`; pass a descriptor, or `null`.
- `enabled` is gone from descriptors; return `null` instead.
