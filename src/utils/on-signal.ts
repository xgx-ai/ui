import { type Accessor, createRenderEffect } from "solid-js";

type AccessorArray<T> = readonly Accessor<T>[];

type OnSignalOptions = {
  defer?: boolean;
};

export function onSignal<T>(
  dependency: Accessor<T> | AccessorArray<T>,
  fn: (input: T, prev?: T) => void,
  options?: OnSignalOptions,
) {
  let initialized = false;
  let previous: T | undefined;

  return createRenderEffect(
    () => {
      if (typeof dependency !== "function") {
        return dependency.map((accessor) => accessor()) as T;
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
