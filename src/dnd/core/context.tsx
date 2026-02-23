import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  type Component,
  createContext,
  createEffect,
  createSignal,
  type JSX,
  onCleanup,
  useContext,
} from "solid-js";
import type { DndConfig, DragData, Position } from "./types";

/**
 * Internal state for the DnD system
 */
interface DndInternalState {
  activeItem: DragData | null;
  position: Position;
  overTarget: DragData | null;
}

/**
 * Context value provided by DndProvider
 */
interface DndContextValue {
  config: DndConfig;
  state: () => DndInternalState;
  setActiveItem: (item: DragData | null) => void;
  setPosition: (position: Position) => void;
  setOverTarget: (target: DragData | null) => void;
}

const DndContext = createContext<DndContextValue>();

/**
 * Props for the DndProvider component
 */
export interface DndProviderProps extends DndConfig {
  children: JSX.Element;
}

/**
 * Provider component that enables drag and drop functionality.
 * Wrap your application or a section of it with this provider.
 *
 * @example
 * ```tsx
 * <DndProvider animationDuration={200}>
 *   <MyDraggableContent />
 * </DndProvider>
 * ```
 */
export const DndProvider: Component<DndProviderProps> = (props) => {
  const [state, setState] = createSignal<DndInternalState>({
    activeItem: null,
    position: { x: 0, y: 0 },
    overTarget: null,
  });

  const config: DndConfig = {
    preview: props.preview,
    dropIndicator: props.dropIndicator,
    animationDuration: props.animationDuration ?? 200,
    dropIndicatorClass: props.dropIndicatorClass,
    draggingClass: props.draggingClass,
    dropTargetClass: props.dropTargetClass,
  };

  // Set up global monitor to track all drag operations
  createEffect(() => {
    const cleanup = monitorForElements({
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
      onDrop: () => {
        setState({
          activeItem: null,
          position: { x: 0, y: 0 },
          overTarget: null,
        });
      },
    });

    onCleanup(cleanup);
  });

  const contextValue: DndContextValue = {
    config,
    state,
    setActiveItem: (item) => setState((s) => ({ ...s, activeItem: item })),
    setPosition: (position) => setState((s) => ({ ...s, position })),
    setOverTarget: (target) => setState((s) => ({ ...s, overTarget: target })),
  };

  return (
    <DndContext.Provider value={contextValue}>
      {props.children}
    </DndContext.Provider>
  );
};

/**
 * Hook to access the DnD context
 * @throws Error if used outside of a DndProvider
 */
export function useDndContext(): DndContextValue {
  const context = useContext(DndContext);
  if (!context) {
    throw new Error("useDndContext must be used within a DndProvider");
  }
  return context;
}

/**
 * Hook to access just the DnD configuration
 */
export function useDndConfig(): DndConfig {
  return useDndContext().config;
}

/**
 * Hook to access the current drag monitor state
 */
export function useDndMonitor(): {
  activeItem: () => DragData | null;
  position: () => Position;
  overTarget: () => DragData | null;
  isDragging: () => boolean;
} {
  const { state } = useDndContext();

  return {
    activeItem: () => state().activeItem,
    position: () => state().position,
    overTarget: () => state().overTarget,
    isDragging: () => state().activeItem !== null,
  };
}
