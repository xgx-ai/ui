import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";
import { useDndContext } from "./context";
import type { DragData, DroppableOptions, DroppableState } from "./types";

/**
 * Return type for createDroppable primitive
 */
export interface DroppableResult {
  /** Reactive state of the droppable */
  state: Accessor<DroppableState>;
  /** Ref setter to attach to the droppable element */
  setRef: (el: HTMLElement) => void;
}

/**
 * Creates a droppable element primitive.
 * Provides reactive state and automatic cleanup.
 *
 * @example
 * ```tsx
 * const { state, setRef } = createDroppable({
 *   data: () => ({ id: "drop-zone", type: "container" }),
 *   onDrop: (item) => console.log("Dropped:", item),
 *   accepts: (item) => item.type === "card",
 * });
 *
 * return (
 *   <div
 *     ref={setRef}
 *     class={cn(
 *       "p-4 border rounded",
 *       state().isOver && state().canDrop && "border-primary"
 *     )}
 *   >
 *     Drop here
 *   </div>
 * );
 * ```
 */
export function createDroppable<T extends DragData = DragData>(
  options: DroppableOptions<T>,
): DroppableResult {
  const [state, setState] = createSignal<DroppableState>({
    isOver: false,
    canDrop: false,
    draggingItem: null,
  });

  let elementRef: HTMLElement | null = null;

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

  createEffect(() => {
    const el = elementRef;
    if (!el) return;

    // Check if disabled
    if (options.disabled?.()) return;

    const cleanup = dropTargetForElements({
      element: el,
      getData: () => options.data() as Record<string, unknown>,
      canDrop: ({ source }) => {
        const sourceData = source.data as DragData;
        if (options.accepts) {
          return options.accepts(sourceData);
        }
        return true;
      },
      onDragEnter: ({ source }) => {
        const sourceData = source.data as DragData;
        const canDrop = options.accepts ? options.accepts(sourceData) : true;
        setState({
          isOver: true,
          canDrop,
          draggingItem: sourceData,
        });
        dndContext?.setOverTarget(options.data());
        if (canDrop) {
          options.onDragEnter?.(sourceData);
        }
      },
      onDragLeave: ({ source }) => {
        const sourceData = source.data as DragData;
        setState({
          isOver: false,
          canDrop: false,
          draggingItem: null,
        });
        dndContext?.setOverTarget(null);
        options.onDragLeave?.(sourceData);
      },
      onDrop: ({ source }) => {
        const sourceData = source.data as DragData;
        setState({
          isOver: false,
          canDrop: false,
          draggingItem: null,
        });
        options.onDrop?.(sourceData);
      },
    });

    onCleanup(cleanup);
  });

  return {
    state,
    setRef,
  };
}
