import { createMemo, createSignal } from "solid-js";
import { createComponent } from "@solidjs/web";

const REGISTRY_KEY = "__xgx_solid_refresh_v2_registry";
const NEXT_REGISTRY_KEY = "__xgx_solid_refresh_v2_next_registry";
const GLOBAL_STATE_KEY = "__xgx_solid_refresh_v2_state";

type Component = (props: Record<string, unknown>) => any;

type ComponentRecord = {
  component: Component;
  hash: string;
  id: string;
  proxy: Component;
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
  refreshSnapshot?: Map<string, unknown>;
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
refreshState.scopeStack ||= [];
refreshState.signalCache ||= new Map<string, ReturnType<typeof createSignal>>();

const { nextInstanceOrdinalById, scopeStack, signalCache } = refreshState as RefreshState;

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

function createProxy(
  reactiveSource: () => Component | undefined,
  staticSource: () => Component | undefined,
  id: string,
) {
  const refreshName = `[xgx-solid-hmr]${id}`;

  function HmrComponent(props: Record<string, unknown>) {
    const scope = createRefreshScope(id);

    return createMemo(
      () => {
        const current = reactiveSource();
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
      return staticSource()?.[property as keyof Component];
    },
    set(_, property, value) {
      const current = staticSource();
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
  let currentComponent = component;
  const [readState, setState] = createSignal(
    { component },
    {
      equals: false,
      ownedWrite: true,
    },
  );
  const readComponent = () => readState().component;
  const proxy = createProxy(readComponent, () => currentComponent, id);
  const record: ComponentRecord = {
    component,
    hash,
    id,
    proxy,
    update: (nextComponent, nextHash) => {
      currentComponent = nextComponent;
      record.component = nextComponent;
      record.hash = nextHash;
      setState({ component: nextComponent });
    },
  };

  registry.components.set(id, record);

  return proxy;
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
