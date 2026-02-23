import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { disableNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview";
import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";
import { useDndContext } from "./context";
import type { DragData, DraggableOptions, DragState } from "./types";

/**
 * Return type for createDraggable primitive
 */
export interface DraggableResult {
  /** Reactive state of the draggable */
  state: Accessor<DragState>;
  /** Ref setter to attach to the draggable element */
  setRef: (el: HTMLElement) => void;
  /** Ref setter for a custom drag handle (optional) */
  setHandleRef: (el: HTMLElement) => void;
}

/**
 * Creates a draggable element primitive.
 * Provides reactive state and automatic cleanup.
 *
 * @example
 * ```tsx
 * const { state, setRef } = createDraggable({
 *   data: () => ({ id: props.id, type: "item" }),
 *   onDragStart: () => console.log("Started dragging"),
 * });
 *
 * return (
 *   <div
 *     ref={setRef}
 *     class={state().isDragging ? "opacity-50" : ""}
 *   >
 *     Drag me
 *   </div>
 * );
 * ```
 */
export function createDraggable<T extends DragData = DragData>(
  options: DraggableOptions<T>,
): DraggableResult {
  const [state, setState] = createSignal<DragState>({
    isDragging: false,
    isOver: false,
  });

  let elementRef: HTMLElement | null = null;
  let handleRef: HTMLElement | null = null;

  // Try to get context, but allow usage without provider
  let dndContext: ReturnType<typeof useDndContext> | null = null;
  try {
    dndContext = useDndContext();
  } catch {
    // No provider - that's okay, we'll work without global state
  }

  const setRef = (el: HTMLElement) => {
    elementRef = el;
  };

  const setHandleRef = (el: HTMLElement) => {
    handleRef = el;
  };

  createEffect(() => {
    const el = elementRef;
    if (!el) return;

    // Check if disabled
    if (options.disabled?.()) return;

    const cleanup = draggable({
      element: el,
      dragHandle: handleRef ?? undefined,
      getInitialData: () => options.data() as Record<string, unknown>,
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        // Disable native preview - we'll use DragOverlay instead
        disableNativeDragPreview({ nativeSetDragImage });
      },
      onDragStart: ({ location }) => {
        setState({ isDragging: true, isOver: false });
        dndContext?.setActiveItem(options.data());
        dndContext?.setPosition({
          x: location.current.input.clientX,
          y: location.current.input.clientY,
        });
        options.onDragStart?.();
      },
      onDrag: ({ location }) => {
        dndContext?.setPosition({
          x: location.current.input.clientX,
          y: location.current.input.clientY,
        });
      },
      onDrop: () => {
        const overTarget = dndContext?.state().overTarget ?? null;
        setState({ isDragging: false, isOver: false });
        dndContext?.setActiveItem(null);
        dndContext?.setOverTarget(null);
        options.onDrop?.(overTarget);
        options.onDragEnd?.();
      },
    });

    onCleanup(cleanup);
  });

  return {
    state,
    setRef,
    setHandleRef,
  };
}
