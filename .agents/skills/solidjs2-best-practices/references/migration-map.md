# SolidJS 1 to SolidJS 2 migration map

Use the exact APIs exported by the repository's pinned Solid 2 prerelease.
Check its bundled cheat sheet and types; compare the official `next` migration
guide before changing versions.

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
- Use `createProjection(fn, seed)` for read-only derived stores;
  `createStore(fn, seed)` also permits local overrides.
- Use `createProjection` instead of `createSelector`.

## Async and boundaries

| Solid 1 | Application default (where exported) |
| --- | --- |
| `createResource` / ad-hoc async fetch | the repository's XGX Query API (descriptors where supported) |
| `Suspense` | `Loading` |
| `SuspenseList` | `Reveal` |
| `ErrorBoundary` | `Errored` or effect error arm |
| resource `.loading` | `Loading` for first readiness; query `pending()` / `fetching()` for progress |
| resource `refetch` | query `refetch()` for a visible reload; `refresh()` for a quiet re-ask |
| manual mutation flags | `createMutation`'s `isPending` or existing form state |

The query rows describe the modern descriptor release. Older installed query
APIs and existing adapters retain their own observer/cache contracts. Use
[query-api.md](query-api.md) for new reads as well as authorised migrations; raw Solid
async computations are not an alternative application fetching layer. Read
[async-actions.md](async-actions.md) when native pending/transition semantics
matter beneath that API.

## Control flow

- Replace `Index` with `<For keyed={false}>`.
- Choose callback shapes by keying mode:

  | `For` mode | Item | Index |
  | --- | --- | --- |
  | default / `keyed={true}` | raw value | accessor |
  | `keyed={false}` | accessor | stable number |
  | `keyed={item => item.id}` | accessor | accessor |

- `Repeat` receives a plain numeric index. Non-keyed `Show` / `Match` children
  receive narrowed accessors; keyed children receive raw values.
- Avoid keyed `Show` with unstable object identities.
- Keep function-child reads reactive; avoid direct reads in callback setup code.

## DOM and props

- Import `render`, `hydrate`, `Portal`, `Dynamic`, `dynamic`, and web JSX types
  from `@solidjs/web`.
- Replace `use:` directives with `ref` directive factories.
  Create reactive primitives in the factory's owned setup phase; the returned
  element callback performs DOM work. Compose callbacks with `ref={[a, b]}`;
  an element variable inside that array is not assigned automatically.
- Replace `classList` and namespace forms with `class` object values.
- Compose conditional classes with arrays and objects rather than building
  strings with conditionals and `.join(" ")`.
- Use `style` object values.
- Pass current values to ordinary props; pass accessors only to APIs that
  explicitly require them.
- Do not destructure reactive props.
- Built-in HTML attributes are lowercase (`tabindex`); events use camelCase
  (`onClick`). Replace `attr:`, `bool:`, `on:`, and `oncapture:` namespaces with
  platform attributes, Solid events, or ref callbacks for native listener options.

Event bindings are evaluated once. Select changing behaviour inside a stable
handler, rather than in its binding expression:

```tsx
// Wrong: chooses one handler at setup.
<button onClick={editing() ? save : edit}>Continue</button>
// Correct: chooses when clicked.
<button onClick={(event) => (editing() ? save : edit)(event)}>Continue</button>
```

For dynamic components, prefer `dynamic(() => component)` when a stable
component identity is useful; `Dynamic` is the inline JSX convenience form.

## Context

Replace `<Context.Provider value={state}>` with `<Context value={state}>`.
`createContext<T>()` without a default requires a provider: `useContext` returns
`T` and throws `ContextNotFoundError` when it is missing. Avoid adding a second
missing-provider check. Supply a default only when that fallback is meaningful;
preserve the repository's intended state scope.

## Repository audit

Search the whole repository, including shared packages and embedded libraries:

```sh
rg -n 'onSignal|solid-js/(web|store)|\b(batch|onMount|createResource|createComputed|mergeProps|splitProps|unwrap)\b' .
```

Review neighbouring repositories for reusable domain patterns, but do not treat
them as authoritative. Migration helpers and hidden apply-phase reads can remain
even in repositories with otherwise strong Solid 2 guidance.
