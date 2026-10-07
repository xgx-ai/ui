import { createEffect, createMemo, onCleanup } from "solid-js";

// Exercise the actual native Sortable component and ownership graph without a
// browser. Only the external DOM renderer and SortableJS engine are controlled.
export * from "@solidjs/web";

export class SortableTestElement {
  readonly attributes = new Map<string, string>();
  readonly classList = { contains: () => false };
  restoredChildren: SortableTestElement[] = [];
  constructor(
    readonly props: Record<string, unknown>,
    readonly isItem: boolean,
  ) {}
  get children() {
    return this.isItem
      ? []
      : [...sortableTestRows].sort(
          (a, b) => Number(a.props["data-sortable-index"]) - Number(b.props["data-sortable-index"]),
        );
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? this.props[name]?.toString() ?? null;
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
  replaceChildren(...children: SortableTestElement[]) {
    this.restoredChildren = children;
  }
}

export const sortableTestRows = new Set<SortableTestElement>();
export const sortableTestInstances: SortableTestInstance[] = [];
export const sortableTestLifecycle = { mounts: 0, cleanups: 0 };

export function Dynamic(props: Record<string, unknown>) {
  const isItem = "data-sortable-item" in props;
  const element = new SortableTestElement(props, isItem);
  if (isItem) {
    sortableTestRows.add(element);
    sortableTestLifecycle.mounts++;
  }
  createEffect(
    () => props.ref,
    (ref) => {
      if (typeof ref === "function") ref(element);
    },
  );
  onCleanup(() => {
    if (isItem) {
      sortableTestRows.delete(element);
      sortableTestLifecycle.cleanups++;
    }
  });
  return createMemo(() => props.children);
}

type SortableTestOptions = Record<string, unknown> & {
  onStart?: (event: unknown) => void;
  onEnd?: (event: unknown) => void;
};
export class SortableTestInstance {
  destroyed = false;
  constructor(
    readonly element: SortableTestElement,
    readonly options: SortableTestOptions,
  ) {}
  option(name: string, value: unknown) {
    this.options[name] = value;
  }
  destroy() {
    this.destroyed = true;
  }
}

export default {
  create(element: SortableTestElement, options: SortableTestOptions) {
    const instance = new SortableTestInstance(element, options);
    sortableTestInstances.push(instance);
    return instance;
  },
};

export function resetSortableTestBoundaries() {
  sortableTestRows.clear();
  sortableTestInstances.length = 0;
  sortableTestLifecycle.mounts = 0;
  sortableTestLifecycle.cleanups = 0;
}
