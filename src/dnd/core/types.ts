import type { Accessor, Component, JSX } from "solid-js";

/**
 * Position coordinates for drag operations
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Data attached to a draggable element
 */
export interface DragData {
  id: string;
  type: string;
  [key: string | symbol]: unknown;
}

/**
 * State of a draggable element
 */
export interface DragState {
  /** Whether the element is currently being dragged */
  isDragging: boolean;
  /** Whether a dragged element is over this element */
  isOver: boolean;
}

/**
 * State of the global drag operation
 */
export interface DragMonitorState {
  /** The currently dragged item data, or null if nothing is being dragged */
  activeItem: DragData | null;
  /** Current position of the drag cursor */
  position: Position;
  /** The drop target currently being hovered over */
  overTarget: DragData | null;
}

/**
 * Options for creating a draggable element
 */
export interface DraggableOptions<T extends DragData = DragData> {
  /** Function that returns the data to attach to this draggable */
  data: Accessor<T>;
  /** Called when drag starts */
  onDragStart?: () => void;
  /** Called when drag ends (regardless of drop) */
  onDragEnd?: () => void;
  /** Called when dropped on a valid target */
  onDrop?: (target: DragData | null) => void;
  /** Whether dragging is disabled */
  disabled?: Accessor<boolean>;
  /** Custom drag handle selector (if not the entire element) */
  dragHandle?: string;
}

/**
 * Options for creating a droppable element
 */
export interface DroppableOptions<T extends DragData = DragData> {
  /** Function that returns the data for this drop target */
  data: Accessor<T>;
  /** Called when a draggable enters this drop target */
  onDragEnter?: (item: DragData) => void;
  /** Called when a draggable leaves this drop target */
  onDragLeave?: (item: DragData) => void;
  /** Called when an item is dropped on this target */
  onDrop?: (item: DragData) => void;
  /** Whether this drop target accepts the dragged item */
  accepts?: (item: DragData) => boolean;
  /** Whether dropping is disabled */
  disabled?: Accessor<boolean>;
}

/**
 * State returned by droppable primitive
 */
export interface DroppableState {
  /** Whether a dragged item is currently over this target */
  isOver: boolean;
  /** Whether a dragged item can be dropped here */
  canDrop: boolean;
  /** The item currently being dragged over this target */
  draggingItem: DragData | null;
}

/**
 * Props for custom drag preview components
 */
export interface DragPreviewProps<T extends DragData = DragData> {
  /** The data of the item being dragged */
  item: T;
  /** Optional custom content to render */
  children?: JSX.Element;
}

/**
 * Props for drop indicator components
 */
export interface DropIndicatorProps {
  /** Position of the indicator (before or after the target) */
  position: "before" | "after";
  /** Orientation of the list */
  orientation: "horizontal" | "vertical";
}

/**
 * Configuration for the DnD provider
 */
export interface DndConfig {
  /** Custom preview component to use during drag */
  preview?: Component<DragPreviewProps>;
  /** Custom drop indicator component */
  dropIndicator?: Component<DropIndicatorProps>;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** CSS class for the drop indicator */
  dropIndicatorClass?: string;
  /** CSS class applied to the source element while dragging */
  draggingClass?: string;
  /** CSS class applied to valid drop targets */
  dropTargetClass?: string;
}

/**
 * Edge detection for drop positioning
 */
export type Edge = "top" | "bottom" | "left" | "right";

/**
 * Instruction for where to drop relative to a target
 */
export interface DropInstruction {
  type: "reorder" | "make-child" | "reparent";
  edge: Edge;
  targetId: string;
}
