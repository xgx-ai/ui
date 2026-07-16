import { createSignal, createStore, snapshot, type StoreSetter } from "solid-js";

const DEFAULT_HISTORY_DEPTH = 32;

export interface HistoryOptions {
  depth?: number;
  manual?: boolean;
}

type StateUpdate<T> = T | ((current: T) => T);

function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Small Solid 2-native history store. Every operation carries its next value
 * explicitly so deferred store flushes never turn a write-then-read into stale
 * history.
 */
export function createHistoryStore<T extends object>(initial: T, options: HistoryOptions = {}) {
  const depth = Math.max(1, options.depth ?? DEFAULT_HISTORY_DEPTH);
  const [state, setStore] = createStore<T>(clone(initial) as T extends Function ? never : T);
  let entryValues = [clone(initial)];
  let currentIndex = 0;
  const [entries, setEntries] = createSignal<T[]>(entryValues.map(clone));
  const [index, setIndex] = createSignal(currentIndex);

  function publishHistory() {
    setEntries(entryValues.map(clone));
    setIndex(currentIndex);
  }

  function replaceStore(next: T) {
    setStore(() => clone(next));
  }

  function commit(value: T = snapshot(state)): T {
    const withoutFuture = entryValues.slice(0, currentIndex + 1);
    entryValues = [...withoutFuture, clone(value)].slice(-depth);
    currentIndex = entryValues.length - 1;
    publishHistory();
    return value;
  }

  function setState(update: StateUpdate<T>): T {
    const current = clone(snapshot(state));
    const next = typeof update === "function" ? update(current) : update;
    replaceStore(next);
    if (!options.manual) commit(next);
    return next;
  }

  function restore(position: number): T | undefined {
    const entry = entryValues[position];
    if (!entry) return undefined;
    const restored = clone(entry);
    replaceStore(restored);
    currentIndex = position;
    setIndex(currentIndex);
    return restored;
  }

  function undo(): T | undefined {
    return restore(currentIndex - 1);
  }

  function redo(): T | undefined {
    return restore(currentIndex + 1);
  }

  function clearHistory(value: T = snapshot(state)) {
    entryValues = [clone(value)];
    currentIndex = 0;
    publishHistory();
  }

  return [
    state,
    setState,
    {
      clearHistory,
      commit,
      entries,
      index,
      redo,
      restore,
      undo,
    },
  ] as const satisfies readonly [
    T,
    (update: StateUpdate<T>) => T,
    {
      clearHistory: (value?: T) => void;
      commit: (value?: T) => T;
      entries: () => T[];
      index: () => number;
      redo: () => T | undefined;
      restore: (position: number) => T | undefined;
      undo: () => T | undefined;
    },
  ];
}

export type HistoryStoreSetter<T extends object> = StoreSetter<T>;
