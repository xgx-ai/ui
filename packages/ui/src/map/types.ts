import type { JSX } from "@solidjs/web";
import type { MapMouseEvent } from "maplibre-gl";

/** CSS cursor values accepted by MapLibre's canvas. */
export type Cursor = JSX.CSSProperties["cursor"];

/** A MapLibre event handler exposed through `on<Event>` component props. */
export type MapEventListener = (event: MapMouseEvent | unknown) => void;

/** MapLibre event props such as `onClick`, `onMove`, and `onZoomEnd`. */
export type MapEventHandlerProps = {
  [key: `on${string}`]: MapEventListener | undefined;
};

export function mapEventEntries(source: MapEventHandlerProps): Array<[string, MapEventListener]> {
  const entries: Array<[string, MapEventListener]> = [];

  for (const key of Object.keys(source)) {
    if (!key.startsWith("on") || key === "onInitError") continue;
    const listener = source[key as `on${string}`];
    if (typeof listener !== "function") continue;
    entries.push([key.slice(2).toLowerCase(), listener]);
  }

  return entries;
}

/** Returns changed or removed object properties. */
export function changedEntries<T extends object>(
  current: T | undefined,
  previous: T | undefined,
): Array<[string, T[keyof T] | undefined]> {
  const keys = new Set([...Object.keys(current ?? {}), ...Object.keys(previous ?? {})]);

  return [...keys].flatMap((key) => {
    const currentValue = current?.[key as keyof T];
    const previousValue = previous?.[key as keyof T];
    return currentValue === previousValue ? [] : [[key, currentValue]];
  });
}
