import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { disableNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview";
import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import {
  draggingSourceClasses,
  reorderTransitionClasses,
} from "../animations/presets";
import type { Edge } from "../core/types";
import {
  arrayMove,
  type SortableData,
  useSortableContext,
} from "./sortable-context";

/**
 * State returned by the sortable hook
 */
export interface SortableState {
  /** Whether this item is being dragged */
  isDragging: boolean;
  /** Whether a dragged item is over this item */
  isOver: boolean;
  /** The edge being hovered (for drop indicator) */
  closestEdge: Edge | null;
  /** Whether this item should show the drop indicator before */
  showIndicatorBefore: boolean;
  /** Whether this item should show the drop indicator after */
  showIndicatorAfter: boolean;
}

/**
 * Options for the sortable hook
 */
export interface SortableOptions {
  /** Unique ID for this item */
  id: string;
  /** Index of this item in the list */
  index: number;
  /** Whether sorting is disabled for this item */
  disabled?: Accessor<boolean>;
  /** Additional data to attach to this item */
  data?: Record<string, unknown>;
}

/**
 * Result returned by createSortable
 */
export interface SortableResult {
  /** Reactive state */
  state: Accessor<SortableState>;
  /** Ref setter for the sortable element */
  setRef: (el: HTMLElement) => void;
  /** Ref setter for a custom drag handle */
  setHandleRef: (el: HTMLElement) => void;
  /** CSS classes to apply for animations */
  sortableClass: Accessor<string>;
  /** Style object for transform animations */
  sortableStyle: Accessor<Record<string, string>>;
}

/**
 * Creates a sortable item within a SortableProvider.
 * Handles both dragging and drop target behavior.
 *
 * @example
 * ```tsx
 * const { state, setRef, sortableClass } = createSortable({
 *   id: props.id,
 *   index: props.index,
 * });
 *
 * return (
 *   <div ref={setRef} class={sortableClass()}>
 *     {props.children}
 *   </div>
 * );
 * ```
 */
export function createSortable(options: SortableOptions): SortableResult {
  const context = useSortableContext();
  const [state, setState] = createSignal<SortableState>({
    isDragging: false,
    isOver: false,
    closestEdge: null,
    showIndicatorBefore: false,
    showIndicatorAfter: false,
  });

  let elementRef: HTMLElement | null = null;
  let handleRef: HTMLElement | null = null;

  const setRef = (el: HTMLElement) => {
    elementRef = el;
  };

  const setHandleRef = (el: HTMLElement) => {
    handleRef = el;
  };

  const getSortableData = (): SortableData => ({
    id: options.id,
    type: "sortable",
    index: options.index,
    containerId: context.containerId,
    ...options.data,
  });

  // Set up draggable
  createEffect(() => {
    const el = elementRef;
    if (!el) return;
    if (options.disabled?.()) return;

    const cleanup = draggable({
      element: el,
      dragHandle: handleRef ?? undefined,
      getInitialData: getSortableData,
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        // Disable native preview - we'll use DragOverlay instead
        disableNativeDragPreview({ nativeSetDragImage });
      },
      onDragStart: () => {
        setState((s) => ({ ...s, isDragging: true }));
        context.setDragState({
          activeId: options.id,
          activeIndex: options.index,
        });
      },
      onDrop: () => {
        const dragState = context.dragState();

        // Perform reorder if we have valid indices
        if (
          dragState.activeIndex !== null &&
          dragState.overIndex !== null &&
          dragState.activeIndex !== dragState.overIndex
        ) {
          const items = context.items();
          const newItems = arrayMove(
            items,
            dragState.activeIndex,
            dragState.overIndex,
          );

          context.onReorder?.({
            item: items[dragState.activeIndex],
            fromIndex: dragState.activeIndex,
            toIndex: dragState.overIndex,
            items: newItems,
          });
        }

        setState((s) => ({ ...s, isDragging: false }));
        context.setDragState({
          activeId: null,
          activeIndex: null,
          overId: null,
          overIndex: null,
          edge: null,
        });
      },
    });

    onCleanup(cleanup);
  });

  // Set up drop target
  createEffect(() => {
    const el = elementRef;
    if (!el) return;

    const cleanup = dropTargetForElements({
      element: el,
      getData: ({ input, element }) => {
        const data = getSortableData();
        return attachClosestEdge(data, {
          input,
          element,
          allowedEdges:
            context.orientation() === "vertical"
              ? ["top", "bottom"]
              : ["left", "right"],
        });
      },
      canDrop: ({ source }) => {
        const sourceData = source.data as SortableData;
        // Only accept sortable items from the same container
        if (sourceData.type !== "sortable") return false;
        return sourceData.containerId === context.containerId;
      },
      onDragEnter: ({ self, source }) => {
        const edge = extractClosestEdge(self.data) as Edge | null;
        const sourceData = source.data as SortableData;

        // Calculate the target index based on edge
        let targetIndex = options.index;
        if (edge === "bottom" || edge === "right") {
          targetIndex = options.index + 1;
        }

        // Adjust if dragging from before to after
        if (sourceData.index < options.index) {
          targetIndex =
            edge === "top" || edge === "left"
              ? options.index - 1
              : options.index;
        }

        const isVertical = context.orientation() === "vertical";
        const showBefore = isVertical ? edge === "top" : edge === "left";
        const showAfter = isVertical ? edge === "bottom" : edge === "right";

        setState({
          isDragging: state().isDragging,
          isOver: true,
          closestEdge: edge,
          showIndicatorBefore: showBefore && sourceData.id !== options.id,
          showIndicatorAfter: showAfter && sourceData.id !== options.id,
        });

        context.setDragState({
          overId: options.id,
          overIndex: targetIndex,
          edge,
        });
      },
      onDrag: ({ self, source }) => {
        const edge = extractClosestEdge(self.data) as Edge | null;
        const sourceData = source.data as SortableData;

        if (edge !== state().closestEdge) {
          let targetIndex = options.index;
          if (edge === "bottom" || edge === "right") {
            targetIndex = options.index + 1;
          }

          if (sourceData.index < options.index) {
            targetIndex =
              edge === "top" || edge === "left"
                ? options.index - 1
                : options.index;
          }

          const isVertical = context.orientation() === "vertical";
          const showBefore = isVertical ? edge === "top" : edge === "left";
          const showAfter = isVertical ? edge === "bottom" : edge === "right";

          setState((s) => ({
            ...s,
            closestEdge: edge,
            showIndicatorBefore: showBefore && sourceData.id !== options.id,
            showIndicatorAfter: showAfter && sourceData.id !== options.id,
          }));

          context.setDragState({
            overIndex: targetIndex,
            edge,
          });
        }
      },
      onDragLeave: () => {
        setState((s) => ({
          ...s,
          isOver: false,
          closestEdge: null,
          showIndicatorBefore: false,
          showIndicatorAfter: false,
        }));
      },
      onDrop: () => {
        setState((s) => ({
          ...s,
          isOver: false,
          closestEdge: null,
          showIndicatorBefore: false,
          showIndicatorAfter: false,
        }));
      },
    });

    onCleanup(cleanup);
  });

  // Computed classes for the sortable element
  const sortableClass = createMemo(() => {
    const classes: string[] = [reorderTransitionClasses];
    if (state().isDragging) {
      classes.push(draggingSourceClasses);
    }
    return classes.join(" ");
  });

  // Computed style for transform animations
  const sortableStyle = createMemo(() => {
    return {};
  });

  return {
    state,
    setRef,
    setHandleRef,
    sortableClass,
    sortableStyle,
  };
}
