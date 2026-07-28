import { createComponent } from "@solidjs/web";
import { createMemo, createSignal } from "solid-js";

const REGISTRY_KEY = "__xgx_solid_refresh_v2_registry";
const NEXT_REGISTRY_KEY = "__xgx_solid_refresh_v2_next_registry";
const GLOBAL_STATE_KEY = "__xgx_solid_refresh_v2_state";

type Component = (props: Record<string, unknown>) => any;

type ComponentRecord = {
  component: Component;
  hash: string;
  id: string;
  proxy: Component;
  read: () => Component;
  /**
   * Set when the component was mounted with `children`. Swapping such a
   * component re-creates its subtree, but the children were built by its parent
   * and stay bound to the owner that swap disposed — they render once more and
   * then never update again. There is no in-place patch for that, so the whole
   * page reloads instead of leaving the screen silently stale.
   */
  rendersChildren: boolean;
  update: (component: Component, hash: string) => void;
};

type PendingUpdate = {
  component: Component;
  hash: string;
};

type Registry = {
  components: Map<string, ComponentRecord>;
};

type RefreshScope = {
  key: string;
};

type RefreshState = {
  /**
   * Bumped once per applied hot update. Every component proxy reads it, so a
   * swap re-renders the tree from the root down.
   *
   * Workaround (Bun HMR): swapping a component in place re-created its subtree
   * but not the `children` its parent had already built, leaving those memos
   * attached to a disposed owner — the DOM then froze on the code from before
   * the swap while later edits appeared to do nothing. Re-rendering top-down
   * rebuilds every owner; `signalCache` + `refreshSnapshot` carry component
   * state across, which is what `resetRefreshScopes` exists for.
   */
  generation: ReturnType<typeof createSignal<number>>;
  /**
   * One record per component id, shared by every evaluation of its module.
   *
   * Workaround (Bun HMR): an edit anywhere re-evaluates most of the graph, so a
   * component is registered many times over a session. Handing out a fresh
   * proxy each time left the mounted tree holding a proxy from an older
   * generation that later patches never reached — edits silently stopped
   * applying until a full reload. Keying records by id keeps exactly one live
   * proxy per component no matter which evaluation hands it out.
   */
  liveRecords: Map<string, ComponentRecord>;
  nextInstanceOrdinalById: Map<string, number>;
  pendingUpdates: Map<ComponentRecord, PendingUpdate>;
  refreshSnapshot?: Map<string, unknown>;
  rootDisposers: Map<string, () => void>;
  scopeStack: RefreshScope[];
  signalCache: Map<string, ReturnType<typeof createSignal>>;
};

const globalRecord = globalThis as unknown as Record<string, Partial<RefreshState>>;
let hotData: Record<string, Partial<RefreshState>> | undefined;

if (import.meta.hot) {
  hotData = import.meta.hot.data as Record<string, Partial<RefreshState>>;
}

const refreshState = (hotData?.[GLOBAL_STATE_KEY] ||
  globalRecord[GLOBAL_STATE_KEY] ||
  {}) as Partial<RefreshState>;

if (hotData) hotData[GLOBAL_STATE_KEY] = refreshState;
globalRecord[GLOBAL_STATE_KEY] = refreshState;
refreshState.generation ||= createSignal(0, { equals: false, ownedWrite: true });
refreshState.liveRecords ||= new Map<string, ComponentRecord>();
refreshState.nextInstanceOrdinalById ||= new Map<string, number>();
refreshState.pendingUpdates ||= new Map<ComponentRecord, PendingUpdate>();
refreshState.rootDisposers ||= new Map<string, () => void>();
refreshState.scopeStack ||= [];
refreshState.signalCache ||= new Map<string, ReturnType<typeof createSignal>>();

const {
  generation,
  liveRecords,
  nextInstanceOrdinalById,
  pendingUpdates,
  rootDisposers,
  scopeStack,
  signalCache,
} = refreshState as RefreshState;

const [readGeneration, setGeneration] = generation;

function createCachedSignal<T>(value: T, options?: Parameters<typeof createSignal<T>>[1]) {
  return (createSignal as unknown as (value: T, options?: unknown) => unknown)(
    value,
    options,
  ) as ReturnType<typeof createSignal<T>>;
}

function withRefreshScope<T>(scope: RefreshScope, render: () => T): T {
  scopeStack.push(scope);
  try {
    return render();
  } finally {
    scopeStack.pop();
  }
}

function createRefreshScope(id: string): RefreshScope {
  const ordinal = nextInstanceOrdinalById.get(id) ?? 0;
  nextInstanceOrdinalById.set(id, ordinal + 1);
  return { key: `${id}:${ordinal}` };
}

function resetRefreshScopes() {
  nextInstanceOrdinalById.clear();
}

function beginRefresh() {
  resetRefreshScopes();
  refreshState.refreshSnapshot = new Map(
    Array.from(signalCache, ([key, signal]) => [key, signal[0]()]),
  );
}

function endRefresh() {
  refreshState.refreshSnapshot = undefined;
}

export function $$signal<T>(
  id: string,
  initializer: () => T,
  options?: Parameters<typeof createSignal<T>>[1],
) {
  const scope = scopeStack.at(-1);
  if (!scope) return createCachedSignal(initializer(), options);

  const key = `${scope.key}:${id}`;
  const cached = signalCache.get(key);
  const snapshotValue = refreshState.refreshSnapshot?.get(key);
  if (cached && refreshState.refreshSnapshot?.has(key)) {
    (cached[1] as (value: unknown) => unknown)(snapshotValue);
  }
  if (cached) return cached as ReturnType<typeof createSignal<T>>;

  const signal = createCachedSignal(initializer(), options);
  signalCache.set(key, signal as ReturnType<typeof createSignal>);
  return signal;
}

function setComponentProperty(component: Component, key: string, value: unknown) {
  const descriptor = Object.getOwnPropertyDescriptor(component, key);
  Object.defineProperty(component, key, {
    ...descriptor,
    value,
    configurable: true,
    enumerable: false,
    writable: descriptor?.writable ?? false,
  });
}

function createProxy(record: ComponentRecord, id: string) {
  const refreshName = `[xgx-solid-hmr]${id}`;

  function HmrComponent(props: Record<string, unknown>) {
    const scope = createRefreshScope(id);
    if (props && "children" in props) record.rendersChildren = true;

    return createMemo(
      () => {
        readGeneration();
        const current = record.read();

        return current
          ? withRefreshScope(scope, () => createComponent(current as never, props as never))
          : undefined;
      },
      { equals: false },
    );
  }

  setComponentProperty(HmrComponent, "name", refreshName);

  return new Proxy(HmrComponent, {
    get(_, property) {
      if (property === "name") return HmrComponent.name;
      return record.component?.[property as keyof Component];
    },
    set(_, property, value) {
      if (record.component) {
        (record.component as unknown as Record<PropertyKey, unknown>)[property] = value;
      }
      return true;
    },
  });
}

export function $$registry(): Registry {
  return {
    components: new Map(),
  };
}

export function $$component(registry: Registry, id: string, component: Component, hash: string) {
  const existing = liveRecords.get(id);

  if (existing) {
    // Re-evaluation of an already-mounted component: keep the live record and
    // proxy, and queue the swap for $$refresh so the whole module lands at once.
    registry.components.set(id, existing);
    if (existing.hash !== hash) pendingUpdates.set(existing, { component, hash });

    return existing.proxy;
  }

  const [readState, setState] = createSignal(
    { component },
    {
      equals: false,
      ownedWrite: true,
    },
  );
  const record: ComponentRecord = {
    component,
    hash,
    id,
    proxy: undefined as unknown as Component,
    read: () => readState().component,
    rendersChildren: false,
    update: (nextComponent, nextHash) => {
      record.component = nextComponent;
      record.hash = nextHash;
      setState({ component: nextComponent });
    },
  };

  record.proxy = createProxy(record, id);
  liveRecords.set(id, record);
  registry.components.set(id, record);

  return record.proxy;
}

/**
 * Disposes the render root this module mounted on its previous evaluation.
 *
 * Workaround (Bun HMR): an update to any module in the graph re-evaluates the
 * entry module, so a bare `render(...)` at module scope mounts a second copy of
 * the application on every edit. The plugin pairs this with `$$root` below.
 */
export function $$disposeRoot(id: string) {
  const dispose = rootDisposers.get(id);
  if (!dispose) return;

  rootDisposers.delete(id);
  dispose();
}

/** Records the dispose handle returned by a root `render(...)` call. */
export function $$root<T>(id: string, dispose: T): T {
  if (typeof dispose === "function") {
    rootDisposers.set(id, dispose as unknown as () => void);
  }

  return dispose;
}

function patchRegistry(currentRegistry: Registry, nextRegistry: Registry) {
  // A component that disappeared cannot be patched — its mounted instances have
  // no replacement to swap in. Fall back to a reload.
  for (const id of currentRegistry.components.keys()) {
    if (!nextRegistry.components.has(id)) return false;
  }

  if (pendingUpdates.size === 0) return true;

  const updates = [...pendingUpdates];
  pendingUpdates.clear();

  for (const [record] of updates) {
    if (record.rendersChildren) return false;
  }

  beginRefresh();

  try {
    for (const [record, next] of updates) {
      record.update(next.component, next.hash);
    }

    setGeneration((value) => value + 1);

    return true;
  } finally {
    endRefresh();
  }
}

export function $$register(data: Record<string, unknown>, registry: Registry) {
  if (!data) return;
  data[REGISTRY_KEY] ||= registry;
  data[NEXT_REGISTRY_KEY] = registry;
}

/**
 * Applies a module's hot update. Returns false when the update cannot be
 * patched in place — the caller then hands the module back to Bun with
 * `import.meta.hot.invalidate()`.
 *
 * Workaround (Bun HMR): this used to call `window.location.reload()` directly,
 * which races the dev server's rebuild — the reload could land on a bundle
 * generation the server had already discarded, leaving the page stale with no
 * live HMR socket. `invalidate()` lets Bun sequence the reload against the build.
 */
export function $$refresh(data: Record<string, unknown>) {
  const currentRegistry = data?.[REGISTRY_KEY] as Registry | undefined;
  const nextRegistry = data?.[NEXT_REGISTRY_KEY] as Registry | undefined;

  if (!currentRegistry || !nextRegistry) return false;

  return patchRegistry(currentRegistry, nextRegistry);
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
