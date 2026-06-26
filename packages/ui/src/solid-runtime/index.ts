import { createStore as createSolidStore } from "solid-js";
import { onSignal } from "../utils/on-signal.ts";

export { onSignal };
export type { AccessorArray, OnSignalOptions } from "../utils/on-signal.ts";

type StoreSetter = (...args: any[]) => void;

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
  const [store, setStore] = createSolidStore(initialValue as any);
  const setCompatStore: StoreSetter = (...args) => {
    setStore((state: any) => applyPath(state, args));
  };

  return [store as T, setCompatStore];
}

export function produce<T = any>(fn: (state: T) => void | T) {
  return fn;
}

export function reconcile<T>(value: T, _options?: unknown) {
  return () => value;
}

export function unwrap<T>(value: T): T {
  return value;
}

export function batch<T>(fn: () => T): T {
  return fn();
}
