import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import {
  type Accessor,
  createContext,
  createSignal,
  type JSX,
  useContext,
} from "solid-js";
import type { DragData } from "../core/types";

// Re-export the Instruction type for consumers
export type { Instruction as TreeInstruction };

/**
 * Capabilities that define what a tree node can do
 */
export interface TreeNodeCapabilities {
  /** Whether this node can be dragged (default: true) */
  canDrag?: boolean;
  /** Whether this node can accept children - folders=true, documents=false */
  canHaveChildren?: boolean;
  /** Types of nodes this can accept as children (e.g., ['folder', 'document']) */
  acceptsTypes?: string[];
  /** Whether to show the drag handle (default: true) */
  showDragHandle?: boolean;
}

/**
 * Data specific to tree items
 */
export interface TreeItemData extends DragData {
  type: "tree-item";
  /** Parent node ID, or null for root */
  parentId: string | null;
  /** Depth level in the tree */
  level: number;
  /** Whether this node has children */
  hasChildren: boolean;
  /** Whether this node is expanded */
  isExpanded: boolean;
  /** The type of node (e.g., 'folder', 'document') */
  nodeType?: string;
}

/**
 * Event emitted when a tree item is moved
 */
export interface TreeMoveEvent {
  /** ID of the item being moved */
  itemId: string;
  /** Previous parent ID */
  oldParentId: string | null;
  /** New parent ID */
  newParentId: string | null;
  /** Previous index within parent */
  oldIndex: number;
  /** New index within new parent */
  newIndex: number;
  /** The drop instruction that caused this move */
  instruction: Instruction;
}

/**
 * State of tree drag operations
 */
export interface TreeDragState {
  /** ID of the item being dragged */
  activeId: string | null;
  /** Current drop instruction */
  instruction: Instruction | null;
  /** ID of the node being hovered */
  overId: string | null;
  /** Source item's parent ID (stored at drag start) */
  sourceParentId: string | null;
  /** Source item's index (stored at drag start) */
  sourceIndex: number;
  /** Target item's parent ID (updated on hover) */
  targetParentId: string | null;
  /** Target item's index (updated on hover) */
  targetIndex: number;
}

/**
 * Context value for tree DnD
 */
interface TreeDndContextValue {
  /** Current drag state */
  dragState: Accessor<TreeDragState>;
  /** Update drag state */
  setDragState: (state: Partial<TreeDragState>) => void;
  /** Handler for move events */
  onMove?: (event: TreeMoveEvent) => void;
  /** Check if an item can be dropped on a target */
  canDrop?: (
    sourceId: string,
    targetId: string,
    instruction: Instruction,
  ) => boolean;
  /** Indentation width in pixels */
  indentWidth: number;
  /** Whether drag operations are globally disabled */
  disabled: Accessor<boolean>;
}

const TreeDndContext = createContext<TreeDndContextValue>();

/**
 * Props for TreeDndProvider
 */
export interface TreeDndProviderProps {
  /** Called when a tree item is moved */
  onMove?: (event: TreeMoveEvent) => void;
  /** Custom validation for drop operations */
  canDrop?: (
    sourceId: string,
    targetId: string,
    instruction: Instruction,
  ) => boolean;
  /** Width of each indentation level in pixels */
  indentWidth?: number;
  /** Whether drag operations are globally disabled (e.g., during mutation) */
  disabled?: Accessor<boolean>;
  /** Children */
  children: JSX.Element;
}

/**
 * Provider for tree drag and drop functionality.
 * Enables hierarchical reordering and reparenting of nodes.
 *
 * @example
 * ```tsx
 * <TreeDndProvider
 *   onMove={({ itemId, newParentId, newIndex }) => {
 *     moveNode(itemId, newParentId, newIndex);
 *   }}
 *   canDrop={(sourceId, targetId) => {
 *     // Prevent dropping on descendants
 *     return !isDescendant(sourceId, targetId);
 *   }}
 * >
 *   <TreeView nodes={nodes} />
 * </TreeDndProvider>
 * ```
 */
export function TreeDndProvider(props: TreeDndProviderProps): JSX.Element {
  const [dragState, setDragStateSignal] = createSignal<TreeDragState>({
    activeId: null,
    instruction: null,
    overId: null,
    sourceParentId: null,
    sourceIndex: 0,
    targetParentId: null,
    targetIndex: 0,
  });

  const setDragState = (partial: Partial<TreeDragState>) => {
    setDragStateSignal((prev) => ({ ...prev, ...partial }));
  };

  // Default disabled accessor returns false
  const defaultDisabled = () => false;

  const contextValue: TreeDndContextValue = {
    dragState,
    setDragState,
    onMove: props.onMove,
    canDrop: props.canDrop,
    indentWidth: props.indentWidth ?? 24,
    disabled: props.disabled ?? defaultDisabled,
  };

  return (
    <TreeDndContext.Provider value={contextValue}>
      {props.children}
    </TreeDndContext.Provider>
  );
}

/**
 * Hook to access tree DnD context
 */
export function useTreeDndContext(): TreeDndContextValue {
  const context = useContext(TreeDndContext);
  if (!context) {
    throw new Error("useTreeDndContext must be used within a TreeDndProvider");
  }
  return context;
}
