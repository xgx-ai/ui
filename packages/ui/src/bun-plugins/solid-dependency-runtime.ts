// Compatibility for third-party packages that still publish Solid 1 imports.
// App and @xgx/ui source should import native Solid 2 APIs directly.
import * as solid from "solid-js";

export * from "solid-js";

type StoreSetter = (...args: any[]) => void;

export const mergeProps = solid.merge;

export function createComputed(fn: (previous?: any) => any) {
  return solid.createRenderEffect((previous) => fn(previous), () => undefined, {
    name: "computed",
  });
}

export function createRenderEffect(source: any, fn?: any, options?: any) {
  if (typeof fn !== "function") {
    return solid.createRenderEffect((previous) => source(previous), () => undefined, fn);
  }

  return solid.createRenderEffect(source, fn, options);
}

export function createEffect(source: any, fn?: any, options?: any) {
  if (typeof fn !== "function") {
    return solid.createEffect((previous) => source(previous), () => undefined, fn);
  }

  let cleanup: (() => void) | undefined;
  solid.onCleanup(() => cleanup?.());

  return solid.createEffect(
    () => source(),
    (input, previous) => {
      cleanup?.();
      cleanup = undefined;

      const result = fn(input, previous);
      if (typeof result === "function") cleanup = result;
    },
    options,
  );
}

export function createContext(defaultValue?: any, options?: any) {
  const context = solid.createContext(defaultValue, options);
  (context as any).Provider = context;
  return context;
}

export function batch<T>(fn: () => T): T {
  return fn();
}

export function on(dependency: any, fn: any, options?: any) {
  let initialized = false;
  return (previous: any) => {
    const input = Array.isArray(dependency)
      ? dependency.map((accessor) => accessor())
      : dependency();

    if (options?.defer && !initialized) {
      initialized = true;
      return previous;
    }

    initialized = true;
    const next = fn(input, previous);
    return next === undefined ? input : next;
  };
}

export function onMount(fn: () => void) {
  return createEffect(() => {
    fn();
    return undefined;
  });
}

function resolveValue(current: any, value: any) {
  if (typeof value !== "function") return value;
  const next = value(current);
  return next === undefined ? current : next;
}

function applyPath(target: any, args: any[]): any {
  if (args.length === 1) {
    return resolveValue(target, args[0]);
  }

  const [key, ...rest] = args;

  if (Array.isArray(key)) {
    for (const item of key) applyPath(target, [item, ...rest]);
    return target;
  }

  if (typeof key === "function") {
    const entries = Array.isArray(target)
      ? target.map((value, index) => [index, value])
      : Object.entries(target);
    for (const [entryKey, value] of entries) {
      if (key(value, entryKey)) {
        const next = applyPath(value, rest);
        if (next !== value) target[entryKey] = next;
      }
    }
    return target;
  }

  if (rest.length === 1) {
    target[key] = resolveValue(target[key], rest[0]);
    return target;
  }

  const next = applyPath(target[key], rest);
  if (next !== target[key]) target[key] = next;
  return target;
}

export function createStore<T extends object>(initialValue: T): [T, StoreSetter] {
  const [store, setStore] = solid.createStore(initialValue as any);
  const setCompatStore: StoreSetter = (...args) => {
    setStore((state: any) => applyPath(state, args));
  };

  return [store as T, setCompatStore];
}

export function reconcile<T>(value: T, _options?: unknown) {
  return () => value;
}

export function unwrap<T>(value: T): T {
  return solid.snapshot(value as any) as T;
}

export function createResource(source: any, fetcherOrOptions?: any, maybeOptions?: any) {
  const hasFetcher = typeof fetcherOrOptions === "function";
  const fetcher = hasFetcher ? fetcherOrOptions : undefined;
  const options = hasFetcher ? maybeOptions : fetcherOrOptions;
  const storage = options?.storage?.();
  const [read, write] = storage ?? solid.createSignal(undefined);
  const [latest, setLatest] = solid.createSignal(read());
  const [loading, setLoading] = solid.createSignal(false);
  const [error, setError] = solid.createSignal<unknown>(undefined);

  const resource = (() => read()) as any;
  Object.defineProperties(resource, {
    error: { get: () => error() },
    latest: { get: () => latest() ?? read() },
    loading: { get: () => loading() },
  });

  const refetch = async () => {
    const sourceValue =
      typeof source === "function" && fetcher ? source() : undefined;
    const result = fetcher
      ? fetcher(sourceValue, { value: read() })
      : typeof source === "function"
        ? source()
        : source;
    setLoading(true);
    try {
      const next = await result;
      write(next);
      setLatest(next);
      setError(undefined);
      return next;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const mutate = (value: any) => {
    write(value);
    setLatest(read());
  };

  void refetch();

  return [resource, { mutate, refetch }] as const;
}
