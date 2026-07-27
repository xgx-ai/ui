# SolidJS 2 reactivity patterns

## Contents

- Effects
- Hidden reads
- Cleanup returns
- Derived state
- Props and component bodies
- Stores
- Lifecycle
- Batching and writes
- Tests

## Effects

Solid 2 effects have a tracked compute phase and an untracked apply phase.
Compute answers “what changed?”; apply answers “what external work follows?”.

```ts
createEffect(
	() => [socket(), roomId()] as const,
	([socket, roomId]) => {
		socket.subscribe(roomId);
		return () => socket.unsubscribe(roomId);
	},
);
```

Apply receives the previous computed value as its second parameter:

```ts
createEffect(
	() => selectedId(),
	(nextId, previousId) => {
		auditSelectionChange(previousId, nextId);
	},
	{ defer: true },
);
```

Avoid Solid 1 single-callback effects and local `onSignal`/`on` recreations.

## Hidden reads

This is wrong even though compute returns a dependency:

```ts
createEffect(provider, (currentProvider) => {
	presence.updateZoom(zoom());
	currentProvider?.send();
});
```

`zoom()` is a direct apply-phase read. `presence.updateZoom` may also hide a
provider signal read. Resolve both:

```ts
createEffect(
	() => ({ provider: provider(), zoom: zoom() }),
	({ provider, zoom }) => {
		presence.updateZoom(zoom, provider);
	},
);
```

The same rule applies to callbacks that close over a memo:

```ts
// Wrong: attach() calls session() internally during apply.
createEffect(editor, (value) => attach(value));

// Correct: derive the stable callback while tracking.
const attach = createMemo(() => session().attach);
createEffect(
	() => ({ attach: attach(), editor: editor() }),
	({ attach, editor }) => {
		if (editor) attach(editor);
	},
);
```

Inspect helpers rather than wrapping them in `untrack`.

## Cleanup returns

Apply may return only a cleanup function or `undefined`.

```ts
// Wrong: a signal setter returns the written value.
createEffect(open, (value) => setOpen(value));

// Correct: discard it.
createEffect(open, (value) => {
	setOpen(value);
});
```

A direct callback is valid only when it deliberately returns cleanup:

```ts
const register = (value: Value) => {
	registry.add(value);
	return () => registry.delete(value);
};

createEffect(currentValue, register);
```

Check third-party callbacks typed as returning `void`. Runtime implementations
can still return a value, especially when the callback is a Solid setter.

## Derived state

Use a memo for read-only derivation:

```ts
const fullName = createMemo(() => `${user.first} ${user.last}`);
```

Do not mirror it:

```ts
const [fullName, setFullName] = createSignal("");
createEffect(
	() => `${user.first} ${user.last}`,
	(value) => {
		setFullName(value);
	},
);
```

Use a function-form signal when local writes may temporarily override derived
state:

```ts
const [draftName, setDraftName] = createSignal(() => props.name);
```

Use `createStore(fn, seed)` for a field-granular derived object or collection.

## Props and component bodies

Do not destructure reactive props:

```tsx
// Wrong
function Title({ title }: { title: string }) {
	return <h1>{title}</h1>;
}

// Correct
function Title(props: { title: string }) {
	return <h1>{props.title}</h1>;
}
```

Do not freeze a top-level read:

```tsx
// Wrong
const title = props.title;
return <h1>{title}</h1>;

// Correct
const title = createMemo(() => props.title);
return <h1>{title()}</h1>;
```

Use `untrack(() => props.initialValue)` only when the value is intentionally a
one-time initial snapshot.

## Stores

Passing a store proxy through compute does not track later property reads:

```ts
// Wrong
createEffect(
	() => store.user,
	(user) => analytics.identify(user.id, user.role),
);

// Correct: property-level tracking and plain output.
createEffect(
	() => ({ id: store.user.id, role: store.user.role }),
	(user) => {
		analytics.identify(user.id, user.role);
	},
);
```

Use `deep(store)` to subscribe to all nested properties and receive a plain
value. Use `snapshot(store)` for a plain value without creating subscriptions.

Prefer draft-first setters:

```ts
setStore((draft) => {
	draft.user.name = nextName;
});
```

## Lifecycle

Use `onSettled` for mount-style work:

```ts
onSettled(() => {
	const observer = new ResizeObserver(measure);
	observer.observe(element);
	return () => observer.disconnect();
});
```

Return cleanup from an effect apply function for per-dependency setup. Do not
register ordinary effect cleanup with `onCleanup` inside apply.

## Batching and writes

Writes commit at the microtask flush:

```ts
setCount(1);
count(); // previous committed value
flush();
count(); // 1
```

Prefer designing around the queued commit. Use `flush()` only when an imperative
consumer must immediately observe committed state or updated DOM.

Do not write application state from `createMemo`, effect compute functions, or
component top level. Use events, actions, or the effect apply phase.

## Tests

Create reactive primitives under `createRoot` and dispose them:

```ts
createRoot((dispose) => {
	const [value, setValue] = createSignal(0);
	const doubled = createMemo(() => value() * 2);

	setValue(2);
	flush();
	expect(doubled()).toBe(4);
	dispose();
});
```

For effects, assert dependency boundaries as well as outputs. Count source reads
to catch accidental subscriptions caused by apply-phase helpers.
