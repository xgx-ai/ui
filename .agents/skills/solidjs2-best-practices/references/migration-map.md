# SolidJS 1 to SolidJS 2 migration map

Use the exact APIs exported by the repository's pinned Solid 2 beta. Confirm
against the official `next` migration guide before changing versions.

## Imports

| Solid 1 or compatibility form | Solid 2 form |
| --- | --- |
| `solid-js/web` | `@solidjs/web` |
| `solid-js/store` | store primitives from `solid-js` |
| JSX types from `solid-js` | JSX types from `@solidjs/web` |
| `mergeProps` | `merge` |
| `splitProps` | `omit` |
| `unwrap` | `snapshot` |

Set web TypeScript projects to `"jsxImportSource": "@solidjs/web"`.

## Reactivity and lifecycle

| Remove or avoid | Prefer |
| --- | --- |
| single-callback `createEffect` | `createEffect(compute, apply)` |
| `on(...)` and `onSignal` wrappers | split effect compute dependencies |
| `onMount` | `onSettled` |
| `batch` | default batching; rare `flush()` |
| derived signal write-back effects | `createMemo` |
| writable derived mirrors | function-form `createSignal(fn)` |
| `createComputed` | memo, projection, or split effect by intent |

Apply callbacks are untracked. Return cleanup rather than calling `onCleanup`
inside ordinary apply code.

## Stores

- Use draft-first `setStore(draft => { ... })`.
- Use `storePath(...)` only when legacy path-style ergonomics are justified.
- Use `snapshot(store)` for serialization or non-reactive interop.
- Use `deep(store)` in effect compute when every nested property must be tracked.
- Use `createStore(fn, seed)` for derived store projections.
- Use `createProjection` instead of `createSelector`.

## Async and boundaries

| Solid 1 | Solid 2 |
| --- | --- |
| `createResource` | async `createMemo` or `createStore(fn)` |
| `Suspense` | `Loading` |
| `ErrorBoundary` | `Errored` or effect error arm |
| resource `.loading` | `Loading` for first readiness; `isPending` for changes |
| resource `refetch` | `refresh` |
| manual mutation flags | `action`, optimistic primitives, or existing mutation state |

Follow the repository's query abstraction. Do not replace a project query layer
merely because Solid 2 provides async primitives.

## Control flow

- Replace `Index` with `<For keyed={false}>`.
- Understand callback shapes: default `For` gives a raw item and index accessor;
  `keyed={false}` gives an item accessor and stable numeric index.
- Avoid keyed `Show` with unstable object identities.
- Keep function-child reads reactive; avoid direct reads in callback setup code.

## DOM and props

- Import `render`, `hydrate`, `Portal`, `Dynamic`, `dynamic`, and web JSX types
  from `@solidjs/web`.
- Replace `use:` directives with `ref` directive factories.
- Replace `classList` and namespace forms with `class` object values.
- Use `style` object values.
- Pass current values to ordinary props; pass accessors only to APIs that
  explicitly require them.
- Do not destructure reactive props.

## Repository audit

Search the whole repository, including shared packages and embedded libraries:

```sh
rg -n 'onSignal|solid-js/(web|store)|\b(batch|onMount|createResource|createComputed|mergeProps|splitProps|unwrap)\b' .
```

Review neighbouring repositories for reusable domain patterns, but do not treat
them as authoritative. Migration helpers and hidden apply-phase reads can remain
even in repositories with otherwise strong Solid 2 guidance.
