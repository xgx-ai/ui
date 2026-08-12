/**
 * Pure camera and grid maths for `Workspace`. Kept apart from the component so it can be
 * unit-tested without a DOM.
 */

const MAX_GRID_PIXEL_RATIO = 2;
const MAX_GRID_BACKING_PIXELS = 8_388_608;

/**
 * How far the grid canvas has to be nudged so its dots line up with the camera. Always
 * within [0, gridScreenSize), so the canvas itself never has to be redrawn while panning.
 */
export function getGridCanvasPhase(cameraOffset: number, gridScreenSize: number) {
  return ((cameraOffset % gridScreenSize) + gridScreenSize) % gridScreenSize;
}

/**
 * Device pixel ratio for the grid canvas, capped twice: at 2x, because dots gain nothing
 * beyond it, and at a total backing-store area, so a very large workspace on a retina
 * display cannot allocate an enormous buffer.
 */
export function getGridCanvasPixelRatio(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
) {
  const area = Math.max(1, cssWidth * cssHeight);
  const areaLimitedRatio = Math.sqrt(MAX_GRID_BACKING_PIXELS / area);
  return Math.max(
    0.5,
    Math.min(MAX_GRID_PIXEL_RATIO, Math.max(1, devicePixelRatio || 1), areaLimitedRatio),
  );
}

/** Zooms while keeping the world point under `point` pinned to that same screen point. */
export function zoomCameraAtPoint(
  camera: { x: number; y: number; zoom: number },
  nextZoom: number,
  point: { x: number; y: number },
  minZoom: number,
  maxZoom: number,
) {
  const zoom = Math.min(Math.max(nextZoom, minZoom), maxZoom);
  const worldX = (point.x - camera.x) / camera.zoom;
  const worldY = (point.y - camera.y) / camera.zoom;

  return {
    x: point.x - worldX * zoom,
    y: point.y - worldY * zoom,
    zoom,
  };
}

export function interpolateWorkspaceCamera(
  from: { x: number; y: number; zoom: number },
  to: { x: number; y: number; zoom: number },
  progress: number,
) {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    zoom: from.zoom + (to.zoom - from.zoom) * progress,
  };
}

/** Screen point (relative to the surface) → world point. */
export function screenToWorldPoint(
  camera: { x: number; y: number; zoom: number },
  point: { x: number; y: number },
) {
  return {
    x: (point.x - camera.x) / camera.zoom,
    y: (point.y - camera.y) / camera.zoom,
  };
}

/** World point → screen point (relative to the surface). */
export function worldToScreenPoint(
  camera: { x: number; y: number; zoom: number },
  point: { x: number; y: number },
) {
  return {
    x: point.x * camera.zoom + camera.x,
    y: point.y * camera.zoom + camera.y,
  };
}
