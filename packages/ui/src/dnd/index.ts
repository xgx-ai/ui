/**
 * Drag and Drop - SolidJS primitives for Pragmatic Drag and Drop
 *
 * Provides idiomatic SolidJS primitives and components for building
 * drag and drop interfaces using Pragmatic Drag and Drop.
 *
 * Features:
 * - Core primitives: createDraggable, createDroppable, createMonitor
 * - Sortable lists: SortableProvider, SortableItem with reorder animations
 * - Tree structures: TreeDndProvider, useTreeItem for hierarchical DnD
 * - Kanban boards: KanbanProvider, KanbanColumn, KanbanItem
 * - File dropzones: FileDropzone for external file drops
 * - Custom previews: DragOverlay, DefaultPreview with Tailwind animations
 */

// ============================================================================
// Core
// ============================================================================

export {
  // Primitives
  createDraggable,
  createDroppable,
  createMonitor,
  type DndConfig,
  // Provider
  DndProvider,
  type DndProviderProps,
  type DragData,
  type DraggableOptions,
  type DraggableResult,
  type DragMonitorState,
  type DragPreviewProps,
  type DragState,
  type DropIndicatorProps,
  type DropInstruction,
  type DroppableOptions,
  type DroppableResult,
  type DroppableState,
  type Edge,
  type MonitorOptions,
  type MonitorResult,
  // Types
  type Position,
  useDndConfig,
  useDndContext,
  useDndMonitor,
} from "./core";

// ============================================================================
// Preview
// ============================================================================

export {
  DefaultPreview,
  type DefaultPreviewProps,
  DragOverlay,
  type DragOverlayProps,
  DropIndicatorLine,
  type DropIndicatorLineProps,
} from "./preview";

// ============================================================================
// Sortable
// ============================================================================

export {
  arrayMove,
  createSortable,
  type ReorderEvent,
  type SortableData,
  type SortableDragState,
  SortableItem,
  type SortableItemProps,
  type SortableItemRenderProps,
  type SortableOptions,
  SortableProvider,
  type SortableProviderProps,
  type SortableResult,
  type SortableState,
  useSortableContext,
} from "./sortable";

// ============================================================================
// Tree
// ============================================================================

export {
  TreeDndProvider,
  type TreeDndProviderProps,
  type TreeDragState,
  type TreeInstruction,
  type TreeItemData,
  type TreeItemOptions,
  type TreeItemResult,
  type TreeItemState,
  type TreeMoveEvent,
  useTreeDndContext,
  useTreeItem,
} from "./tree";

// ============================================================================
// Kanban
// ============================================================================

export {
  KanbanColumn,
  type KanbanColumnData,
  type KanbanColumnProps,
  type KanbanColumnRenderProps,
  type KanbanColumnReorderEvent,
  type KanbanColumnState,
  type KanbanDragState,
  KanbanItem,
  type KanbanItemData,
  type KanbanItemProps,
  type KanbanItemRenderProps,
  type KanbanItemState,
  type KanbanMoveEvent,
  KanbanProvider,
  type KanbanProviderProps,
  useKanbanContext,
} from "./kanban";

// ============================================================================
// Dropzone
// ============================================================================

export {
  DropTargetIndicator,
  type DropTargetIndicatorProps,
  FileDropzone,
  type FileDropzoneProps,
  type FileDropzoneRenderProps,
  type FileDropzoneState,
} from "./dropzone";

// ============================================================================
// Animations
// ============================================================================

export {
  animationDurations,
  disabledClasses,
  draggingClasses,
  draggingSourceClasses,
  dragPreviewClasses,
  dropIndicatorClasses,
  dropIndicatorHorizontalClasses,
  dropIndicatorVerticalClasses,
  dropTargetClasses,
  dropzoneActiveClasses,
  dropzoneClasses,
  easings,
  reorderTransitionClasses,
} from "./animations";
