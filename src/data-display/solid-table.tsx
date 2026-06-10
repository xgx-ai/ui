import type { JSX } from "@solidjs/web";
import { createComponent } from "@solidjs/web";
import {
  createTable,
  functionalUpdate,
  type RowData,
  type TableOptions,
} from "@tanstack/table-core";
import { createRenderEffect, createStore, merge as mergeProps } from "solid-js";

export * from "@tanstack/table-core";

export function flexRender<TProps>(
  component: ((props: TProps) => JSX.Element) | JSX.Element | undefined,
  props: TProps,
): JSX.Element {
  if (!component) return null;
  if (typeof component === "function") {
    return createComponent(component as never, props as never);
  }
  return component;
}

export function createSolidTable<TData extends RowData>(options: TableOptions<TData>) {
  const table = createTable({
    state: {},
    onStateChange: () => {},
    renderFallbackValue: null,
    mergeOptions: (defaults, next) => mergeProps(defaults, next),
    ...options,
  });
  const [state, setState] = createStore(table.initialState);

  createRenderEffect(
    () => ({
      options,
      state,
    }),
    ({ options: currentOptions }) => {
      table.setOptions((previous) =>
        mergeProps(previous, currentOptions, {
          state: mergeProps(state, currentOptions.state ?? {}),
          onStateChange: (updater: any) => {
            setState((previousState) => functionalUpdate(updater, previousState));
            currentOptions.onStateChange?.(updater);
          },
        }),
      );
    },
  );

  return table;
}
