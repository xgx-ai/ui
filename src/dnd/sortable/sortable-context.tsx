import {
  type Accessor,
  createContext,
  createSignal,
  type JSX,
  useContext,
} from "solid-js";
import type { DragData } from "../core/types";

/**
 * Data specific to sortable items
 */
export interface SortableData extends DragData {
  type: "sortable";
  index: number;
  containerId: string;
}

/**
 * Information about a drag operation in sortable context
 */
export interface SortableDragState {
  /** ID of the item being dragged */
  activeId: string | null;
  /** Index of the item being dragged */
  activeIndex: number | null;
  /** ID of the item being hovered over */
  overId: string | null;
  /** Index where the item will be inserted */
  overIndex: number | null;
  /** Edge of the target (for determining before/after) */
  edge: "top" | "bottom" | "left" | "right" | null;
}

/**
 * Reorder event data
 */
export interface ReorderEvent<T> {
  /** The item that was moved */
  item: T;
  /** Original index */
  fromIndex: number;
  /** New index */
  toIndex: number;
  /** The full reordered array */
  items: T[];
}

/**
 * Context value for sortable lists
 */
interface SortableContextValue<T = unknown> {
  /** Unique ID for this sortable container */
  containerId: string;
  /** Current items in the list */
  items: Accessor<T[]>;
  /** Get the ID of an item */
  getId: (item: T) => string;
  /** Current drag state */
  dragState: Accessor<SortableDragState>;
  /** Update drag state */
  setDragState: (state: Partial<SortableDragState>) => void;
  /** Orientation of the list */
  orientation: Accessor<"horizontal" | "vertical">;
  /** Handle reorder */
  onReorder?: (event: ReorderEvent<T>) => void;
}

const SortableContext = createContext<SortableContextValue>();

/**
 * Props for SortableProvider
 */
export interface SortableProviderProps<T> {
  /** Unique ID for this sortable container */
  id?: string;
  /** Items in the list */
  items: T[];
  /** Function to get unique ID from an item */
  getId?: (item: T) => string;
  /** Called when items are reordered */
  onReorder?: (event: ReorderEvent<T>) => void;
  /** Orientation of the list */
  orientation?: "horizontal" | "vertical";
  /** Children */
  children: JSX.Element;
}

let containerIdCounter = 0;

/**
 * Provider for sortable list functionality.
 * Manages drag state and reordering logic.
 *
 * @example
 * ```tsx
 * <SortableProvider
 *   items={items()}
 *   getId={(item) => item.id}
 *   onReorder={({ items }) => setItems(items)}
 * >
 *   <For each={items()}>
 *     {(item, index) => (
 *       <SortableItem id={item.id} index={index()}>
 *         {item.name}
 *       </SortableItem>
 *     )}
 *   </For>
 * </SortableProvider>
 * ```
 */
export function SortableProvider<T>(
  props: SortableProviderProps<T>,
): JSX.Element {
  const containerId = props.id ?? `sortable-${++containerIdCounter}`;

  const [dragState, setDragStateSignal] = createSignal<SortableDragState>({
    activeId: null,
    activeIndex: null,
    overId: null,
    overIndex: null,
    edge: null,
  });

  const getId = (item: T): string => {
    if (props.getId) {
      return props.getId(item);
    }
    // Try common ID patterns
    const anyItem = item as Record<string, unknown>;
    if (typeof anyItem.id === "string") return anyItem.id;
    if (typeof anyItem.id === "number") return String(anyItem.id);
    throw new Error(
      "SortableProvider: Could not determine item ID. Please provide getId prop.",
    );
  };

  const setDragState = (partial: Partial<SortableDragState>) => {
    setDragStateSignal((prev) => ({ ...prev, ...partial }));
  };

  const contextValue: SortableContextValue<T> = {
    containerId,
    items: () => props.items,
    getId,
    dragState,
    setDragState,
    orientation: () => props.orientation ?? "vertical",
    onReorder: props.onReorder,
  };

  return (
    <SortableContext.Provider value={contextValue as SortableContextValue}>
      {props.children}
    </SortableContext.Provider>
  );
}

/**
 * Hook to access sortable context
 */
export function useSortableContext<T = unknown>(): SortableContextValue<T> {
  const context = useContext(SortableContext);
  if (!context) {
    throw new Error(
      "useSortableContext must be used within a SortableProvider",
    );
  }
  return context as SortableContextValue<T>;
}

/**
 * Utility function to reorder an array
 */
export function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = [...array];
  const [item] = newArray.splice(from, 1);
  newArray.splice(to, 0, item);
  return newArray;
}
