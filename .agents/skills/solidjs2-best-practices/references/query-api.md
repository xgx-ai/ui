# The repository's XGX Query API

Prefer XGX Query for every application/API data read, including new and one-off
reads. Its cache, observers, and mutations already use Solid 2 underneath. Keep
signals and synchronous memos for local state/derivations, and the installed
`Loading` / `Errored` boundaries around render reads. Do not hand-roll remote
reads in async memos, stores, projections, or effects.

## Discover the installed contract first

Resolve dependencies from the affected application package, not an unrelated
root install or neighbouring repo. Inspect its `package.json`/lockfile, existing
imports, query client/provider, feature definitions, and cache helpers. Read the
installed query documentation and exported types/source before choosing APIs:

- For `@xgx/ui/query`, inspect `@xgx/ui/package.json`'s `./query` export. The UI
  repository normally keeps documentation in `docs/query.md` and implementation
  in `packages/query/src`.
- For `@xgx/query`, resolve its own package exports. Applications can use this
  direct import while others use the UI package's public re-export.
- Locate the repository's freshness policy, query definitions, pagination/table
  integration, mutation examples, and beta issue register, if present.

Choose the matching contract. Do not infer it from the Solid version alone,
old plans, or TanStack Query examples, and do not upgrade packages to make these
examples compile.

| Local evidence | Approach |
| --- | --- |
| `queryGroup`, `query`, `createQuery`, `useQueryCache` exports | Modern descriptors, as described below |
| App helpers such as `queryDescriptor`, `infiniteQueryDescriptor`, `queryKeys`, `invalidateQueries`, `updateQueryData` | Reuse those adapters and cache helpers; preserve their identity and invalidation conventions |
| `defineQuery`, `createValueQuery`, `useQueryClient`, `queryKey` / `queryFn` options | Older XGX Query contract; follow its installed types and existing callers |

Older observers can expose reactive `.data`, `.hasNextPage`, and
`.isFetchingNextPage` properties rather than accessors. Some infinite observers
expose `.isLoading` / `.isError` without suspending or throwing from `.data`;
retain those status-based UI states instead of assuming a boundary handles them.
Their client can use `invalidateQueries(key)` rather than descriptor scopes.
Check whether that call only evicts cache: factory `invalidate()` or a supported
`invalidates: [factory]` can be required to reload live observers. Older mutation
progress can stop after triggering invalidation without awaiting revalidation. Do not mix these signatures or invent missing `queryGroup`, `useQueryCache`,
`cached`, `pending`, `refresh`, or `refetch` exports. They still provide the
preferred query layer; an older version is not a reason to fetch in an async memo.
Preserve intentionally isolated Solid 1 components and legacy UI exports.

## Modern descriptors own fetching

The rest of this reference describes the modern descriptor contract. Confirm
each method against the installed package and prefer the repository's adapters
when present. For example, an app may deliberately use `invalidates: "nothing"`
with an awaited `invalidateQueries(cache, { queryKey })` inside `onSuccess`;
preserve that cache effect instead of replacing it with group scopes.

Reuse or extend the feature's definitions. Use `query` for one value and
`infiniteQuery` for paginated data. All request inputs that change the answer
belong in the serialisable, normalised `key`; a page cursor belongs in infinite
`pageParam`, while a caller-selectable page size belongs in the key.

```ts
import { query, queryGroup } from "@xgx/ui/query"; // Use the repo's import surface.

export const peopleQueries = queryGroup("people", {
	detail: query({
		key: (id: string) => ({ id }),
		fetch: ({ id }, { signal }) =>
			api.people.get({ id }, { signal }),
		staleTime: freshness.detail,
	}),
});
```

This illustrates the shape; reuse the actual transport, freshness tiers, and
feature group. `fetch` reads only the normalised key and supplied context, never
reactive props/signals/stores or closures over them. Pass the supplied abort
`signal` through transports that support cancellation. Stale time alone does
not provide live updates.

## Modern observers and rendering

```tsx
import { createQuery } from "@xgx/ui/query";
import { Loading, Show } from "solid-js";

const person = createQuery(() =>
	props.personId ? peopleQueries.detail(props.personId) : null,
);

<Show when={props.personId}>
	<Loading fallback={<PersonSkeleton />}>
		<PersonPanel person={person.data()} />
	</Loading>
</Show>
```

Use the existing error boundary too. Return `null` when prerequisites are absent;
there is no descriptor `enabled` option. A null query never fetches, but `data()`
stays not-ready, so gate unselected/disabled UI before reading it. Build descriptors
in the observer accessor. Where a held transition can make an input signal read
its previous value, use Solid's supported `latest(signal)` for that input, after
checking the repository's beta issue register; this is not `query.latest()`.

| Need | Modern observer API |
| --- | --- |
| Authoritative render read | `data()` under `Loading` / `Errored` |
| Non-suspending peek in a handler, effect compute, or fallback | `cached()` |
| A declared answer change is in flight | `pending()` |
| Request activity, including quiet background work | `fetching()` |
| Quiet re-ask | `refresh()` |
| User-visible reload | `refetch()` |

Do not use `cached()` to bypass boundaries in normal rendering or mirror query
results into another signal/store. Modern observers expose accessors, not
TanStack-style status objects: no `isLoading`, `isFetching`, `error`,
`placeholderData`, `keepPreviousData`, or `queryKey` / `queryFn` observer options.
An existing adapter may itself accept array keys. For mutation-triggered
revalidation, `pending()` can provide the spinner when `fetching()` is held
inside the mutation's action; check the local runtime and issue register.

Use `createInfiniteQuery(() => descriptorOrNull)` for pagination. Its result
contains `pages` and `pageParams`; `fetchNextPage()` runs from handlers/observers,
with `hasNextPage()` and `fetchingNextPage()` for the load-more affordance.
Reuse existing table/search integration. If it uses `retained()` for a renderer
workaround, preserve that use until verified; it is not a general read pattern.

## Modern mutations and cache effects

Prefer `createMutation` for server commands. It owns progress and the cache
effect; do not add another action or manual pending flag around the same call.

```ts
const save = createMutation(() => ({
	mutationFn: updatePerson,
	invalidates: ({ variables }) => [
		peopleQueries.detail(variables.id),
		peopleQueries.list.all,
	],
}));
```

This illustrates a cache effect, not an exhaustive invalidation list. Include
every affected family. Descriptors identify one entry; member `.all` scopes
identify a family. On this contract, every mutation declares `invalidates`, or
explicitly `invalidates: "nothing"` with the reason or established cache helper.
Invalidation refreshes observed entries and marks inactive entries stale for
their next observation; it need not fetch every matching entry immediately.

Command progress is the reactive boolean property `save.isPending`, not
`save.isPending()` or `query.pending()`. Await `save.mutateAsync(input)` when the
caller needs the result; `save.mutate(input)` starts a fire-and-forget call.
Progress includes declared invalidation by default. Use `awaitInvalidation: false`
only when that wait is deliberately unsuitable.

Use `onSuccess(data, variables, cache)` for exact canonical `cache.write`s whose
result matches the descriptor's full data shape. Those run before invalidation
and written entries are excluded from the native declared sweep. App helpers
can behave differently: inspect their scope matching before assuming a canonical
write avoids refetch, and reuse those helpers where prescribed.
Do not add duplicate refetches after mutations that already await the same
invalidation. A failed revalidation does not make a server-accepted mutation
fail; its query reports the read error through the boundary.

Reuse the app's `QueryClientProvider` and client. `useQueryCache()` provides
`read`, `write`, `prefetch`, `fetchNextPage`, `invalidate`, `remove`, and `cancel`
on the modern contract. Use the installed cache API for imperative reads and
prefetching instead of another raw request. Do not invent TanStack's `onMutate`
or rollback context where absent.

## Library internals and integration exceptions

Inside the query implementation itself, native Solid async primitives implement
its API and are appropriate. Query-library consumers, demos, and application
features should still use the public query API for remote reads. Keep documented
exceptions such as incremental streaming when the API cannot express them.
Before adding a new bypass, establish the actual limitation and record the narrow
reason. Keep the query API responsible for canonical cached data and invalidation.
