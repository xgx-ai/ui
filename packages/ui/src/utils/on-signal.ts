import { createEffect, untrack, type Accessor } from "solid-js";

export type AccessorArray<T = unknown> = readonly Accessor<T>[];
export type OnOptions = {
  defer?: boolean;
};

export function onSignal<T>(
  dependency: Accessor<T>,
  fn: (input: T, prev?: T) => void,
  options?: OnOptions,
): void;
export function onSignal(
  dependency: Accessor<unknown> | AccessorArray,
  fn: (input: any, prev?: any) => void,
  options?: OnOptions,
) {
  let initialised = false;

  return createEffect(
    () =>
      Array.isArray(dependency)
        ? dependency.map((accessor) => accessor())
        : (dependency as Accessor<unknown>)(),
    (input: any, previous: any) => {
      if (options?.defer && !initialised) {
        initialised = true;
        return;
      }

      initialised = true;
      untrack(() => fn(input, previous));
    },
  );
}
