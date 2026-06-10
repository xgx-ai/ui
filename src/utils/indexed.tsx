import { type Accessor, For } from "solid-js";
import type { JSX } from "@solidjs/web";

export function Index<T, U extends JSX.Element>(props: {
  each: readonly T[] | undefined | null | false;
  fallback?: JSX.Element;
  children: (item: Accessor<T>, index: number) => U;
}): JSX.Element {
  return (
    <For each={props.each} keyed={false} fallback={props.fallback}>
      {props.children}
    </For>
  );
}
