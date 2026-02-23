import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";
import { dragPreviewClasses } from "../animations/presets";
import type { DragData, DragPreviewProps } from "../core/types";

/**
 * Props for the DefaultPreview component
 */
export interface DefaultPreviewProps<T extends DragData = DragData>
  extends DragPreviewProps<T> {
  /** Additional CSS classes */
  class?: string;
  /** Custom render function for the preview content */
  render?: (item: T) => JSX.Element;
}

/**
 * Default drag preview component.
 * Displays a styled card with the item's ID or custom content.
 *
 * @example
 * ```tsx
 * <DefaultPreview
 *   item={activeItem()}
 *   render={(item) => <MyCustomContent item={item} />}
 * />
 * ```
 */
export const DefaultPreview: Component<DefaultPreviewProps> = (props) => {
  return (
    <div
      class={`${dragPreviewClasses} bg-background border border-border p-3 min-w-[120px] ${props.class ?? ""}`}
    >
      <Show
        when={props.render}
        fallback={
          <Show
            when={props.children}
            fallback={
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-primary" />
                <span class="text-sm font-medium text-foreground">
                  {props.item.id}
                </span>
              </div>
            }
          >
            {props.children}
          </Show>
        }
      >
        {(render) => render()(props.item)}
      </Show>
    </div>
  );
};
