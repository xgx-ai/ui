import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import {
  type Accessor,
  type Component,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  onCleanup,
  Show,
} from "solid-js";
import {
  draggingSourceClasses,
  reorderTransitionClasses,
} from "../animations/presets";
import { type KanbanItemData, useKanbanContext } from "./kanban-context";

/**
 * State of a kanban item
 */
export interface KanbanItemState {
  /** Whether this item is being dragged */
  isDragging: boolean;
  /** Whether another item is being dragged over this one */
  isOver: boolean;
  /** Edge being hovered */
  closestEdge: "top" | "bottom" | null;
  /** Show indicator above */
  showIndicatorAbove: boolean;
  /** Show indicator below */
  showIndicatorBelow: boolean;
}

/**
 * Render props for KanbanItem
 */
export interface KanbanItemRenderProps {
  state: Accessor<KanbanItemState>;
  setHandleRef: (el: HTMLElement) => void;
}

/**
 * Props for KanbanItem
 */
export interface KanbanItemProps {
  /** Unique ID for this item */
  id: string;
  /** ID of the column this item belongs to */
  columnId: string;
  /** Index of this item within its column */
  index: number;
  /** Whether dragging is disabled */
  disabled?: boolean;
  /** Additional data to attach */
  data?: Record<string, unknown>;
  /** Additional CSS classes */
  class?: string;
  /** Content - can be render function for full control */
  children: JSX.Element | ((props: KanbanItemRenderProps) => JSX.Element);
}

/**
 * A kanban item that can be dragged between columns.
 *
 * @example
 * ```tsx
 * <KanbanItem id={item.id} columnId={column.id} index={index()}>
 *   {({ state, setHandleRef }) => (
 *     <div class={cn("p-3 bg-card rounded", state().isDragging && "opacity-50")}>
 *       <button ref={setHandleRef}>⠿</button>
 *       {item.title}
 *     </div>
 *   )}
 * </KanbanItem>
 * ```
 */
export const KanbanItem: Component<KanbanItemProps> = (props) => {
  const context = useKanbanContext();

  const [state, setState] = createSignal<KanbanItemState>({
    isDragging: false,
    isOver: false,
    closestEdge: null,
    showIndicatorAbove: false,
    showIndicatorBelow: false,
  });

  let elementRef: HTMLElement | null = null;
  let handleRef: HTMLElement | null = null;

  const setRef = (el: HTMLElement) => {
    elementRef = el;
  };

  const setHandleRef = (el: HTMLElement) => {
    handleRef = el;
  };

  const getItemData = (): KanbanItemData => ({
    id: props.id,
    type: "kanbanItem",
    columnId: props.columnId,
    index: props.index,
    ...props.data,
  });

  // Set up draggable
  createEffect(() => {
    const el = elementRef;
    if (!el) return;
    if (props.disabled) return;

    const cleanup = draggable({
      element: el,
      dragHandle: handleRef ?? undefined,
      getInitialData: getItemData,
      onGenerateDragPreview: ({ source, nativeSetDragImage }) => {
        // Create a native drag preview from the element itself
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: () => {
            // Center the preview on the cursor
            const rect = source.element.getBoundingClientRect();
            return { x: rect.width / 2, y: rect.height / 2 };
          },
          render: ({ container }) => {
            // Clone the element for the preview
            const clone = source.element.cloneNode(true) as HTMLElement;
            clone.style.width = `${source.element.getBoundingClientRect().width}px`;
            clone.style.opacity = "0.9";
            clone.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.2)";
            clone.style.transform = "rotate(2deg)";
            container.appendChild(clone);
          },
        });
      },
      onDragStart: () => {
        setState((s) => ({ ...s, isDragging: true }));
        // Capture element height for placeholder sizing
        const height = elementRef?.getBoundingClientRect().height ?? null;
        context.setDragState({
          dragType: "item",
          activeId: props.id,
          sourceColumnId: props.columnId,
          draggedElementHeight: height,
        });
      },
      onDrop: () => {
        setState((s) => ({ ...s, isDragging: false }));
        context.setDragState({
          dragType: null,
          activeId: null,
          sourceColumnId: null,
          overColumnId: null,
          overItemId: null,
          overIndex: null,
          draggedElementHeight: null,
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
        const data = getItemData();
        return attachClosestEdge(data, {
          input,
          element,
          allowedEdges: ["top", "bottom"],
        });
      },
      canDrop: ({ source }) => {
        const sourceData = source.data as KanbanItemData;
        // Can't drop on self
        return sourceData.id !== props.id && sourceData.type === "kanbanItem";
      },
      onDragEnter: ({ self, source }) => {
        const edge = extractClosestEdge(self.data) as "top" | "bottom" | null;
        const sourceData = source.data as KanbanItemData;

        let targetIndex = props.index;
        if (edge === "bottom") {
          targetIndex = props.index + 1;
        }

        // Adjust for same column moves
        if (
          sourceData.columnId === props.columnId &&
          sourceData.index < props.index
        ) {
          targetIndex = edge === "top" ? props.index - 1 : props.index;
        }

        setState({
          isDragging: state().isDragging,
          isOver: true,
          closestEdge: edge,
          showIndicatorAbove: edge === "top",
          showIndicatorBelow: edge === "bottom",
        });

        context.setDragState({
          overColumnId: props.columnId,
          overItemId: props.id,
          overIndex: targetIndex,
        });
      },
      onDrag: ({ self, source }) => {
        const edge = extractClosestEdge(self.data) as "top" | "bottom" | null;
        const sourceData = source.data as KanbanItemData;

        if (edge !== state().closestEdge) {
          let targetIndex = props.index;
          if (edge === "bottom") {
            targetIndex = props.index + 1;
          }

          if (
            sourceData.columnId === props.columnId &&
            sourceData.index < props.index
          ) {
            targetIndex = edge === "top" ? props.index - 1 : props.index;
          }

          setState((s) => ({
            ...s,
            closestEdge: edge,
            showIndicatorAbove: edge === "top",
            showIndicatorBelow: edge === "bottom",
          }));

          context.setDragState({
            overIndex: targetIndex,
          });
        }
      },
      onDragLeave: () => {
        setState((s) => ({
          ...s,
          isOver: false,
          closestEdge: null,
          showIndicatorAbove: false,
          showIndicatorBelow: false,
        }));
      },
      onDrop: ({ source }) => {
        const sourceData = source.data as KanbanItemData;
        const dragState = context.dragState();

        context.onItemMove?.({
          itemId: sourceData.id,
          fromColumnId: sourceData.columnId,
          toColumnId: props.columnId,
          fromIndex: sourceData.index,
          toIndex: dragState.overIndex ?? props.index,
        });

        setState((s) => ({
          ...s,
          isOver: false,
          closestEdge: null,
          showIndicatorAbove: false,
          showIndicatorBelow: false,
        }));
      },
    });

    onCleanup(cleanup);
  });

  const itemClass = createMemo(() => {
    const classes: string[] = [reorderTransitionClasses];
    if (state().isDragging) {
      classes.push(draggingSourceClasses);
    }
    return classes.join(" ");
  });

  const isRenderFunction = () => typeof props.children === "function";

  return (
    <div
      ref={setRef}
      class={`relative ${itemClass()} ${props.class ?? ""}`}
      data-kanbanItem={props.id}
    >
      {/* Drop indicator above */}
      <Show when={state().showIndicatorAbove}>
        <div class="flex items-center mb-1.5">
          <div class="size-1.5 shrink-0 rounded-full bg-primary" />
          <div class="flex-1 h-0.5 bg-primary rounded-full" />
        </div>
      </Show>

      <Show when={isRenderFunction()} fallback={props.children as JSX.Element}>
        {(props.children as (props: KanbanItemRenderProps) => JSX.Element)({
          state,
          setHandleRef,
        })}
      </Show>

      {/* Drop indicator below */}
      <Show when={state().showIndicatorBelow}>
        <div class="flex items-center mt-1.5">
          <div class="size-1.5 shrink-0 rounded-full bg-primary" />
          <div class="flex-1 h-0.5 bg-primary rounded-full" />
        </div>
      </Show>
    </div>
  );
};
