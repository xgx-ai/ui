import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";
import type { DragData, DragMonitorState, Position } from "./types";

/**
 * Options for the drag monitor
 */
export interface MonitorOptions {
  /** Called when any drag operation starts */
  onDragStart?: (item: DragData) => void;
  /** Called when any drag operation ends */
  onDragEnd?: (item: DragData) => void;
  /** Called when a drop occurs anywhere */
  onDrop?: (item: DragData, target: DragData | null) => void;
  /** Filter which drag operations to monitor */
  canMonitor?: (item: DragData) => boolean;
}

/**
 * Return type for createMonitor primitive
 */
export interface MonitorResult {
  /** Reactive state of the current drag operation */
  state: Accessor<DragMonitorState>;
  /** Whether a drag is currently in progress */
  isDragging: Accessor<boolean>;
  /** The currently dragged item, or null */
  activeItem: Accessor<DragData | null>;
  /** Current cursor position */
  position: Accessor<Position>;
}

/**
 * Creates a drag monitor that observes all drag operations.
 * Useful for creating custom overlays, indicators, or tracking drag state.
 *
 * @example
 * ```tsx
 * const { isDragging, activeItem, position } = createMonitor({
 *   onDragStart: (item) => console.log("Started:", item),
 *   onDrop: (item, target) => console.log("Dropped:", item, "on:", target),
 * });
 *
 * return (
 *   <Show when={isDragging()}>
 *     <div style={{ left: position().x, top: position().y }}>
 *       Dragging: {activeItem()?.id}
 *     </div>
 *   </Show>
 * );
 * ```
 */
export function createMonitor(options: MonitorOptions = {}): MonitorResult {
  const [state, setState] = createSignal<DragMonitorState>({
    activeItem: null,
    position: { x: 0, y: 0 },
    overTarget: null,
  });

  createEffect(() => {
    const cleanup = monitorForElements({
      canMonitor: ({ source }) => {
        if (options.canMonitor) {
          return options.canMonitor(source.data as DragData);
        }
        return true;
      },
      onDragStart: ({ source, location }) => {
        const item = source.data as DragData;
        setState({
          activeItem: item,
          position: {
            x: location.current.input.clientX,
            y: location.current.input.clientY,
          },
          overTarget: null,
        });
        options.onDragStart?.(item);
      },
      onDrag: ({ location }) => {
        setState((s) => ({
          ...s,
          position: {
            x: location.current.input.clientX,
            y: location.current.input.clientY,
          },
        }));
      },
      onDropTargetChange: ({ location }) => {
        const dropTargets = location.current.dropTargets;
        const target = dropTargets[0]?.data as unknown as DragData | undefined;
        setState((s) => ({
          ...s,
          overTarget: target ?? null,
        }));
      },
      onDrop: ({ source, location }) => {
        const item = source.data as DragData;
        const dropTargets = location.current.dropTargets;
        const target = dropTargets[0]?.data as unknown as DragData | undefined;

        options.onDrop?.(item, target ?? null);
        options.onDragEnd?.(item);

        setState({
          activeItem: null,
          position: { x: 0, y: 0 },
          overTarget: null,
        });
      },
    });

    onCleanup(cleanup);
  });

  return {
    state,
    isDragging: () => state().activeItem !== null,
    activeItem: () => state().activeItem,
    position: () => state().position,
  };
}
