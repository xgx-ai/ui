---
name: solidjs2-best-practices
description: Build, migrate, review, and debug SolidJS 2 code using its reactive model and the repository's XGX Query data API. Use for Solid `.ts`/`.tsx` changes involving effects, signals, stores, props, context, lifecycle, control flow, event handlers, data fetching, query descriptors, mutations, optimistic state, runtime diagnostics, or migration from Solid 1.
---

# SolidJS 2 Best Practices

Treat SolidJS 2 as a different reactive model, not a source-compatible upgrade
from Solid 1. Prefer native Solid 2 primitives over compatibility wrappers.

## Establish the target

1. Read the repository `AGENTS.md`, any applicable `CLAUDE.md`, and the nearest
   package instructions.
2. Inspect `package.json` and lockfile versions for `solid-js`,
   `@solidjs/signals`, `@solidjs/web`, and compiler tooling. Apply this skill to
   Solid 2 packages; preserve explicitly isolated Solid 1/legacy components.
3. Read the installed `solid-js/CHEATSHEET.md` before generating code; resolve it
   from the affected package's `node_modules`. If it is absent, inspect installed
   types/source and the matching prerelease's official documentation. Compare
   with the official online cheat sheet when checking for updates. Confirm signatures and behaviour
   against the installed types and runtime: moving `next` docs can describe a
   later prerelease. The general documentation site may still describe Solid 1.
4. Locate the repository's query import, installed exports, client/provider,
   and feature definitions. Prefer `@xgx/ui/query` or `@xgx/query` as used locally;
   preserve existing adapters, component conventions, and pinned versions.
   Read [references/query-api.md](references/query-api.md) before changing data
   reads, pagination, mutation progress, or cache invalidation.
5. Treat examples as version-sensitive: use only APIs exported by the installed
   Solid and query packages. Do not upgrade dependencies as part of using this
   skill.

Primary sources:

- [Solid 2 cheat sheet](https://github.com/solidjs/solid/blob/next/packages/solid/CHEATSHEET.md)
- [Solid 2 migration guide](https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/MIGRATION.md)
- [Reactivity, batching, and effects](https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/01-reactivity-batching-effects.md)
- [Signals, derived state, and ownership](https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/02-signals-derived-ownership.md)
- [Stores](https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/04-stores.md)
- [DOM and JSX](https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/07-dom.md)

## Fetch application data through the query API

Prefer the repository's XGX Query API for every application/API data read,
including new and one-off reads. Reuse feature definitions and the existing
client/provider. On descriptor releases, use `createQuery` / `createInfiniteQuery`
and the cache API; keep established descriptor adapters where present. Older
releases can expose `defineQuery` / `createValueQuery` and `useQueryClient`
instead: inspect their actual options and reactive properties.

Run requests inside the query API's fetch functions. Do not introduce async
`createMemo`, `createProjection`, function-form stores, or effects as a second
application data layer. Prefer `createMutation` for server commands with cache
effects, retaining the repository's invalidation helpers and pending state.

Raw Solid async primitives remain appropriate inside the query library itself
and a documented integration it cannot represent. Establish the actual API
limitation before introducing such an exception; convenience or one request is
not a reason. Use synchronous memos for local derivations and Solid boundaries
around query reads.

## Classify the behaviour before coding

- Use `createMemo` for read-only local derivations, including transforming query
  results; the query API owns remote fetching.
- Use function-form `createSignal(() => value)` for derived state that must
  remain writable.
- Use `createProjection(fn, seed)` for read-only local derived stores and
  `createStore(fn, seed)` when local overrides are needed.
- Use split `createEffect(compute, apply)` for an external side effect caused by
  reactive changes.
- Use `onSettled` for mount-style setup and return its cleanup.
- Use `createMutation` for server writes, and an event handler or `action` for
  other user-initiated writes.
- Use `snapshot(store)` for an untracked plain interop value and `deep(store)`
  when an effect must subscribe to the complete nested store.

Do not mirror a signal or prop into another ordinary signal with an effect.

## Separate async reads from command progress

Keep suspending query reads under the installed Solid 2 readiness/error
boundaries; preserve status-based UI for older observers that do not suspend. Modern
descriptor observers expose `data()`, `pending()`, and `fetching()`; older query
releases can expose a reactive `.data` property. Confirm the installed contract
before choosing progress or refresh methods. Use existing mutation/form pending
state for command progress, without another manual loading flag.

Read [references/async-actions.md](references/async-actions.md) when the native
async/transition semantics matter to query consumers, library internals, or a
documented integration exception. That reference explains the framework; it
does not replace the project's query API for fetching.

## Build every effect in two phases

1. Read every reactive dependency in the compute function.
2. Resolve nested store fields, callback accessors, providers, sessions, and
   other reactive handles there as well.
3. Return plain values or stable non-reactive handles to the apply function.
4. Perform DOM, subscription, timer, storage, or external-library side effects
   only in apply. Application data fetching still belongs in the query API.
5. Return only a cleanup function or `undefined` from apply.
6. Use `{ defer: true }` when the first apply must be skipped.

```ts
createEffect(
	() => ({
		id: props.item.id,
		name: store.user.name,
		provider: provider(),
	}),
	({ id, name, provider }) => {
		provider?.send({ id, name });
		return () => provider?.cancel(id);
	},
);
```

Never pass a reactive store proxy through compute and then traverse it in apply.
Never assume a helper is safe merely because the call itself has no visible
signal read: inspect whether the helper reads a memo, signal, prop, or store.

Discard setters' return values explicitly:

```ts
createEffect(value, (next) => {
	setValue(next);
});
```

A concise `next => setValue(next)` returns the written value and can throw
`effect callback returned an invalid cleanup value`.

Read [references/reactivity-patterns.md](references/reactivity-patterns.md)
before adding or substantially changing effects, signals, memos, stores, or
lifecycle code.

## Keep component reads reactive

- Do not destructure component props at the component boundary.
- Read reactive props in JSX, a memo, an effect compute function, or a narrow
  intentional `untrack`.
- Do not read signals or store fields at component top level.
- Pass values to ordinary props; pass accessors only when the receiving API
  explicitly expects an accessor.
- Keep control-flow child reads in tracked JSX expressions or memos.

## Treat escape hatches as evidence

Before adding `untrack`, `ownedWrite: true`, `flush`, or a compatibility helper,
write down why the value must not be reactive.

- `untrack`: allow only deliberate one-time snapshots or imperative callbacks
  whose staleness is intended. Do not use it inside apply to silence a strict
  read that should be a compute dependency. It does not remove the owner or
  exempt writes from the owned-scope guard.
- `ownedWrite: true`: reserve for narrow internal plumbing, not application
  state or derived write-back.
- `flush`: reserve for tests or unavoidable imperative read-after-write/DOM
  boundaries.
- Compatibility wrappers: remove or replace them with native Solid 2 patterns.

Solid 2 microtask-batches writes. Do not add `batch` or no-op batching shims.

## Migrate deliberately

For an authorised migration of imports, stores, control flow, async data, DOM
APIs, or removed Solid 1 primitives, read
[references/migration-map.md](references/migration-map.md). Search both
application code and shared packages; embedded libraries can retain old
compatibility layers after the app has been migrated.

## Diagnose at runtime

When a route or interaction fails:

1. Reproduce the exact route and interaction in the local runtime.
2. Capture the full browser error and all Solid warnings from a fresh reload.
3. Fix the first reactive diagnostic before interpreting downstream failures.
4. Trace helpers called by apply callbacks for hidden reactive reads.
5. Verify the original interaction causes zero Solid diagnostics after the fix.
6. Remove temporary diagnostic instrumentation.

Read [references/diagnostics.md](references/diagnostics.md) for warning-specific
triage and temporary `DEV.diagnostics` tracing.

## Validate

Run the heuristic audit from the repository root:

```sh
bun .agents/skills/solidjs2-best-practices/scripts/audit-solidjs2.mjs .
```

Use the repository's prescribed environment (for example `nix develop -c`)
when running commands. Review every reported item in the affected Solid 2
package; intentional legacy packages can produce false positives. The audit
does not replace runtime verification. Read the local beta issue register, if
present, before debugging unusual reactive behaviour; record new workarounds
according to repository instructions.

Then:

1. Run the repository's type-check command for the changed package or directory
   through its prescribed development environment; do not assume `tsgo` or `tsc`.
2. Run focused reactive unit tests, using `createRoot` and `flush()` where a
   committed batch is required.
3. Run the affected package tests and production build.
4. Exercise the affected UI in the local browser runtime.
5. Confirm zero `STRICT_READ_UNTRACKED`, write-under-scope, pending-read, or
   invalid-cleanup diagnostics.
