import type { Accessor, Component, JSX } from "solid-js";
import { Show, splitProps } from "solid-js";
import { DropIndicatorLine } from "../preview/drag-overlay";
import { createSortable, type SortableState } from "./use-sortable";

/**
 * Render props passed to SortableItem children
 */
export interface SortableItemRenderProps {
  /** Current state of the sortable item */
  state: Accessor<SortableState>;
  /** Ref setter for custom drag handle */
  setHandleRef: (el: HTMLElement) => void;
  /** CSS classes to apply for animations */
  sortableClass: Accessor<string>;
}

/**
 * Props for SortableItem component
 */
export interface SortableItemProps {
  /** Unique ID for this item */
  id: string;
  /** Index of this item in the list */
  index: number;
  /** Whether sorting is disabled for this item */
  disabled?: boolean;
  /** Additional data to attach */
  data?: Record<string, unknown>;
  /** Additional CSS classes for the wrapper */
  class?: string;
  /** Children - can be a render function for full control */
  children: JSX.Element | ((props: SortableItemRenderProps) => JSX.Element);
  /** Orientation - affects drop indicator placement */
  orientation?: "horizontal" | "vertical";
}

/**
 * A sortable item component for use within SortableProvider.
 * Handles all drag and drop logic automatically.
 *
 * @example
 * ```tsx
 * // Simple usage
 * <SortableItem id={item.id} index={index()}>
 *   <div class="p-4">{item.name}</div>
 * </SortableItem>
 *
 * // With render props for custom control
 * <SortableItem id={item.id} index={index()}>
 *   {({ state, setHandleRef, sortableClass }) => (
 *     <div class={cn("p-4", sortableClass())}>
 *       <button ref={setHandleRef}>⠿</button>
 *       <span class={state().isDragging ? "opacity-50" : ""}>
 *         {item.name}
 *       </span>
 *     </div>
 *   )}
 * </SortableItem>
 * ```
 */
export const SortableItem: Component<SortableItemProps> = (props) => {
  const [local, _others] = splitProps(props, [
    "id",
    "index",
    "disabled",
    "data",
    "class",
    "children",
    "orientation",
  ]);

  const { state, setRef, setHandleRef, sortableClass } = createSortable({
    id: local.id,
    index: local.index,
    disabled: () => local.disabled ?? false,
    data: local.data,
  });

  const orientation = () => local.orientation ?? "vertical";
  const isRenderFunction = () => typeof local.children === "function";

  return (
    <div
      ref={setRef}
      class={`relative ${sortableClass()} ${local.class ?? ""}`}
      data-sortable-id={local.id}
      data-sortable-index={local.index}
    >
      {/* Drop indicator before */}
      <DropIndicatorLine
        visible={state().showIndicatorBefore}
        orientation={orientation()}
        edge="before"
      />

      {/* Content */}
      <Show when={isRenderFunction()} fallback={local.children as JSX.Element}>
        {(local.children as (props: SortableItemRenderProps) => JSX.Element)({
          state,
          setHandleRef,
          sortableClass,
        })}
      </Show>

      {/* Drop indicator after */}
      <DropIndicatorLine
        visible={state().showIndicatorAfter}
        orientation={orientation()}
        edge="after"
      />
    </div>
  );
};
