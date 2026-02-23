import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { disableNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview";
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
import {
  type KanbanColumnData,
  type KanbanItemData,
  useKanbanContext,
} from "./kanban-context";

/**
 * State of a kanban column
 */
export interface KanbanColumnState {
  /** Whether this column is being dragged */
  isDragging: boolean;
  /** Whether an item is being dragged over this column */
  isOver: boolean;
  /** Whether this is the source column of the dragged item */
  isSource: boolean;
  /** Number of items in flight from this column */
  itemCount: number;
}

/**
 * Render props for KanbanColumn
 */
export interface KanbanColumnRenderProps {
  state: Accessor<KanbanColumnState>;
  setHeaderRef: (el: HTMLElement) => void;
}

/**
 * Props for KanbanColumn
 */
export interface KanbanColumnProps {
  /** Unique ID for this column */
  id: string;
  /** Index of this column */
  index: number;
  /** Additional CSS classes */
  class?: string;
  /** Content - can be render function for full control */
  children: JSX.Element | ((props: KanbanColumnRenderProps) => JSX.Element);
}

/**
 * A kanban column that accepts dragged items.
 * Can also be dragged to reorder columns if enabled in KanbanProvider.
 *
 * @example
 * ```tsx
 * <KanbanColumn id={column.id} index={index()}>
 *   {({ state, setHeaderRef }) => (
 *     <div class={cn("min-h-[200px]", state().isOver && "bg-primary/5")}>
 *       <div ref={setHeaderRef} class="font-bold p-2">
 *         {column.title}
 *       </div>
 *       <For each={column.items}>
 *         {(item, i) => (
 *           <KanbanItem id={item.id} columnId={column.id} index={i()}>
 *             {item.title}
 *           </KanbanItem>
 *         )}
 *       </For>
 *     </div>
 *   )}
 * </KanbanColumn>
 * ```
 */
export const KanbanColumn: Component<KanbanColumnProps> = (props) => {
  const context = useKanbanContext();

  const [state, setState] = createSignal<KanbanColumnState>({
    isDragging: false,
    isOver: false,
    isSource: false,
    itemCount: 0,
  });

  let elementRef: HTMLElement | null = null;
  let headerRef: HTMLElement | null = null;

  const setRef = (el: HTMLElement) => {
    elementRef = el;
  };

  const setHeaderRef = (el: HTMLElement) => {
    headerRef = el;
  };

  const getColumnData = (): KanbanColumnData => ({
    id: props.id,
    type: "kanbanColumn",
    index: props.index,
  });

  // Track if this is the source column
  createEffect(() => {
    const dragState = context.dragState();
    setState((s) => ({
      ...s,
      isSource: dragState.sourceColumnId === props.id,
    }));
  });

  // Set up column as draggable (if allowed)
  createEffect(() => {
    if (!context.allowColumnReorder) return;
    const el = headerRef ?? elementRef;
    if (!el) return;

    const cleanup = draggable({
      element: el,
      getInitialData: getColumnData,
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        // Disable native preview - we'll use DragOverlay instead
        disableNativeDragPreview({ nativeSetDragImage });
      },
      onDragStart: () => {
        setState((s) => ({ ...s, isDragging: true }));
        context.setDragState({
          dragType: "column",
          activeId: props.id,
        });
      },
      onDrop: () => {
        const dragState = context.dragState();

        if (dragState.overIndex !== null && dragState.activeId) {
          context.onColumnReorder?.({
            columnId: dragState.activeId,
            fromIndex: props.index,
            toIndex: dragState.overIndex,
          });
        }

        setState((s) => ({ ...s, isDragging: false }));
        context.setDragState({
          dragType: null,
          activeId: null,
          overColumnId: null,
          overIndex: null,
        });
      },
    });

    onCleanup(cleanup);
  });

  // Set up as drop target for items
  createEffect(() => {
    const el = elementRef;
    if (!el) return;

    const cleanup = dropTargetForElements({
      element: el,
      getData: getColumnData,
      canDrop: ({ source }) => {
        const sourceData = source.data as KanbanItemData | KanbanColumnData;
        // Accept items, not columns (columns use different drop targets)
        return sourceData.type === "kanbanItem";
      },
      onDragStart: () => {
        setState((s) => ({ ...s, isOver: true }));
      },
      onDragEnter: ({ source }) => {
        const sourceData = source.data as KanbanItemData;
        setState((s) => ({ ...s, isOver: true }));
        context.setDragState({
          overColumnId: props.id,
          // If dropping on empty area, put at end
          overIndex: sourceData.columnId === props.id ? sourceData.index : 0,
        });
      },
      onDragLeave: () => {
        setState((s) => ({ ...s, isOver: false }));
      },
      onDrop: ({ source, self, location }) => {
        // If the drop landed on a nested item, the item's onDrop handles it
        const targets = location.current.dropTargets;
        if (targets[0]?.element !== self.element) {
          setState((s) => ({ ...s, isOver: false }));
          return;
        }

        const sourceData = source.data as KanbanItemData;
        const dragState = context.dragState();

        context.onItemMove?.({
          itemId: sourceData.id,
          fromColumnId: sourceData.columnId,
          toColumnId: props.id,
          fromIndex: sourceData.index,
          toIndex: dragState.overIndex ?? 0,
        });

        setState((s) => ({ ...s, isOver: false }));
      },
    });

    onCleanup(cleanup);
  });

  const columnClass = createMemo(() => {
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
      class={`${columnClass()} ${props.class ?? ""}`}
      data-kanbanColumn={props.id}
    >
      <Show when={isRenderFunction()} fallback={props.children as JSX.Element}>
        {(props.children as (props: KanbanColumnRenderProps) => JSX.Element)({
          state,
          setHeaderRef,
        })}
      </Show>
    </div>
  );
};
