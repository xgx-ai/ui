import type { Component, ComponentProps } from "solid-js";
import {
  createContext,
  createSignal,
  onCleanup,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { cn } from "../cn";

type Orientation = "horizontal" | "vertical";

type ResizableContextValue = {
  orientation: () => Orientation;
  registerPanel: (id: string, options: PanelOptions) => void;
  unregisterPanel: (id: string) => void;
  getPanelSize: (id: string) => number;
  resizePanel: (id: string, delta: number) => void;
  startResize: (handleId: string) => void;
  endResize: () => void;
  isResizing: () => boolean;
};

type PanelOptions = {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  collapsible?: boolean;
};

const ResizableContext = createContext<ResizableContextValue>();

function useResizableContext() {
  const context = useContext(ResizableContext);
  if (!context) {
    throw new Error("Resizable components must be used within Resizable");
  }
  return context;
}

type ResizableProps = ComponentProps<"div"> & {
  orientation?: Orientation;
  onResize?: (sizes: number[]) => void;
};

const Resizable: Component<ResizableProps> = (props) => {
  const [local, others] = splitProps(props, [
    "class",
    "orientation",
    "onResize",
    "children",
  ]);

  const orientation = () => local.orientation || "horizontal";
  const [panels, setPanels] = createSignal<
    Map<string, { options: PanelOptions; size: number }>
  >(new Map());
  const [isResizing, setIsResizing] = createSignal(false);
  const [_activeHandle, setActiveHandle] = createSignal<string | null>(null);

  const registerPanel = (id: string, options: PanelOptions) => {
    setPanels((prev) => {
      const newMap = new Map(prev);
      const defaultSize = options.defaultSize ?? 100 / (prev.size + 1);
      newMap.set(id, { options, size: defaultSize });
      // Rebalance sizes
      const totalPanels = newMap.size;
      if (options.defaultSize === undefined) {
        newMap.forEach((panel, _key) => {
          if (panel.options.defaultSize === undefined) {
            panel.size = 100 / totalPanels;
          }
        });
      }
      return newMap;
    });
  };

  const unregisterPanel = (id: string) => {
    setPanels((prev) => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const getPanelSize = (id: string) => {
    return panels().get(id)?.size ?? 50;
  };

  const resizePanel = (id: string, delta: number) => {
    setPanels((prev) => {
      const newMap = new Map(prev);
      const panelIds = Array.from(newMap.keys());
      const panelIndex = panelIds.indexOf(id);

      if (panelIndex === -1 || panelIndex >= panelIds.length - 1) return prev;

      const currentPanel = newMap.get(id);
      const nextPanelId = panelIds[panelIndex + 1];
      const nextPanel = newMap.get(nextPanelId);

      if (!currentPanel || !nextPanel) return prev;

      const newCurrentSize = Math.max(
        currentPanel.options.minSize ?? 0,
        Math.min(
          currentPanel.options.maxSize ?? 100,
          currentPanel.size + delta,
        ),
      );
      const actualDelta = newCurrentSize - currentPanel.size;

      const newNextSize = Math.max(
        nextPanel.options.minSize ?? 0,
        Math.min(
          nextPanel.options.maxSize ?? 100,
          nextPanel.size - actualDelta,
        ),
      );
      const actualNextDelta = nextPanel.size - newNextSize;

      if (Math.abs(actualDelta) !== Math.abs(actualNextDelta)) {
        // Can't resize due to constraints
        return prev;
      }

      currentPanel.size = newCurrentSize;
      nextPanel.size = newNextSize;

      return newMap;
    });

    local.onResize?.(Array.from(panels().values()).map((p) => p.size));
  };

  const startResize = (handleId: string) => {
    setIsResizing(true);
    setActiveHandle(handleId);
  };

  const endResize = () => {
    setIsResizing(false);
    setActiveHandle(null);
  };

  const contextValue: ResizableContextValue = {
    orientation,
    registerPanel,
    unregisterPanel,
    getPanelSize,
    resizePanel,
    startResize,
    endResize,
    isResizing,
  };

  return (
    <ResizableContext.Provider value={contextValue}>
      <div
        class={cn(
          "flex size-full",
          orientation() === "vertical" && "flex-col",
          local.class,
        )}
        data-orientation={orientation()}
        {...others}
      >
        {local.children}
      </div>
    </ResizableContext.Provider>
  );
};

type ResizablePanelProps = ComponentProps<"div"> & {
  id?: string;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  collapsible?: boolean;
};

let panelIdCounter = 0;

const ResizablePanel: Component<ResizablePanelProps> = (props) => {
  const [local, others] = splitProps(props, [
    "class",
    "id",
    "defaultSize",
    "minSize",
    "maxSize",
    "collapsible",
    "children",
    "style",
  ]);

  const ctx = useResizableContext();
  const panelId = local.id || `panel-${++panelIdCounter}`;

  ctx.registerPanel(panelId, {
    defaultSize: local.defaultSize,
    minSize: local.minSize,
    maxSize: local.maxSize,
    collapsible: local.collapsible,
  });

  onCleanup(() => {
    ctx.unregisterPanel(panelId);
  });

  const sizeStyle = () => {
    const size = ctx.getPanelSize(panelId);
    return ctx.orientation() === "horizontal"
      ? { width: `${size}%` }
      : { height: `${size}%` };
  };

  return (
    <div
      class={cn("overflow-hidden", local.class)}
      style={{
        ...sizeStyle(),
        ...(typeof local.style === "object" ? local.style : {}),
      }}
      data-panel-id={panelId}
      {...others}
    >
      {local.children}
    </div>
  );
};

type ResizableHandleProps = ComponentProps<"div"> & {
  withHandle?: boolean;
  id?: string;
};

let handleIdCounter = 0;

const ResizableHandle: Component<ResizableHandleProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "withHandle", "id"]);

  const ctx = useResizableContext();
  const handleId = local.id || `handle-${++handleIdCounter}`;

  let startPos = 0;
  let containerSize = 0;
  let handleRef: HTMLDivElement | undefined;

  const handlePointerDown = (e: PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    ctx.startResize(handleId);

    const container = handleRef?.parentElement;
    if (!container) return;

    containerSize =
      ctx.orientation() === "horizontal"
        ? container.offsetWidth
        : container.offsetHeight;
    startPos = ctx.orientation() === "horizontal" ? e.clientX : e.clientY;
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!ctx.isResizing()) return;

    const currentPos =
      ctx.orientation() === "horizontal" ? e.clientX : e.clientY;
    const delta = currentPos - startPos;
    const deltaPercent = (delta / containerSize) * 100;

    // Find the panel before this handle
    const handle = handleRef;
    if (!handle) return;

    const prevPanel = handle.previousElementSibling as HTMLElement;
    if (!prevPanel) return;

    const panelId = prevPanel.getAttribute("data-panel-id");
    if (panelId) {
      ctx.resizePanel(panelId, deltaPercent);
      startPos = currentPos;
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    ctx.endResize();
  };

  return (
    <div
      ref={handleRef}
      class={cn(
        "relative flex shrink-0 items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
        ctx.orientation() === "horizontal"
          ? "w-px cursor-col-resize"
          : "h-px w-full cursor-row-resize after:left-0 after:h-1 after:w-full after:-translate-y-1/2 after:translate-x-0",
        local.class,
      )}
      data-orientation={ctx.orientation()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      {...others}
    >
      <Show when={local.withHandle}>
        <div
          class={cn(
            "z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border",
            ctx.orientation() === "vertical" && "rotate-90",
          )}
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-2.5"
          >
            <path d="M9 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
            <path d="M9 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
            <path d="M9 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
            <path d="M15 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
            <path d="M15 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
            <path d="M15 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
          </svg>
        </div>
      </Show>
    </div>
  );
};

/**
 * # Resizable
 *
 * Resizable panel layout with drag handles.
 *
 * @example
 * ```
 * <Resizable orientation="horizontal" class="min-h-[200px] max-w-md rounded-lg border">
 *   <ResizablePanel defaultSize={50} minSize={20}>
 *     <div class="flex h-full items-center justify-center p-4">
 *       <span class="text-sm font-semibold">Panel 1</span>
 *     </div>
 *   </ResizablePanel>
 *   <ResizableHandle withHandle />
 *   <ResizablePanel defaultSize={50} minSize={20}>
 *     <div class="flex h-full items-center justify-center p-4">
 *       <span class="text-sm font-semibold">Panel 2</span>
 *     </div>
 *   </ResizablePanel>
 * </Resizable>
 * ```
 */
export { Resizable, ResizableHandle, ResizablePanel };
