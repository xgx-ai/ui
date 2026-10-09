# SolidJS 2 runtime diagnostics

## `STRICT_READ_UNTRACKED`

Meaning: an effect apply callback, component top level, or another untracked
scope read a reactive signal, memo, prop, or store field. The read cannot update
the current consumer.

Check:

1. Direct accessor calls in apply.
2. Store proxies returned from compute and traversed in apply.
3. Helpers called from apply that read reactive context internally.
4. Callback wrappers that call a memo such as `session()`.
5. Components or JSX constructed imperatively inside apply.

Fix by returning the required values or stable handles from compute. Do not
default to `untrack`.

## Invalid cleanup value

Message:

```text
effect callback returned an invalid cleanup value.
Return a cleanup function or undefined.
```

Check concise apply callbacks and direct callback references. Solid setters
return the stored value. Third-party callbacks typed as `void` may wrap setters
and return a runtime value.

Use a block to discard non-cleanup returns.

## Write under owned scope

Move application writes out of component top level, memos, and compute
functions. Prefer derived state, events, actions, or apply callbacks. Use
`ownedWrite: true` only for narrow internal signals whose ownership semantics
are understood.
`untrack` preserves the ambient owner and does not exempt writes from this
guard.

## Pending async untracked read

Move the async read beneath the appropriate `Loading` boundary and into a
tracked JSX, memo, store, or effect compute scope.

## `LOADING_ON_OUTSIDE_HOLD`

A pending source read outside a re-armed `Loading` boundary holds the same
frame, preventing that boundary's fallback from appearing. Move the outside
data read beneath the boundary so it owns the wait. Do not add manual loading
flags to hide the structural problem. Read [async-actions.md](async-actions.md)
before adjusting boundary or pending behaviour.

## Multiple Solid instances

Inspect the lockfile and linked/shared package resolution when ownership or
context unexpectedly fails across package boundaries. Align the compatible
Solid runtime packages and ensure consumers share one `solid-js` instance;
do not patch the symptom with fallback context or compatibility wrappers.

## Temporary diagnostic tracing

When the installed `@solidjs/signals` dev build exports `DEV.diagnostics`,
and the browser message lacks a useful stack, temporarily subscribe at the app
entry point. Confirm this export against the installed types first; older
prereleases can lack it:

```ts
import { DEV } from "@solidjs/signals";

const stopSolidDiagnostics = DEV?.diagnostics.subscribe((event) => {
	if (
		event.code === "STRICT_READ_UNTRACKED" ||
		event.code === "REACTIVE_WRITE_IN_OWNED_SCOPE"
	) {
		console.error("[solid-diagnostic]", event, new Error().stack);
	}
});
```

Reproduce from a fresh reload, capture `nodeName`, store property data, and the
stack, then remove the subscription. Do not ship diagnostic instrumentation.

## Runtime acceptance

Exercise the exact failing route and interaction after the fix. A successful
render is insufficient: trigger the dependency again and confirm there are no
Solid warnings or effect errors from the fresh test window.
