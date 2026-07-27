import { createMemo, createSignal } from "solid-js";
import { createComponent } from "@solidjs/web";

const REGISTRY_KEY = "__xgx_solid_refresh_v2_registry";
const NEXT_REGISTRY_KEY = "__xgx_solid_refresh_v2_next_registry";
const GLOBAL_STATE_KEY = "__xgx_solid_refresh_v2_state";

type Component = (props: Record<string, unknown>) => any;

type ComponentRecord = {
  component: Component;
  /**
   * Live record this one defers to. A re-evaluated module registers a fresh
   * record for the same component; it must render whatever the *mounted*
   * record renders, and keep doing so as later edits arrive.
   */
  delegate?: ComponentRecord;
  hash: string;
  id: string;
  proxy: Component;
  read: () => Component;
  update: (component: Component, hash: string) => void;
};

type Registry = {
  components: Map<string, ComponentRecord>;
};

type RefreshScope = {
  key: string;
};

type RefreshState = {
  nextInstanceOrdinalById: Map<string, number>;
  proxyRecords: WeakMap<object, ComponentRecord>;
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
refreshState.nextInstanceOrdinalById ||= new Map<string, number>();
refreshState.proxyRecords ||= new WeakMap<object, ComponentRecord>();
refreshState.rootDisposers ||= new Map<string, () => void>();
refreshState.scopeStack ||= [];
refreshState.signalCache ||= new Map<string, ReturnType<typeof createSignal>>();

const { nextInstanceOrdinalById, proxyRecords, rootDisposers, scopeStack, signalCache } =
  refreshState as RefreshState;

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

/** Follows the delegate chain to the record that owns the mounted component. */
function resolveRecord(record: ComponentRecord): ComponentRecord {
  let target = record;

  for (let depth = 0; depth < 16; depth += 1) {
    const next = target.delegate;
    if (!next || next === target) break;
    target = next;
  }

  return target;
}

function createProxy(record: ComponentRecord, id: string) {
  const refreshName = `[xgx-solid-hmr]${id}`;

  function HmrComponent(props: Record<string, unknown>) {
    const scope = createRefreshScope(id);

    return createMemo(
      () => {
        // Track this record even when it delegates: `update` writes through its
        // own signal when the delegate link changes, and the live record's
        // signal carries subsequent edits. Both have to be read to stay hot.
        const own = record.read();
        const live = resolveRecord(record);
        const current = live === record ? own : live.read();

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
      return resolveRecord(record).component?.[property as keyof Component];
    },
    set(_, property, value) {
      const current = resolveRecord(record).component;
      if (current) {
        (current as unknown as Record<PropertyKey, unknown>)[property] = value;
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
    update: (nextComponent, nextHash) => {
      // Workaround (Bun HMR): patchRegistry hands the mounted record's *proxy* to
      // the incoming record so the re-evaluated module's export keeps rendering
      // the mounted tree. Storing that proxy as a component made the live record
      // render a proxy of itself on the next patch round — the subtree duplicated
      // and then froze on stale code. Record it as a delegate link instead, which
      // stays live across later edits and makes patching idempotent.
      const delegate = proxyRecords.get(nextComponent as unknown as object);

      if (delegate) {
        record.delegate = delegate === record ? undefined : delegate;
        record.hash = nextHash;
        setState({ component: record.component });
        return;
      }

      record.delegate = undefined;
      record.component = nextComponent;
      record.hash = nextHash;
      setState({ component: nextComponent });
    },
  };

  record.proxy = createProxy(record, id);
  proxyRecords.set(record.proxy as unknown as object, record);
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
  beginRefresh();
  const ids = new Set([...currentRegistry.components.keys(), ...nextRegistry.components.keys()]);

  try {
    for (const id of ids) {
      const current = currentRegistry.components.get(id);
      const next = nextRegistry.components.get(id);

      if (current && next) {
        if (current.hash !== next.hash) {
          current.update(next.component, next.hash);
        }
        next.update(current.proxy, current.hash);
        continue;
      }

      if (current && !next) return false;
      if (!current && next) currentRegistry.components.set(id, next);
    }

    return true;
  } finally {
    endRefresh();
  }
}

function reloadPage() {
  if (typeof window !== "undefined") window.location.reload();
}

export function $$register(data: Record<string, unknown>, registry: Registry) {
  if (!data) return;
  data[REGISTRY_KEY] ||= registry;
  data[NEXT_REGISTRY_KEY] = registry;
}

export function $$refresh(data: Record<string, unknown>) {
  const currentRegistry = data?.[REGISTRY_KEY] as Registry | undefined;
  const nextRegistry = data?.[NEXT_REGISTRY_KEY] as Registry | undefined;

  if (!currentRegistry || !nextRegistry) {
    reloadPage();
    return;
  }

  if (!patchRegistry(currentRegistry, nextRegistry)) {
    reloadPage();
  }
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
