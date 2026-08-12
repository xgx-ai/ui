import type { JSX } from "@solidjs/web";
import { onCleanup, untrack } from "solid-js";
import { cn } from "../cn.ts";
import {
  getGridCanvasPhase,
  getGridCanvasPixelRatio,
  interpolateWorkspaceCamera,
  screenToWorldPoint,
  worldToScreenPoint,
  zoomCameraAtPoint,
} from "./workspace-canvas.ts";

/**
 * A pan/zoom surface: a dot grid painted to a canvas, and a world layer whose children
 * are ordinary DOM positioned in world coordinates.
 *
 * The camera is a plain `let`, not a signal, and is applied imperatively inside a
 * requestAnimationFrame. That is deliberate — a pan produces a pointer event per frame,
 * and routing those through the reactive graph would re-run every consumer on every
 * frame. Anything that needs the camera reactively should take it from
 * `onViewportChange`, which fires once per applied frame.
 */

export type WorkspacePoint = {
  x: number;
  y: number;
};

export type WorkspaceCamera = WorkspacePoint & {
  zoom: number;
};

export type WorkspaceViewport = {
  camera: WorkspaceCamera;
  height: number;
  width: number;
};

export type WorkspaceBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export type WorkspaceInitialCamera = (size: { height: number; width: number }) => WorkspaceCamera;

export type WorkspaceCameraTransition = {
  durationMs: number;
  easing: (progress: number) => number;
};

export interface WorkspaceApi {
  fitBounds: (
    bounds: WorkspaceBounds,
    padding?: number,
    transition?: WorkspaceCameraTransition,
  ) => boolean;
  getCamera: () => WorkspaceCamera;
  getSurfaceElement: () => HTMLDivElement | undefined;
  /** Screen point relative to the surface → world point. */
  screenToWorld: (point: WorkspacePoint) => WorkspacePoint;
  screenDeltaToWorld: (delta: WorkspacePoint) => WorkspacePoint;
  setCamera: (camera: WorkspaceCamera) => void;
  /** World point → screen point relative to the surface. */
  worldToScreen: (point: WorkspacePoint) => WorkspacePoint;
  zoomIn: () => boolean;
  zoomOut: () => boolean;
}

type DragState = {
  hasMoved: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  cameraX: number;
  cameraY: number;
};

type GridRenderState = {
  cssHeight: number;
  cssWidth: number;
  gridColor: string;
  gridScreenSize: number;
  padding: number;
  pixelRatio: number;
};

export interface WorkspaceProps {
  apiRef?: (api: WorkspaceApi) => void;
  background?: JSX.Element;
  children: JSX.Element;
  class?: string;
  /**
   * Colour of the grid dots. Any CSS colour; pass a resolved token value so the grid
   * matches the host's theme.
   */
  gridColor?: string;
  gridSize?: number;
  gridStepFactor?: number;
  initialCamera?: WorkspaceInitialCamera;
  initialZoom?: number;
  maxGridSpacing?: number;
  maxZoom?: number;
  minGridSpacing?: number;
  minZoom?: number;
  /** Fires on a press-and-release on the background that did not become a pan. */
  onBackgroundClick?: () => void;
  onViewportChange?: (viewport: WorkspaceViewport) => void;
  showGrid?: boolean;
  /** Rendered above the grid but below the world, in screen coordinates. */
  viewportLayer?: JSX.Element;
}

const DEFAULT_INITIAL_ZOOM = 1;
const DEFAULT_MIN_ZOOM = 0.2;
const DEFAULT_MAX_ZOOM = 3;
const DEFAULT_GRID_SIZE = 24;
const DEFAULT_GRID_STEP_FACTOR = 2;
const DEFAULT_MIN_GRID_SPACING = 14;
const DEFAULT_MAX_GRID_SPACING = 34;
const DEFAULT_GRID_COLOR = "rgba(148, 163, 184, 0.42)";
const CLICK_MOVE_THRESHOLD = 4;
const ZOOM_STEP_FACTOR = 1.2;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Grid spacing in screen pixels, stepped by powers of `gridStepFactor` so the dots stay
 * within a readable band at any zoom rather than collapsing or spreading out.
 */
function getGridScreenSize(params: {
  gridSize: number;
  gridStepFactor: number;
  maxGridSpacing: number;
  minGridSpacing: number;
  zoom: number;
}) {
  let gridSize = params.gridSize * params.zoom;

  while (gridSize < params.minGridSpacing) {
    gridSize *= params.gridStepFactor;
  }

  while (gridSize > params.maxGridSpacing) {
    gridSize /= params.gridStepFactor;
  }

  return gridSize;
}

export function Workspace(props: WorkspaceProps) {
  let surfaceRef: HTMLDivElement | undefined;
  let worldRef: HTMLDivElement | undefined;
  let gridCanvasRef: HTMLCanvasElement | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let frame: number | undefined;
  let cameraTransitionFrame: number | undefined;
  let setupFrame: number | undefined;
  let gridRenderState: GridRenderState | undefined;
  let ready = false;
  let surfaceReady = false;
  let worldReady = false;
  let camera: WorkspaceCamera = { x: 0, y: 0, zoom: DEFAULT_INITIAL_ZOOM };
  let drag: DragState | undefined;

  const minZoom = () => props.minZoom ?? DEFAULT_MIN_ZOOM;
  const maxZoom = () => props.maxZoom ?? DEFAULT_MAX_ZOOM;
  const initialZoom = () => clamp(props.initialZoom ?? DEFAULT_INITIAL_ZOOM, minZoom(), maxZoom());
  const gridSize = () => props.gridSize ?? DEFAULT_GRID_SIZE;
  const gridStepFactor = () => props.gridStepFactor ?? DEFAULT_GRID_STEP_FACTOR;
  const minGridSpacing = () => props.minGridSpacing ?? DEFAULT_MIN_GRID_SPACING;
  const maxGridSpacing = () => props.maxGridSpacing ?? DEFAULT_MAX_GRID_SPACING;
  const gridColor = () => props.gridColor ?? DEFAULT_GRID_COLOR;
  const showGrid = () => props.showGrid ?? true;

  const updateGridOffset = (gridScreenSize: number) => {
    if (!gridCanvasRef) return;
    const phaseX = getGridCanvasPhase(camera.x, gridScreenSize);
    const phaseY = getGridCanvasPhase(camera.y, gridScreenSize);
    gridCanvasRef.style.transform = `translate(${phaseX}px, ${phaseY}px)`;
  };

  const updateGrid = (gridScreenSize: number, rect: DOMRect) => {
    if (!gridCanvasRef) return;

    const padding = maxGridSpacing();
    const cssWidth = rect.width + padding * 2;
    const cssHeight = rect.height + padding * 2;
    const pixelRatio = getGridCanvasPixelRatio(cssWidth, cssHeight, window.devicePixelRatio);
    const pixelWidth = Math.max(1, Math.round(cssWidth * pixelRatio));
    const pixelHeight = Math.max(1, Math.round(cssHeight * pixelRatio));
    const needsRedraw =
      !gridRenderState ||
      gridRenderState.cssHeight !== cssHeight ||
      gridRenderState.cssWidth !== cssWidth ||
      gridRenderState.gridColor !== gridColor() ||
      gridRenderState.gridScreenSize !== gridScreenSize ||
      gridRenderState.padding !== padding ||
      gridRenderState.pixelRatio !== pixelRatio;

    if (needsRedraw) {
      const geometryChanged =
        !gridRenderState ||
        gridRenderState.cssHeight !== cssHeight ||
        gridRenderState.cssWidth !== cssWidth ||
        gridRenderState.padding !== padding;
      if (geometryChanged) {
        gridCanvasRef.style.left = `${-padding}px`;
        gridCanvasRef.style.top = `${-padding}px`;
        gridCanvasRef.style.width = `${cssWidth}px`;
        gridCanvasRef.style.height = `${cssHeight}px`;
      }
      if (gridCanvasRef.width !== pixelWidth || gridCanvasRef.height !== pixelHeight) {
        gridCanvasRef.width = pixelWidth;
        gridCanvasRef.height = pixelHeight;
      }

      const context = gridCanvasRef.getContext("2d");
      if (!context) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, cssWidth, cssHeight);
      context.fillStyle = gridColor();
      context.beginPath();
      for (let x = padding - gridScreenSize; x <= cssWidth; x += gridScreenSize) {
        for (let y = padding - gridScreenSize; y <= cssHeight; y += gridScreenSize) {
          context.moveTo(x + 1, y);
          context.arc(x, y, 1, 0, Math.PI * 2);
        }
      }
      context.fill();
      gridRenderState = {
        cssHeight,
        cssWidth,
        gridColor: gridColor(),
        gridScreenSize,
        padding,
        pixelRatio,
      };
    }

    updateGridOffset(gridScreenSize);
  };

  const updateWorldTransform = () => {
    if (!worldRef) return;
    worldRef.style.translate = `${camera.x}px ${camera.y}px 0`;
    worldRef.style.scale = `${camera.zoom}`;
  };

  const applyCamera = () => {
    frame = undefined;
    if (!surfaceRef || !worldRef) return;
    const surfaceRect = surfaceRef.getBoundingClientRect();

    updateWorldTransform();
    props.onViewportChange?.({
      camera: { ...camera },
      height: surfaceRect.height,
      width: surfaceRect.width,
    });

    if (!showGrid()) {
      if (gridCanvasRef) gridCanvasRef.hidden = true;
      return;
    }
    if (gridCanvasRef) gridCanvasRef.hidden = false;

    const gridScreenSize = getGridScreenSize({
      gridSize: gridSize(),
      gridStepFactor: gridStepFactor(),
      maxGridSpacing: maxGridSpacing(),
      minGridSpacing: minGridSpacing(),
      zoom: camera.zoom,
    });
    updateGrid(gridScreenSize, surfaceRect);
  };

  const scheduleCameraApply = () => {
    if (frame !== undefined) return;
    frame = requestAnimationFrame(applyCamera);
  };

  const cancelCameraTransition = () => {
    if (cameraTransitionFrame !== undefined) {
      cancelAnimationFrame(cameraTransitionFrame);
      cameraTransitionFrame = undefined;
    }
  };

  const updateCamera = (nextCamera: WorkspaceCamera) => {
    const previousZoom = camera.zoom;
    camera = {
      x: nextCamera.x,
      y: nextCamera.y,
      zoom: clamp(nextCamera.zoom, minZoom(), maxZoom()),
    };
    // A pure pan needs no redraw: move the world and shift the grid's phase, both of
    // which are single style writes, and let the scheduled frame do the rest.
    if (camera.zoom === previousZoom) {
      updateWorldTransform();
      if (showGrid() && gridRenderState) {
        updateGridOffset(gridRenderState.gridScreenSize);
      }
    }
    scheduleCameraApply();
  };

  const setCamera = (nextCamera: WorkspaceCamera) => {
    cancelCameraTransition();
    updateCamera(nextCamera);
  };

  const transitionCamera = (nextCamera: WorkspaceCamera, transition: WorkspaceCameraTransition) => {
    cancelCameraTransition();
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
    const from = { ...camera };
    const to = {
      ...nextCamera,
      zoom: clamp(nextCamera.zoom, minZoom(), maxZoom()),
    };
    if (
      transition.durationMs <= 0 ||
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      camera = to;
      applyCamera();
      return;
    }

    const startedAt = performance.now();
    const drawCameraFrame = (frameTime: number) => {
      const progress = Math.min(1, (frameTime - startedAt) / transition.durationMs);
      camera = interpolateWorkspaceCamera(from, to, transition.easing(progress));
      applyCamera();
      if (progress < 1) {
        cameraTransitionFrame = requestAnimationFrame(drawCameraFrame);
        return;
      }
      cameraTransitionFrame = undefined;
    };
    cameraTransitionFrame = requestAnimationFrame(drawCameraFrame);
  };

  const fitBounds = (
    bounds: WorkspaceBounds,
    padding = 64,
    transition?: WorkspaceCameraTransition,
  ) => {
    if (!surfaceRef) return false;
    const rect = surfaceRef.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    const boundsWidth = Math.max(1, bounds.right - bounds.left);
    const boundsHeight = Math.max(1, bounds.bottom - bounds.top);
    const zoom = clamp(
      Math.min(
        DEFAULT_INITIAL_ZOOM,
        Math.max(1, rect.width - padding * 2) / boundsWidth,
        Math.max(1, rect.height - padding * 2) / boundsHeight,
      ),
      minZoom(),
      maxZoom(),
    );
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;
    const nextCamera = {
      x: rect.width / 2 - centerX * zoom,
      y: rect.height / 2 - centerY * zoom,
      zoom,
    };
    if (transition) transitionCamera(nextCamera, transition);
    else setCamera(nextCamera);
    return true;
  };

  const zoomAtSurfaceCentre = (factor: number) => {
    if (!surfaceRef) return false;
    const rect = surfaceRef.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    setCamera(
      zoomCameraAtPoint(
        camera,
        camera.zoom * factor,
        { x: rect.width / 2, y: rect.height / 2 },
        minZoom(),
        maxZoom(),
      ),
    );
    return true;
  };

  const api: WorkspaceApi = {
    fitBounds,
    getCamera: () => ({ ...camera }),
    getSurfaceElement: () => surfaceRef,
    screenDeltaToWorld: (delta) => ({
      x: delta.x / camera.zoom,
      y: delta.y / camera.zoom,
    }),
    screenToWorld: (point) => screenToWorldPoint(camera, point),
    setCamera,
    worldToScreen: (point) => worldToScreenPoint(camera, point),
    zoomIn: () => zoomAtSurfaceCentre(ZOOM_STEP_FACTOR),
    zoomOut: () => zoomAtSurfaceCentre(1 / ZOOM_STEP_FACTOR),
  };

  untrack(() => props.apiRef?.(api));

  const handleWheel = (event: WheelEvent) => {
    if (!surfaceRef) return;
    event.preventDefault();

    const rect = surfaceRef.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    setCamera(
      zoomCameraAtPoint(
        camera,
        camera.zoom * Math.exp(-event.deltaY * 0.001),
        { x: pointerX, y: pointerY },
        minZoom(),
        maxZoom(),
      ),
    );
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (!surfaceRef) return;
    if (event.button !== 0) return;
    // Anything in the world that handles its own pointer (a node, a handle) marks the
    // event so the surface does not also pan underneath it.
    if (event.defaultPrevented) return;

    cancelCameraTransition();
    surfaceRef.setPointerCapture(event.pointerId);
    surfaceRef.style.cursor = "grabbing";
    drag = {
      hasMoved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cameraX: camera.x,
      cameraY: camera.y,
    };
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.hypot(deltaX, deltaY) >= CLICK_MOVE_THRESHOLD) {
      drag.hasMoved = true;
    }

    event.preventDefault();
    setCamera({
      ...camera,
      x: drag.cameraX + deltaX,
      y: drag.cameraY + deltaY,
    });
  };

  const finishPointerDrag = (event: PointerEvent) => {
    if (!surfaceRef) return;
    if (!drag || event.pointerId !== drag.pointerId) return;

    surfaceRef.releasePointerCapture(event.pointerId);
    surfaceRef.style.cursor = "grab";
    const hasMoved = drag.hasMoved;
    drag = undefined;
    if (!hasMoved) {
      props.onBackgroundClick?.();
    }
  };

  const setupCamera = () => {
    if (ready || !surfaceReady || !worldReady) return;

    ready = true;
    setupFrame = requestAnimationFrame(() => {
      if (!surfaceRef || !worldRef) return;

      const rect = surfaceRef.getBoundingClientRect();
      camera = props.initialCamera?.({
        height: rect.height,
        width: rect.width,
      }) ?? {
        x: rect.width / 2,
        y: rect.height / 2,
        zoom: initialZoom(),
      };
      camera.zoom = clamp(camera.zoom, minZoom(), maxZoom());
      applyCamera();
      resizeObserver = new ResizeObserver(scheduleCameraApply);
      resizeObserver.observe(surfaceRef);

      // Not a JSX handler: wheel has to be non-passive to preventDefault the page scroll.
      surfaceRef.addEventListener("wheel", handleWheel, { passive: false });
    });
  };

  onCleanup(() => {
    cancelCameraTransition();
    if (setupFrame !== undefined) {
      cancelAnimationFrame(setupFrame);
    }
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
    }
    resizeObserver?.disconnect();
    surfaceRef?.removeEventListener("wheel", handleWheel);
  });

  return (
    <div
      data-workspace-surface
      ref={(el) => {
        surfaceRef = el;
        surfaceReady = true;
        setupCamera();
      }}
      class={cn(
        "relative h-full w-full cursor-grab touch-none select-none overflow-hidden",
        props.class,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerDrag}
      onPointerCancel={finishPointerDrag}
    >
      {props.background}
      <canvas
        data-workspace-grid
        ref={(el) => {
          gridCanvasRef = el;
          if (ready) scheduleCameraApply();
        }}
        class="pointer-events-none absolute will-change-transform"
      />
      {props.viewportLayer}
      <div
        data-workspace-world
        ref={(el) => {
          worldRef = el;
          worldReady = true;
          setupCamera();
        }}
        class="absolute left-0 top-0 will-change-transform"
        style={{ "transform-origin": "0 0" }}
      >
        {props.children}
      </div>
    </div>
  );
}
