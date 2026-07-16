import type { JSX } from "@solidjs/web";
import {
  createEffect,
  createMemo,
  createSignal,
  createStore,
  createUniqueId,
  For,
  Show,
  snapshot,
  untrack,
} from "solid-js";
import { createHistoryStore } from "../utils/history";
import { createMapKeyboardShortcuts } from "../utils/keyboard";
import { resolveMapColour } from "../utils/theme";
import { insertCoordinateIntoDrawLine, type DrawToolMode } from "./draw-tool-utils";
import { Layer } from "./layer";
import { useMapContext } from "./map";
import { Marker } from "./marker";
import { Source } from "./source";

export type { DrawToolMode };

export interface DrawToolProps {
  children?: JSX.Element | ((props: DrawToolRenderProps) => JSX.Element);
  enableKeyboardShortcuts?: boolean;
  fillColor?: string;
  fillOpacity?: number;
  id?: string;
  initialData?: [number, number][];
  lineColor?: string;
  lineWidth?: number;
  markerActiveColor?: string;
  markerInactiveColor?: string;
  mode?: DrawToolMode;
  onPointsChange?: (points: [number, number][]) => void;
  /** Controlled points. */
  points?: [number, number][];
  /** Changing the accessor's value resets the tool after its first read. */
  reset?: () => unknown;
}

export interface DrawToolRenderProps {
  readonly activeMarkerIndex: number | undefined;
  deleteMarker: () => void;
  readonly geojson: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.LineString>;
  readonly isInserting: boolean;
  readonly markerCount: number;
  readonly mode: DrawToolMode;
  redo: () => void;
  reset: () => void;
  undo: () => void;
}

function clonePoints(points: readonly [number, number][]): [number, number][] {
  return points.map(([longitude, latitude]) => [longitude, latitude]);
}

function createGeometry(
  coordinates: [number, number][],
  mode: DrawToolMode,
  id: string,
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.LineString> {
  if (mode === "line") {
    return {
      geometry: { coordinates, type: "LineString" },
      id,
      properties: { name: id },
      type: "Feature",
    };
  }

  const first = coordinates[0];
  return {
    geometry: {
      coordinates: first ? [[...coordinates, first]] : [[]],
      type: "Polygon",
    },
    id,
    properties: { name: id },
    type: "Feature",
  };
}

function eventCoordinate(event: unknown): [number, number] | undefined {
  const direct = (event as { lngLat?: { toArray?: () => number[] } }).lngLat?.toArray?.();
  const marker = (
    event as {
      target?: { getLngLat?: () => { toArray?: () => number[] } };
    }
  ).target
    ?.getLngLat?.()
    .toArray?.();
  const value = direct ?? marker;
  if (!value || value.length < 2) return undefined;
  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  return Number.isFinite(longitude) && Number.isFinite(latitude)
    ? [longitude, latitude]
    : undefined;
}

export function DrawTool(props: DrawToolProps) {
  const { container, setCursor, useMapEvent } = useMapContext();
  const id = untrack(() => props.id) ?? createUniqueId();
  const initialPoints = clonePoints(untrack(() => props.initialData ?? props.points ?? []));
  const [activeMarker, setActiveMarker] = createSignal<number>();
  const [inserting, setInserting] = createSignal(false);
  const [, setCoordinates, history] = createHistoryStore<[number, number][]>(initialPoints);
  const [markerPositions, setMarkerPositions] = createStore<[number, number][]>(initialPoints);
  let committedValue = JSON.stringify(initialPoints);
  let lastEmittedValue = committedValue;
  let resetInitialised = false;

  const mode = createMemo<DrawToolMode>(() => props.mode ?? "geometry");
  const lineColour = createMemo(() => resolveMapColour(props.lineColor, "--primary", container()));
  const fillColour = createMemo(() => resolveMapColour(props.fillColor, "--primary", container()));
  const markerActiveColour = createMemo(() =>
    resolveMapColour(props.markerActiveColor, "--primary", container()),
  );
  const markerInactiveColour = createMemo(() =>
    resolveMapColour(props.markerInactiveColor, "--primary", container()),
  );
  const geojson = createMemo(() => createGeometry(clonePoints(markerPositions), mode(), id));
  const sourceData = createMemo<GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.LineString>>(
    () => ({
      features: markerPositions.length >= (mode() === "line" ? 2 : 3) ? [geojson()] : [],
      type: "FeatureCollection",
    }),
  );

  const readPositions = () => clonePoints(snapshot(markerPositions));
  const replacePositions = (next: [number, number][]) => {
    setMarkerPositions(() => clonePoints(next));
  };

  function emit(next: [number, number][]) {
    const serialised = JSON.stringify(next);
    lastEmittedValue = serialised;
    props.onPointsChange?.(clonePoints(next));
  }

  function commit(next: [number, number][]) {
    const serialised = JSON.stringify(next);
    if (serialised === committedValue) return;
    committedValue = serialised;
    setCoordinates(clonePoints(next));
    emit(next);
  }

  function reset() {
    const next: [number, number][] = [];
    replacePositions(next);
    setActiveMarker(undefined);
    commit(next);
  }

  function deleteMarker() {
    const index = activeMarker();
    if (index === undefined) return;
    const next = readPositions();
    next.splice(index, 1);
    replacePositions(next);
    setActiveMarker(undefined);
    commit(next);
  }

  function undo() {
    const next = history.undo();
    if (!next) return;
    replacePositions(next);
    committedValue = JSON.stringify(next);
    setActiveMarker(undefined);
    emit(next);
  }

  function redo() {
    const next = history.redo();
    if (!next) return;
    replacePositions(next);
    committedValue = JSON.stringify(next);
    setActiveMarker(undefined);
    emit(next);
  }

  createEffect(
    () => props.points,
    (points) => {
      if (points === undefined) return;
      const next = clonePoints(points);
      const serialised = JSON.stringify(next);
      if (serialised === lastEmittedValue || serialised === JSON.stringify(readPositions())) {
        return;
      }
      replacePositions(next);
      setCoordinates(next);
      history.clearHistory(next);
      committedValue = serialised;
      lastEmittedValue = serialised;
      setActiveMarker(undefined);
    },
  );

  createEffect(
    () => props.reset?.(),
    () => {
      if (!resetInitialised) {
        resetInitialised = true;
        return;
      }
      reset();
    },
  );

  useMapEvent("click", (event) => {
    const target = (event as { originalEvent?: { target?: Element } }).originalEvent?.target;
    if (target?.closest?.(".xgx-map-draw-marker")) return;
    const coordinate = eventCoordinate(event);
    if (!coordinate) return;

    const current = readPositions();
    if (inserting()) {
      const next = insertCoordinateIntoDrawLine(current, coordinate, mode());
      if (!next) return;
      replacePositions(next);
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const [index, [longitude, latitude]] of next.entries()) {
        const distance = Math.hypot(longitude - coordinate[0], latitude - coordinate[1]);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }
      setActiveMarker(closestIndex);
      commit(next);
      return;
    }

    const activeIndex = activeMarker();
    const index = activeIndex === undefined ? current.length : activeIndex + 1;
    current.splice(index, 0, coordinate);
    replacePositions(current);
    setActiveMarker(index);
    commit(current);
  });

  createEffect(inserting, (value) => setCursor(value ? "pointer" : "crosshair"));

  createMapKeyboardShortcuts(() => props.enableKeyboardShortcuts ?? true, container, [
    { code: "Backspace", handler: deleteMarker },
    { code: "Delete", handler: deleteMarker },
    { code: "KeyZ", control: true, handler: undo },
    { code: "KeyZ", control: true, handler: redo, shift: true },
  ]);

  const renderProps: DrawToolRenderProps = {
    get activeMarkerIndex() {
      return activeMarker();
    },
    deleteMarker,
    get geojson() {
      return geojson();
    },
    get isInserting() {
      return inserting();
    },
    get markerCount() {
      return markerPositions.length;
    },
    get mode() {
      return mode();
    },
    redo,
    reset,
    undo,
  };

  return (
    <>
      <For each={markerPositions} keyed={false}>
        {(lngLat, index) => (
          <Marker
            lngLat={lngLat()}
            onDrag={(event) => {
              const coordinate = eventCoordinate(event);
              if (!coordinate) return;
              setMarkerPositions((draft) => {
                draft[index] = coordinate;
              });
            }}
            onDragEnd={() => commit(readPositions())}
            onDragStart={() => setActiveMarker(index)}
            options={{ clickTolerance: 10, draggable: true }}
          >
            <button
              aria-label={`Move point ${index + 1}`}
              type="button"
              class="xgx-map-draw-marker"
              data-active={activeMarker() === index}
              onClick={() => setActiveMarker(index)}
              style={
                {
                  "--xgx-map-marker-active-colour": markerActiveColour(),
                  "--xgx-map-marker-colour": markerInactiveColour(),
                } as JSX.CSSProperties
              }
            />
          </Marker>
        )}
      </For>

      <Source id={`${id}-draw-tool`} type="geojson" data={sourceData()}>
        <Layer
          id={`${id}-outline`}
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": lineColour(),
            "line-dasharray": [3, 2],
            "line-width": props.lineWidth ?? 3,
          }}
          onmouseenter={() => setInserting(true)}
          onmouseleave={() => setInserting(false)}
        />
        <Show when={mode() === "geometry"}>
          <Layer
            id={`${id}-fill`}
            type="fill"
            paint={{
              "fill-color": fillColour(),
              "fill-opacity": props.fillOpacity ?? 0.15,
            }}
          />
        </Show>
      </Source>

      <Show when={typeof props.children === "function"} fallback={props.children as JSX.Element}>
        {(props.children as (value: DrawToolRenderProps) => JSX.Element)(renderProps)}
      </Show>
    </>
  );
}
