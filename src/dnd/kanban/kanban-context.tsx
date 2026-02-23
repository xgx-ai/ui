import {
  type Accessor,
  createContext,
  createSignal,
  type JSX,
  useContext,
} from "solid-js";
import type { DragData } from "../core/types";

/**
 * Data for a kanban item
 */
export interface KanbanItemData extends DragData {
  type: "kanbanItem";
  columnId: string;
  index: number;
}

/**
 * Data for a kanban column
 */
export interface KanbanColumnData extends DragData {
  type: "kanbanColumn";
  index: number;
}

/**
 * Event when an item moves between or within columns
 */
export interface KanbanMoveEvent {
  /** ID of the item being moved */
  itemId: string;
  /** Source column ID */
  fromColumnId: string;
  /** Target column ID */
  toColumnId: string;
  /** Original index in source column */
  fromIndex: number;
  /** New index in target column */
  toIndex: number;
}

/**
 * Event when columns are reordered
 */
export interface KanbanColumnReorderEvent {
  /** ID of the column being moved */
  columnId: string;
  /** Original index */
  fromIndex: number;
  /** New index */
  toIndex: number;
}

/**
 * State of kanban drag operations
 */
export interface KanbanDragState {
  /** Type of item being dragged */
  dragType: "item" | "column" | null;
  /** ID of the item being dragged */
  activeId: string | null;
  /** Column ID of the source */
  sourceColumnId: string | null;
  /** Column ID being hovered */
  overColumnId: string | null;
  /** Item ID being hovered */
  overItemId: string | null;
  /** Index where item will be dropped */
  overIndex: number | null;
  /** Height of the dragged element (for placeholder sizing) */
  draggedElementHeight: number | null;
}

/**
 * Context value for kanban
 */
interface KanbanContextValue {
  /** Current drag state */
  dragState: Accessor<KanbanDragState>;
  /** Update drag state */
  setDragState: (state: Partial<KanbanDragState>) => void;
  /** Handler for item moves */
  onItemMove?: (event: KanbanMoveEvent) => void;
  /** Handler for column reorders */
  onColumnReorder?: (event: KanbanColumnReorderEvent) => void;
  /** Whether column reordering is enabled */
  allowColumnReorder: boolean;
}

const KanbanContext = createContext<KanbanContextValue>();

/**
 * Props for KanbanProvider
 */
export interface KanbanProviderProps {
  /** Called when an item is moved between or within columns */
  onItemMove?: (event: KanbanMoveEvent) => void;
  /** Called when columns are reordered */
  onColumnReorder?: (event: KanbanColumnReorderEvent) => void;
  /** Whether to allow column reordering */
  allowColumnReorder?: boolean;
  /** Children */
  children: JSX.Element;
}

/**
 * Provider for kanban board drag and drop.
 * Supports dragging items between columns and optionally reordering columns.
 *
 * @example
 * ```tsx
 * <KanbanProvider
 *   onItemMove={({ itemId, toColumnId, toIndex }) => {
 *     moveItem(itemId, toColumnId, toIndex);
 *   }}
 *   onColumnReorder={({ columnId, toIndex }) => {
 *     reorderColumn(columnId, toIndex);
 *   }}
 *   allowColumnReorder
 * >
 *   <div class="flex gap-4">
 *     <For each={columns()}>
 *       {(column, index) => (
 *         <KanbanColumn id={column.id} index={index()}>
 *           ...items
 *         </KanbanColumn>
 *       )}
 *     </For>
 *   </div>
 * </KanbanProvider>
 * ```
 */
export function KanbanProvider(props: KanbanProviderProps): JSX.Element {
  const [dragState, setDragStateSignal] = createSignal<KanbanDragState>({
    dragType: null,
    activeId: null,
    sourceColumnId: null,
    overColumnId: null,
    overItemId: null,
    overIndex: null,
    draggedElementHeight: null,
  });

  const setDragState = (partial: Partial<KanbanDragState>) => {
    setDragStateSignal((prev) => ({ ...prev, ...partial }));
  };

  const contextValue: KanbanContextValue = {
    dragState,
    setDragState,
    onItemMove: props.onItemMove,
    onColumnReorder: props.onColumnReorder,
    allowColumnReorder: props.allowColumnReorder ?? false,
  };

  return (
    <KanbanContext.Provider value={contextValue}>
      {props.children}
    </KanbanContext.Provider>
  );
}

/**
 * Hook to access kanban context
 */
export function useKanbanContext(): KanbanContextValue {
  const context = useContext(KanbanContext);
  if (!context) {
    throw new Error("useKanbanContext must be used within a KanbanProvider");
  }
  return context;
}
