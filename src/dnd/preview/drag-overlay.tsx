import type { Component, JSX } from "solid-js";
import { createMemo, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { useDndConfig, useDndMonitor } from "../core/context";
import type { DragData } from "../core/types";
import { DefaultPreview } from "./default-preview";

/**
 * Props for the DragOverlay component
 */
export interface DragOverlayProps {
  /** Custom render function for the preview */
  children?: (item: DragData) => JSX.Element;
  /** Offset from cursor position */
  offset?: { x: number; y: number };
  /** Additional CSS classes for the overlay container */
  class?: string;
}

/**
 * Portal-based drag overlay that follows the cursor.
 * Automatically renders the active dragged item with smooth positioning.
 *
 * @example
 * ```tsx
 * <DndProvider>
 *   <MyContent />
 *   <DragOverlay>
 *     {(item) => <CustomPreview item={item} />}
 *   </DragOverlay>
 * </DndProvider>
 * ```
 */
export const DragOverlay: Component<DragOverlayProps> = (props) => {
  const { activeItem, position, isDragging } = useDndMonitor();
  const config = useDndConfig();

  const offset = createMemo(() => props.offset ?? { x: -10, y: -10 });

  const transform = createMemo(() => {
    const pos = position();
    const off = offset();
    return `translate3d(${pos.x + off.x}px, ${pos.y + off.y}px, 0)`;
  });

  const PreviewComponent = config.preview ?? DefaultPreview;

  return (
    <Portal mount={document.body}>
      <Show when={isDragging() && activeItem()}>
        {(item) => (
          <div
            class={`fixed top-0 left-0 pointer-events-none z-[9999] will-change-transform ${props.class ?? ""}`}
            style={{ transform: transform() }}
          >
            <Show
              when={props.children}
              fallback={<PreviewComponent item={item()} />}
            >
              {(renderFn) => renderFn()(item())}
            </Show>
          </div>
        )}
      </Show>
    </Portal>
  );
};

/**
 * Props for the DropIndicator component
 */
export interface DropIndicatorLineProps {
  /** Whether the indicator is visible */
  visible: boolean;
  /** Orientation of the list */
  orientation?: "horizontal" | "vertical";
  /** Position relative to the target element */
  edge?: "before" | "after";
  /** Additional CSS classes */
  class?: string;
}

/**
 * A simple drop indicator line.
 * Shows where an item will be inserted.
 *
 * @example
 * ```tsx
 * <DropIndicatorLine
 *   visible={isOver() && edge() === "before"}
 *   orientation="vertical"
 *   edge="before"
 * />
 * ```
 */
export const DropIndicatorLine: Component<DropIndicatorLineProps> = (props) => {
  const orientation = () => props.orientation ?? "vertical";
  const edge = () => props.edge ?? "before";

  return (
    <Show when={props.visible}>
      <div
        class={`
					absolute bg-primary rounded-full transition-opacity duration-150
					${orientation() === "vertical" ? "h-0.5 left-0 right-0" : "w-0.5 top-0 bottom-0"}
					${orientation() === "vertical" && edge() === "before" ? "-top-px" : ""}
					${orientation() === "vertical" && edge() === "after" ? "-bottom-px" : ""}
					${orientation() === "horizontal" && edge() === "before" ? "-left-px" : ""}
					${orientation() === "horizontal" && edge() === "after" ? "-right-px" : ""}
					${props.class ?? ""}
				`}
      />
    </Show>
  );
};
