import { type Accessor, type AccessorArray, createEffect, type OnOptions, on } from "solid-js";

export function onSignal<T>(
  dependency: Accessor<T> | AccessorArray<T>,
  fn: (input: T, prev?: T) => void,
  options?: OnOptions,
) {
  return createEffect(on(dependency, fn, options as OnOptions));
}
