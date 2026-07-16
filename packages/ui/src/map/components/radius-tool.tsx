import type { JSX } from "@solidjs/web";
import { circle as turfCircle } from "@turf/turf";
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  Show,
  snapshot,
  untrack,
} from "solid-js";
import { createHistoryStore } from "../utils/history";
import { createMapKeyboardShortcuts } from "../utils/keyboard";
import { resolveMapColour } from "../utils/theme";
import { Layer } from "./layer";
import { useMapContext } from "./map";
import { Marker } from "./marker";
import { Source } from "./source";

interface RadiusCircleState {
  center: [number, number];
  radius: number;
}

export interface RadiusToolProps {
  center?: [number, number];
  centerMarkerColor?: string;
  children?: JSX.Element | ((props: RadiusToolRenderProps) => JSX.Element);
  enableKeyboardShortcuts?: boolean;
  fillColor?: string;
  fillOpacity?: number;
  id?: string;
  initialCenter?: [number, number];
  initialRadius?: number;
  lineColor?: string;
  lineWidth?: number;
  maxRadius?: number;
  minRadius?: number;
  onChange?: (state: RadiusCircleState) => void;
  radius?: number;
}

export interface RadiusToolRenderProps {
  readonly center: [number, number] | undefined;
  readonly geojson: GeoJSON.Feature<GeoJSON.Polygon>;
  readonly isSet: boolean;
  readonly radius: number;
  redo: () => void;
  reset: () => void;
  undo: () => void;
}

function circleGeoJSON(
  center: [number, number],
  radius: number,
  id: string,
): GeoJSON.Feature<GeoJSON.Polygon> {
  if (radius <= 0) {
    return {
      geometry: { coordinates: [[]], type: "Polygon" },
      id,
      properties: { name: id, radius },
      type: "Feature",
    };
  }

  const feature = turfCircle(center, radius / 1000, {
    steps: 64,
    units: "kilometers",
  });
  return {
    ...feature,
    id,
    properties: { ...feature.properties, name: id, radius },
  };
}

function markerCoordinate(event: unknown): [number, number] | undefined {
  const value = (
    event as {
      target?: { getLngLat?: () => { toArray?: () => number[] } };
    }
  ).target
    ?.getLngLat?.()
    .toArray?.();
  return value && value.length >= 2 ? [Number(value[0]), Number(value[1])] : undefined;
}

function mapCoordinate(event: unknown): [number, number] | undefined {
  const value = (event as { lngLat?: { toArray?: () => number[] } }).lngLat?.toArray?.();
  return value && value.length >= 2 ? [Number(value[0]), Number(value[1])] : undefined;
}

function distanceInMetres(first: [number, number], second: [number, number]): number {
  const earthRadius = 6_371_000;
  const [longitude1, latitude1] = first;
  const [longitude2, latitude2] = second;
  const latitudeDelta = ((latitude2 - latitude1) * Math.PI) / 180;
  const longitudeDelta = ((longitude2 - longitude1) * Math.PI) / 180;
  const latitude1Radians = (latitude1 * Math.PI) / 180;
  const latitude2Radians = (latitude2 * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1Radians) * Math.cos(latitude2Radians) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function RadiusTool(props: RadiusToolProps) {
  const { container, map, setCursor, useMapEvent } = useMapContext();
  const id = untrack(() => props.id) ?? createUniqueId();
  const initialCenter = untrack(() => props.initialCenter ?? props.center);
  const initialRadius = untrack(() => props.initialRadius ?? props.radius ?? 50);
  const initialState: RadiusCircleState = {
    center: initialCenter ?? [0, 0],
    radius: initialRadius,
  };
  const [circleState, setCircleState, history] =
    createHistoryStore<RadiusCircleState>(initialState);
  const [circleSet, setCircleSet] = createSignal(Boolean(initialCenter));
  const [settingCenter, setSettingCenter] = createSignal(!initialCenter);
  const [draggingRadius, setDraggingRadius] = createSignal(false);
  const [draggingCenter, setDraggingCenter] = createSignal(false);

  const minimumRadius = createMemo(() => props.minRadius ?? 10);
  const maximumRadius = createMemo(() => props.maxRadius ?? 1000);
  const lineColour = createMemo(() => resolveMapColour(props.lineColor, "--primary", container()));
  const fillColour = createMemo(() => resolveMapColour(props.fillColor, "--primary", container()));
  const markerColour = createMemo(() =>
    resolveMapColour(props.centerMarkerColor, "--primary", container()),
  );
  const geojson = createMemo(() =>
    circleGeoJSON(circleState.center, circleSet() ? circleState.radius : 0, id),
  );

  function applyState(next: RadiusCircleState, emit = true) {
    setCircleState(next);
    if (emit) props.onChange?.(structuredClone(next));
  }

  function reset() {
    applyState(initialState, false);
    history.clearHistory(initialState);
    setCircleSet(false);
    setSettingCenter(true);
    setDraggingCenter(false);
    setDraggingRadius(false);
  }

  function undo() {
    const next = history.undo();
    if (!next) return;
    setCircleSet(true);
    props.onChange?.(structuredClone(next));
  }

  function redo() {
    const next = history.redo();
    if (!next) return;
    setCircleSet(true);
    props.onChange?.(structuredClone(next));
  }

  createEffect(
    () => ({
      center: props.center,
      hasInitialCenter: props.initialCenter !== undefined,
      radius: props.radius,
    }),
    (state) => {
      if (state.hasInitialCenter || !state.center || state.radius === undefined) {
        return;
      }
      const next = { center: state.center, radius: state.radius };
      const current = snapshot(circleState);
      if (JSON.stringify(next) === JSON.stringify(current)) return;
      applyState(next, false);
      history.clearHistory(next);
      setCircleSet(true);
      setSettingCenter(false);
    },
  );

  useMapEvent("click", (event) => {
    const target = (event as { originalEvent?: { target?: Element } }).originalEvent?.target;
    if (target?.closest?.(".xgx-map-radius-marker") || !settingCenter()) return;
    const center = mapCoordinate(event);
    if (!center) return;
    const next = { center, radius: initialRadius };
    applyState(next);
    setCircleSet(true);
    setSettingCenter(false);
  });

  useMapEvent("mousemove", (event) => {
    if (!draggingRadius()) return;
    const coordinate = mapCoordinate(event);
    if (!coordinate) return;
    const current = snapshot(circleState);
    const radius = Math.max(
      minimumRadius(),
      Math.min(maximumRadius(), distanceInMetres(current.center, coordinate)),
    );
    applyState({ ...current, radius });
  });

  useMapEvent("mouseup", () => setDraggingRadius(false));

  createEffect(settingCenter, (setting) => setCursor(setting ? "crosshair" : "default"));
  createEffect(
    () => ({
      dragging: draggingRadius() || draggingCenter(),
      map: map(),
    }),
    (state) => {
      if (!state.map) return;
      if (state.dragging) {
        setCursor("grabbing");
        state.map.dragPan.disable();
        return () => state.map?.dragPan.enable();
      }
      state.map.dragPan.enable();
    },
  );

  createMapKeyboardShortcuts(() => props.enableKeyboardShortcuts ?? true, container, [
    { code: "Escape", handler: reset },
    { code: "KeyZ", control: true, handler: undo },
    { code: "KeyZ", control: true, handler: redo, shift: true },
  ]);

  const renderProps: RadiusToolRenderProps = {
    get center() {
      return circleSet() ? ([...circleState.center] as [number, number]) : undefined;
    },
    get geojson() {
      return geojson();
    },
    get isSet() {
      return circleSet();
    },
    get radius() {
      return circleState.radius;
    },
    redo,
    reset,
    undo,
  };

  return (
    <>
      <Show when={circleSet()}>
        <Marker
          lngLat={circleState.center}
          onDrag={(event) => {
            const center = markerCoordinate(event);
            if (!center) return;
            applyState({ ...snapshot(circleState), center });
          }}
          onDragEnd={() => setDraggingCenter(false)}
          onDragStart={() => setDraggingCenter(true)}
          options={{ clickTolerance: 10, draggable: true }}
        >
          <button
            aria-label="Move circle centre"
            type="button"
            class="xgx-map-radius-marker"
            style={{ "--xgx-map-marker-colour": markerColour() } as JSX.CSSProperties}
          />
        </Marker>

        <Source id={`${id}-radius-tool`} type="geojson" data={geojson()}>
          <Layer
            id={`${id}-outline`}
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": lineColour(),
              "line-dasharray": [3, 2],
              "line-width": props.lineWidth ?? 3,
            }}
            onmousedown={() => setDraggingRadius(true)}
            onmouseenter={() => setCursor("grab")}
            onmouseleave={() => {
              if (!draggingRadius()) setCursor("default");
            }}
          />
          <Layer
            id={`${id}-fill`}
            type="fill"
            paint={{
              "fill-color": fillColour(),
              "fill-opacity": props.fillOpacity ?? 0.15,
            }}
          />
        </Source>
      </Show>

      <Show when={typeof props.children === "function"} fallback={props.children as JSX.Element}>
        {(props.children as (value: RadiusToolRenderProps) => JSX.Element)(renderProps)}
      </Show>
    </>
  );
}
