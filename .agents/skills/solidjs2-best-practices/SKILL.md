---
name: solidjs2-best-practices
description: Build, migrate, review, and debug SolidJS 2 beta code using the two-phase reactive model. Use for Solid `.ts`/`.tsx` changes involving createEffect, createRenderEffect, createMemo, createSignal, createStore, props, lifecycle, cleanup, batching, async data, strict-read warnings, invalid cleanup errors, or migration from Solid 1 APIs and compatibility helpers.
---

# SolidJS 2 Best Practices

Treat SolidJS 2 as a different reactive model, not a source-compatible upgrade
from Solid 1. Prefer native Solid 2 primitives over compatibility wrappers.

## Establish the target

1. Read the repository `AGENTS.md` and the nearest package instructions.
2. Inspect `package.json` and lockfile versions for `solid-js`,
   `@solidjs/signals`, `@solidjs/web`, and compiler tooling.
3. Treat the official Solid repository's `next` documentation as the source of
   truth for beta APIs. The general Solid documentation site may still describe
   Solid 1 signatures.
4. Preserve project-specific data-fetching, component, and test conventions.

Primary sources:

- [Solid 2 migration guide](https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/MIGRATION.md)
- [Reactivity, batching, and effects](https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/01-reactivity-batching-effects.md)
- [Signals, derived state, and ownership](https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/02-signals-derived-ownership.md)
- [Stores](https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/04-stores.md)
- [DOM and JSX](https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/07-dom.md)

## Classify the behaviour before coding

- Use `createMemo` for read-only derived values.
- Use function-form `createSignal(() => value)` for derived state that must
  remain writable.
- Use `createStore(fn, seed)` for a derived keyed or nested projection.
- Use split `createEffect(compute, apply)` for an external side effect caused by
  reactive changes.
- Use `onSettled` for mount-style setup and return its cleanup.
- Use an event handler or `action` for user-initiated writes.
- Use `snapshot(store)` for an untracked plain interop value and `deep(store)`
  when an effect must subscribe to the complete nested store.

Do not mirror a signal or prop into another ordinary signal with an effect.

## Build every effect in two phases

1. Read every reactive dependency in the compute function.
2. Resolve nested store fields, callback accessors, providers, sessions, and
   other reactive handles there as well.
3. Return plain values or stable non-reactive handles to the apply function.
4. Perform DOM, network, subscription, timer, storage, or external-library work
   only in apply.
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
  read that should be a compute dependency.
- `ownedWrite: true`: reserve for narrow internal plumbing, not application
  state or derived write-back.
- `flush`: reserve for tests or unavoidable imperative read-after-write/DOM
  boundaries.
- Compatibility wrappers: remove or replace them with native Solid 2 patterns.

Solid 2 microtask-batches writes. Do not add `batch` or no-op batching shims.

## Migrate deliberately

For imports, stores, control flow, async data, DOM APIs, and removed Solid 1
primitives, read
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

Review every reported item; the audit is intentionally conservative and does
not replace runtime verification.

Then:

1. Run `tsgo` for the changed package or directory.
2. Run focused reactive unit tests, using `createRoot` and `flush()` where a
   committed batch is required.
3. Run the affected package tests and production build.
4. Exercise the affected UI in the local browser runtime.
5. Confirm zero `STRICT_READ_UNTRACKED`, write-under-scope, pending-read, or
   invalid-cleanup diagnostics.
