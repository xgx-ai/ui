# SolidJS 2 async reads and actions

For application data fetching, first use
[query-api.md](query-api.md): the repository's XGX Query API owns requests, cached reads,
pagination, and mutation invalidation. The native primitives below explain
the model underneath that API and advanced integration code; they are not the
default way to fetch application data.

Guidance checked against the bundled `solid-js@2.0.0-rc.11` cheat sheet and
types on 9 October 2026. Repositories can pin older prereleases: check their
installed cheat sheet and declarations before applying any example below. Use
only supported APIs; moving upstream documentation can also run ahead of rc.11.

Primary sources:

- [Official cheat sheet](https://github.com/solidjs/solid/blob/next/packages/solid/CHEATSHEET.md)
- [Async data](https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/05-async-data.md)
- [Actions and optimistic updates](https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/06-actions-optimistic.md)

## Derived reads and readiness

The framework can lift a Promise or AsyncIterable returned from `createMemo`,
`createProjection`, or a function-form store into an async computation. In this
application, consume remote reads through its query API and derive local values
from its data read with synchronous memos. Do not create a request inside a
memo; some prereleases can loop when fetching in tracked scopes. Check the
repository's beta issue register where available.

Modern descriptor query consumers use `query.pending()`, `query.fetching()`,
`query.refresh()` / `query.refetch()`, and `mutation.isPending`. Other query releases have different contracts. The remainder
describes native sources and actions, not additional query observer methods.

Place unresolved data reads under `Loading`. Keep surrounding layout outside
the boundary. After content first renders, ordinary revalidation preserves it.
`isPending(() => user())` reads the source too, so it belongs under the boundary
that owns that potentially unresolved read. An indicator can sit outside only
when its expression reads upstream state that cannot be unresolved.

`Loading`'s `on={id()}` tracks dependencies; it is not an identity key or a
remount instruction. A dependency change re-arms the fallback when content is
pending. The fallback appears with the frame that caused the change, so another
hold on that frame can prevent it appearing. Use `isPending` for a wait that
must be visible while committed content remains. A fallback naming the next
item can read `latest(id)`; `id()` still reports the committed value.

## Data changes and process progress

Choose the state source by what the indicator promises:

| UI meaning | Source |
| --- | --- |
| This branch cannot render its first value | `Loading` |
| This read's value is changing in flight | `isPending(() => source())` |
| Known server data will change during work | `affects(source)` or `affects(record, "field")` |
| This command is running | existing mutation/form pending state, or `createOptimistic(false)` written in an action |

`isPending` does not mean any fetch or command is running. A bare `refresh`
re-asks the same question and stays quiet. Pair `affects(source)` with
`refresh(source)` in the handler/action when a reload should read as pending.
`affects(record, key)` marks one slot, not a path; target the nested record
directly and avoid marking the whole store for a row-level change.

For native sources, optimistic writes show the expected value and do not make
that slot pending. Their overrides revert when the transition settles,
including failure.
`createMutation` already supplies command progress through `isPending`; do not
add the following flag around a query mutation. When implementing a native
operation outside that wrapper, write the flag alongside it:

```ts
const [saving, setSaving] = createOptimistic(false);
const save = action(function* (input: Input) {
	setSaving(true);
	yield api.save(input);
	refresh(details);
});
```

Read `saving()` in JSX. Settlement restores `false`; no manual `finally` reset
is needed. Retain existing mutation/form state when it already owns progress.
Do not manufacture a data change solely to make a command button look busy.

## Action continuations

Native `action` represents mutations whose writes span async work. A filter or
navigation setter that only causes downstream reads to fetch can use built-in
transitions without an extra action wrapper.

For application server mutations, use `createMutation` first. On the modern
descriptor contract it wraps an action and manages progress and declared
invalidation; older releases have their own progress/invalidation semantics. The
native action examples apply when implementing the wrapper or an integration
that its API cannot represent; do not duplicate its pending/cache machinery.

`action` accepts a generator or async generator. `yield promise` resumes in the
transaction. In an async generator, an ordinary `await` continuation runs
outside it: insert a bare `yield` before subsequent writes, `refresh`, or reader
creation. This includes the expression passed to the next `yield`.

```ts
const save = action(async function* (input: Input) {
	const result = await api.save(input);
	yield; // Re-enter the transaction before the next reactive operation.
	refresh(details);
	return result;
});
```

Avoid `flush()` inside actions because it drains the transaction mid-step.
Invoke `refresh` from handlers, effect apply callbacks, or actions; it is an
operation, not a pure derived read.

For flows that must wait for a refetch or a live-source acknowledgement, inspect
the installed `refresh` / `until` declarations and the actions reference before
using their awaitable forms. Their availability and settlement semantics are
version-sensitive; do not infer them from the latest online RFC alone.
