import { type Accessor, createRenderEffect } from "solid-js";

export type AccessorArray<T = unknown> = readonly Accessor<T>[];

export type OnSignalOptions = {
  defer?: boolean;
};

type AccessorValues<T extends readonly Accessor<unknown>[]> = {
  [K in keyof T]: T[K] extends Accessor<infer V> ? V : never;
};

export function onSignal<T>(
  dependency: Accessor<T>,
  fn: (input: T, prev?: T) => void,
  options?: OnSignalOptions,
): void;
export function onSignal<T extends readonly Accessor<unknown>[]>(
  dependency: T,
  fn: (input: AccessorValues<T>, prev?: AccessorValues<T>) => void,
  options?: OnSignalOptions,
): void;
export function onSignal<T>(
  dependency: Accessor<T> | AccessorArray,
  fn: (input: T | unknown[], prev?: T | unknown[]) => void,
  options?: OnSignalOptions,
) {
  let initialized = false;
  let previous: T | unknown[] | undefined;

  return createRenderEffect(
    () => {
      if (typeof dependency !== "function") {
        return dependency.map((accessor) => accessor());
      }

      return dependency();
    },
    (input) => {
      if (options?.defer && !initialized) {
        initialized = true;
        previous = input;
        return;
      }

      fn(input, previous);
      previous = input;
      initialized = true;
    },
  );
}
