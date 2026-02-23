import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { disableNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview";
import {
  attachInstruction,
  extractInstruction,
  type Instruction,
  type ItemMode,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
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
import { useDndContext } from "../core/context";
import {
  type TreeItemData,
  type TreeNodeCapabilities,
  useTreeDndContext,
} from "./tree-context";

/**
 * State of a tree item
 */
export interface TreeItemState {
  /** Whether this item is being dragged */
  isDragging: boolean;
  /** Whether a dragged item is over this item */
  isOver: boolean;
  /** Current drop instruction for this item */
  instruction: Instruction | null;
  /** Whether to show indicator to the left (sibling before) */
  showIndicatorLeft: boolean;
  /** Whether to show indicator to the right (sibling after) */
  showIndicatorRight: boolean;
  /** Whether to show "make child" indicator */
  showMakeChild: boolean;
  /** Whether the drop is blocked */
  isBlocked: boolean;
}

/**
 * Options for useTreeItem
 */
export interface TreeItemOptions {
  /** Unique ID for this item */
  id: string;
  /** Parent ID, or null for root items */
  parentId: string | null;
  /** Depth level (0 for root) */
  level: number;
  /** Index within parent's children */
  index: number;
  /** Whether this node has children */
  hasChildren?: boolean;
  /** Whether this node is expanded */
  isExpanded?: boolean;
  /** Whether this is the last child in its parent's children */
  isLastChild?: boolean;
  /** Whether dragging is disabled */
  disabled?: Accessor<boolean>;
  /** The type of node (e.g., 'folder', 'document') */
  nodeType?: string;
  /** Capabilities that define what this node can do */
  capabilities?: TreeNodeCapabilities;
  /** Additional custom data to include in the drag data */
  data?: Record<string, unknown>;
}

/**
 * Result from useTreeItem
 */
export interface TreeItemResult {
  /** Reactive state */
  state: Accessor<TreeItemState>;
  /** Ref setter for the tree item element */
  setRef: (el: HTMLElement) => void;
  /** Ref setter for custom drag handle */
  setHandleRef: (el: HTMLElement) => void;
  /** CSS classes for animations */
  treeItemClass: Accessor<string>;
  /** Indentation style */
  indentStyle: Accessor<Record<string, string>>;
}

/**
 * Hook to create a draggable tree item.
 * Supports reordering and reparenting within a tree structure.
 *
 * @example
 * ```tsx
 * const { state, setRef, treeItemClass, indentStyle } = useTreeItem({
 *   id: node.id,
 *   parentId: node.parentId,
 *   level: node.level,
 *   index: node.index,
 *   hasChildren: node.children.length > 0,
 *   isExpanded: isExpanded(),
 * });
 *
 * return (
 *   <div
 *     ref={setRef}
 *     class={treeItemClass()}
 *     style={indentStyle()}
 *   >
 *     {node.name}
 *   </div>
 * );
 * ```
 */
export function useTreeItem(options: TreeItemOptions): TreeItemResult {
  const context = useTreeDndContext();

  // Try to get DndContext for DragOverlay support
  let dndContext: ReturnType<typeof useDndContext> | null = null;
  try {
    dndContext = useDndContext();
  } catch {
    // No DndProvider - that's okay, DragOverlay just won't work
  }

  const [state, setState] = createSignal<TreeItemState>({
    isDragging: false,
    isOver: false,
    instruction: null,
    showIndicatorLeft: false,
    showIndicatorRight: false,
    showMakeChild: false,
    isBlocked: false,
  });

  let elementRef: HTMLElement | null = null;
  let handleRef: HTMLElement | null = null;

  const setRef = (el: HTMLElement) => {
    elementRef = el;
  };

  const setHandleRef = (el: HTMLElement) => {
    handleRef = el;
  };

  const getTreeItemData = (): TreeItemData => ({
    id: options.id,
    type: "tree-item",
    parentId: options.parentId,
    level: options.level,
    hasChildren: options.hasChildren ?? false,
    isExpanded: options.isExpanded ?? false,
    nodeType: options.nodeType,
    ...options.data,
  });

  // Determine the mode for tree-item hitbox
  const getMode = (): ItemMode => {
    if (options.hasChildren && options.isExpanded) {
      return "expanded";
    }
    if (options.isLastChild) {
      return "last-in-group";
    }
    return "standard";
  };

  // Build the list of blocked instruction types based on capabilities
  const getBlockedInstructions = (): Instruction["type"][] => {
    const blocked: Instruction["type"][] = [];
    if (options.capabilities?.canHaveChildren === false) {
      blocked.push("make-child");
    }
    return blocked;
  };

  // Helper to update state based on instruction
  const updateStateFromInstruction = (
    instruction: Instruction | null,
    sourceId: string,
  ) => {
    if (!instruction || sourceId === options.id) {
      setState((s) => ({
        ...s,
        isOver: false,
        instruction: null,
        showIndicatorLeft: false,
        showIndicatorRight: false,
        showMakeChild: false,
        isBlocked: false,
      }));
      return;
    }

    const isBlocked = instruction.type === "instruction-blocked";

    // Map vertical instruction types to horizontal indicators
    // In a horizontal tree layout: reorder-above = left, reorder-below = right
    setState((s) => ({
      ...s,
      isOver: true,
      instruction,
      showIndicatorLeft: instruction.type === "reorder-above",
      showIndicatorRight: instruction.type === "reorder-below",
      showMakeChild: instruction.type === "make-child",
      isBlocked,
    }));

    context.setDragState({
      overId: options.id,
      instruction,
      targetParentId: options.parentId,
      targetIndex: options.index,
    });
  };

  // Set up draggable
  createEffect(() => {
    const el = elementRef;
    if (!el) return;
    // Check both local and context-level disabled
    if (options.disabled?.() || context.disabled()) return;

    const cleanup = draggable({
      element: el,
      dragHandle: handleRef ?? undefined,
      getInitialData: getTreeItemData,
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        // Disable native preview - we'll use DragOverlay instead
        disableNativeDragPreview({ nativeSetDragImage });
      },
      onDragStart: ({ location }) => {
        setState((s) => ({ ...s, isDragging: true }));

        // Update TreeDndProvider state with source info
        context.setDragState({
          activeId: options.id,
          sourceParentId: options.parentId,
          sourceIndex: options.index,
        });

        // Update DndProvider for DragOverlay support
        const itemData = getTreeItemData();
        dndContext?.setActiveItem(itemData);
        dndContext?.setPosition({
          x: location.current.input.clientX,
          y: location.current.input.clientY,
        });
      },
      onDrag: ({ location }) => {
        // Update position for DragOverlay
        dndContext?.setPosition({
          x: location.current.input.clientX,
          y: location.current.input.clientY,
        });
      },
      onDrop: () => {
        const dragState = context.dragState();

        if (dragState.instruction && dragState.activeId) {
          const instruction = dragState.instruction;

          // Skip blocked instructions
          if (instruction.type === "instruction-blocked") {
            setState((s) => ({ ...s, isDragging: false }));
            context.setDragState({
              activeId: null,
              instruction: null,
              overId: null,
              sourceParentId: null,
              sourceIndex: 0,
              targetParentId: null,
              targetIndex: 0,
            });
            dndContext?.setActiveItem(null);
            dndContext?.setOverTarget(null);
            return;
          }

          let newParentId: string | null = null;
          let newIndex = dragState.targetIndex;

          switch (instruction.type) {
            case "reorder-above":
              newParentId = dragState.targetParentId;
              newIndex = dragState.targetIndex;
              break;
            case "reorder-below":
              newParentId = dragState.targetParentId;
              newIndex = dragState.targetIndex + 1;
              break;
            case "make-child":
              // The overId is the target node that will become the parent
              newParentId = dragState.overId;
              newIndex = 0;
              break;
            case "reparent":
              // Reparent uses desiredLevel to determine new parent
              // For now, treat it as moving to the target's parent
              newParentId = dragState.targetParentId;
              newIndex = dragState.targetIndex + 1;
              break;
          }

          // Adjust index if moving within same parent and from lower to higher position
          if (
            dragState.sourceParentId === newParentId &&
            dragState.sourceIndex < newIndex
          ) {
            newIndex = Math.max(0, newIndex - 1);
          }

          context.onMove?.({
            itemId: dragState.activeId,
            oldParentId: dragState.sourceParentId,
            newParentId,
            oldIndex: dragState.sourceIndex,
            newIndex,
            instruction,
          });
        }

        setState((s) => ({ ...s, isDragging: false }));
        context.setDragState({
          activeId: null,
          instruction: null,
          overId: null,
          sourceParentId: null,
          sourceIndex: 0,
          targetParentId: null,
          targetIndex: 0,
        });

        // Clear DndProvider state
        dndContext?.setActiveItem(null);
        dndContext?.setOverTarget(null);
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
        const data = getTreeItemData();
        return attachInstruction(data, {
          input,
          element,
          currentLevel: options.level,
          indentPerLevel: context.indentWidth,
          mode: getMode(),
          block: getBlockedInstructions(),
        });
      },
      canDrop: ({ source }) => {
        const sourceData = source.data as TreeItemData;

        // Only accept tree items - reject sortable items, kanban items, etc.
        if (sourceData.type !== "tree-item") return false;

        // Can't drop on self
        if (sourceData.id === options.id) return false;

        // Check if target accepts this node type
        const caps = options.capabilities;
        if (
          caps?.acceptsTypes &&
          sourceData.nodeType &&
          !caps.acceptsTypes.includes(sourceData.nodeType)
        ) {
          return false;
        }

        // Custom validation from context
        if (context.canDrop) {
          // Create a default instruction for validation
          const defaultInstruction: Instruction = {
            type: "reorder-below",
            currentLevel: options.level,
            indentPerLevel: context.indentWidth,
          };
          return context.canDrop(sourceData.id, options.id, defaultInstruction);
        }

        return true;
      },
      onDragEnter: ({ self, source }) => {
        const instruction = extractInstruction(self.data);
        const sourceData = source.data as TreeItemData;
        updateStateFromInstruction(instruction, sourceData.id);
      },
      onDrag: ({ self, source }) => {
        const instruction = extractInstruction(self.data);
        const sourceData = source.data as TreeItemData;

        // Only update if instruction changed
        const currentInstruction = state().instruction;
        if (instruction?.type !== currentInstruction?.type) {
          updateStateFromInstruction(instruction, sourceData.id);
        }
      },
      onDragLeave: () => {
        setState((s) => ({
          ...s,
          isOver: false,
          instruction: null,
          showIndicatorLeft: false,
          showIndicatorRight: false,
          showMakeChild: false,
          isBlocked: false,
        }));
      },
      onDrop: () => {
        setState((s) => ({
          ...s,
          isOver: false,
          instruction: null,
          showIndicatorLeft: false,
          showIndicatorRight: false,
          showMakeChild: false,
          isBlocked: false,
        }));
      },
    });

    onCleanup(cleanup);
  });

  const treeItemClass = createMemo(() => {
    const classes: string[] = [reorderTransitionClasses];
    if (state().isDragging) {
      classes.push(draggingSourceClasses);
    }
    return classes.join(" ");
  });

  const indentStyle = createMemo(() => ({
    "padding-left": `${options.level * context.indentWidth}px`,
  }));

  return {
    state,
    setRef,
    setHandleRef,
    treeItemClass,
    indentStyle,
  };
}
