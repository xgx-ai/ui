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
import { Layer } from "./layer";
import {
  fractionToCoordinate,
  insertFraction,
  isLineValid,
  isLockedFractionIndex,
  type LineMarkerCoordinate,
  normaliseFractions,
  projectCoordinateToFraction,
  reorderFractionForDrag,
} from "./line-marker-tool-utils";
import { useMapContext } from "./map";
import { Marker } from "./marker";
import { Source } from "./source";

export interface LineMarkerToolProps {
  children?: JSX.Element | ((props: LineMarkerToolRenderProps) => JSX.Element);
  enableKeyboardShortcuts?: boolean;
  fractions?: number[];
  id?: string;
  initialFractions?: number[];
  line: LineMarkerCoordinate[];
  lineColor?: string;
  lineWidth?: number;
  lockedEndpoints?: boolean;
  markerActiveColor?: string;
  markerInactiveColor?: string;
  onFractionsChange?: (fractions: number[]) => void;
}

export interface LineMarkerToolRenderProps {
  readonly activeMarkerIndex: number | undefined;
  deleteMarker: () => void;
  readonly fractions: number[];
  readonly markerCount: number;
  redo: () => void;
  reset: () => void;
  undo: () => void;
}

interface LineMarkerModel {
  fraction: number;
  id: string;
}

function eventCoordinate(event: unknown): LineMarkerCoordinate | undefined {
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

export function LineMarkerTool(props: LineMarkerToolProps) {
  const { container, setCursor } = useMapContext();
  const id = untrack(() => props.id) ?? createUniqueId();
  let nextMarkerId = 0;
  const createMarkerId = () => `${id}-marker-${++nextMarkerId}`;
  const lockedEndpoints = createMemo(() => props.lockedEndpoints ?? true);
  const initialFractions = normaliseFractions(
    untrack(() => props.initialFractions ?? props.fractions ?? []),
    untrack(() => props.lockedEndpoints ?? true),
  );
  const [activeMarkerId, setActiveMarkerId] = createSignal<string>();
  const [draggingMarkerId, setDraggingMarkerId] = createSignal<string>();
  const [, setFractions, history] = createHistoryStore<number[]>(initialFractions, {
    manual: true,
  });
  const [models, setModels] = createStore<LineMarkerModel[]>(
    initialFractions.map((fraction) => ({ fraction, id: createMarkerId() })),
  );
  let committedValue = JSON.stringify(initialFractions);
  let lastEmittedValue = committedValue;

  const lineColour = createMemo(() => resolveMapColour(props.lineColor, "--primary", container()));
  const markerActiveColour = createMemo(() =>
    resolveMapColour(props.markerActiveColor, "--primary", container()),
  );
  const markerInactiveColour = createMemo(() =>
    resolveMapColour(props.markerInactiveColor, "--primary", container()),
  );
  const hasValidLine = createMemo(() => isLineValid(props.line));
  const lineFeatureCollection = createMemo<GeoJSON.FeatureCollection>(() => ({
    features: hasValidLine()
      ? [
          {
            geometry: { coordinates: props.line, type: "LineString" },
            properties: {},
            type: "Feature",
          },
        ]
      : [],
    type: "FeatureCollection",
  }));

  const readModels = (): LineMarkerModel[] => snapshot(models).map((model) => ({ ...model }));
  const replaceModels = (next: LineMarkerModel[]) => setModels(() => structuredClone(next));
  const fractionsFromModels = (value: readonly LineMarkerModel[] = models) =>
    value.map((model) => model.fraction);
  const modelsFromFractions = (
    fractions: number[],
    previous: readonly LineMarkerModel[] = models,
  ) =>
    fractions.map((fraction, index) => ({
      fraction,
      id: previous[index]?.id ?? createMarkerId(),
    }));

  const activeMarkerIndex = createMemo<number | undefined>(() => {
    const id = activeMarkerId();
    if (!id) return undefined;
    const index = models.findIndex((model) => model.id === id);
    return index >= 0 ? index : undefined;
  });

  function emit(next: number[]) {
    lastEmittedValue = JSON.stringify(next);
    props.onFractionsChange?.([...next]);
  }

  function commit(inputModels: LineMarkerModel[] = readModels()) {
    const nextFractions = normaliseFractions(fractionsFromModels(inputModels), lockedEndpoints());
    const nextModels = modelsFromFractions(nextFractions, inputModels);
    replaceModels(nextModels);
    const serialised = JSON.stringify(nextFractions);
    if (serialised === committedValue) return;
    committedValue = serialised;
    setFractions(nextFractions);
    history.commit(nextFractions);
    emit(nextFractions);
  }

  function reset() {
    const fractions = normaliseFractions([], lockedEndpoints());
    setActiveMarkerId(undefined);
    commit(modelsFromFractions(fractions, []));
  }

  function deleteMarker() {
    const index = activeMarkerIndex();
    const current = readModels();
    if (index === undefined || isLockedFractionIndex(index, current.length, lockedEndpoints())) {
      return;
    }
    current.splice(index, 1);
    setActiveMarkerId(undefined);
    commit(current);
  }

  function syncFromHistory(next: number[] | undefined) {
    if (!next) return;
    const nextModels = modelsFromFractions(next, readModels());
    replaceModels(nextModels);
    committedValue = JSON.stringify(next);
    setActiveMarkerId(undefined);
    emit(next);
  }

  function undo() {
    syncFromHistory(history.undo());
  }

  function redo() {
    syncFromHistory(history.redo());
  }

  createEffect(
    () => ({ fractions: props.fractions, locked: lockedEndpoints() }),
    (state) => {
      if (state.fractions === undefined) return;
      const next = normaliseFractions(state.fractions, state.locked);
      const serialised = JSON.stringify(next);
      if (serialised === lastEmittedValue || serialised === JSON.stringify(fractionsFromModels())) {
        return;
      }
      const nextModels = modelsFromFractions(next, readModels());
      replaceModels(nextModels);
      setFractions(next);
      history.clearHistory(next);
      committedValue = serialised;
      lastEmittedValue = serialised;
      setActiveMarkerId(undefined);
    },
  );

  function insertMarker(event: unknown) {
    if (!hasValidLine()) return;
    const coordinate = eventCoordinate(event);
    if (!coordinate) return;
    const current = readModels();
    const result = insertFraction(
      fractionsFromModels(current),
      projectCoordinateToFraction(props.line, coordinate),
      lockedEndpoints(),
    );
    if (!result.inserted) {
      setActiveMarkerId(current[result.index]?.id);
      return;
    }
    const inserted: LineMarkerModel = {
      fraction: result.fractions[result.index]!,
      id: createMarkerId(),
    };
    current.splice(result.index, 0, inserted);
    setActiveMarkerId(inserted.id);
    commit(current);
  }

  function updateMarker(markerId: string, event: unknown) {
    if (!hasValidLine()) return;
    const coordinate = eventCoordinate(event);
    if (!coordinate) return;
    const current = readModels();
    const index = current.findIndex((model) => model.id === markerId);
    if (index < 0 || isLockedFractionIndex(index, current.length, lockedEndpoints())) {
      return;
    }

    const result = reorderFractionForDrag(
      fractionsFromModels(current),
      index,
      projectCoordinateToFraction(props.line, coordinate),
      lockedEndpoints(),
    );
    const [moving] = current.splice(index, 1);
    if (!moving) return;
    moving.fraction = result.fractions[result.index] ?? moving.fraction;
    current.splice(result.index, 0, moving);
    replaceModels(current);
    emit(result.fractions);
  }

  function constrainToLine(coordinate: LineMarkerCoordinate) {
    if (!hasValidLine()) return coordinate;
    const fraction = projectCoordinateToFraction(props.line, coordinate);
    return fractionToCoordinate(props.line, fraction) ?? coordinate;
  }

  createMapKeyboardShortcuts(() => props.enableKeyboardShortcuts ?? true, container, [
    { code: "Backspace", handler: deleteMarker },
    { code: "Delete", handler: deleteMarker },
    { code: "KeyZ", control: true, handler: undo },
    { code: "KeyZ", control: true, handler: redo, shift: true },
  ]);

  const renderProps: LineMarkerToolRenderProps = {
    get activeMarkerIndex() {
      return activeMarkerIndex();
    },
    deleteMarker,
    get fractions() {
      return fractionsFromModels();
    },
    get markerCount() {
      return models.length;
    },
    redo,
    reset,
    undo,
  };

  return (
    <>
      <For each={models} keyed={(model) => model.id}>
        {(model, index) => {
          const isLocked = createMemo(() =>
            isLockedFractionIndex(index(), models.length, lockedEndpoints()),
          );
          const isActive = createMemo(() => activeMarkerId() === model().id);
          let lastCoordinate: LineMarkerCoordinate | undefined;
          const coordinate = createMemo(() => {
            if (draggingMarkerId() === model().id) return lastCoordinate;
            const next = fractionToCoordinate(props.line, model().fraction);
            if (next) lastCoordinate = next;
            return next;
          });

          return (
            <Show when={coordinate()}>
              {(lngLat) => (
                <Marker
                  lngLat={lngLat()}
                  constrainDrag={isLocked() ? undefined : constrainToLine}
                  onDrag={(event) => updateMarker(model().id, event)}
                  onDragEnd={() => {
                    setDraggingMarkerId(undefined);
                    commit(readModels());
                  }}
                  onDragStart={() => {
                    setActiveMarkerId(model().id);
                    setDraggingMarkerId(model().id);
                  }}
                  options={{ clickTolerance: 10, draggable: !isLocked() }}
                >
                  <button
                    aria-label={
                      isLocked()
                        ? `Fixed route boundary ${index() + 1}`
                        : `Move route boundary ${index() + 1}`
                    }
                    type="button"
                    class="xgx-map-line-marker"
                    data-active={isActive()}
                    data-locked={isLocked()}
                    onClick={() => setActiveMarkerId(model().id)}
                    style={
                      {
                        "--xgx-map-marker-active-colour": markerActiveColour(),
                        "--xgx-map-marker-colour": markerInactiveColour(),
                      } as JSX.CSSProperties
                    }
                  >
                    {index() + 1}
                  </button>
                </Marker>
              )}
            </Show>
          );
        }}
      </For>

      <Source id={`${id}-line-markers`} type="geojson" data={lineFeatureCollection()}>
        <Layer
          id={`${id}-line-markers-outline`}
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": lineColour(),
            "line-opacity": 0.75,
            "line-width": props.lineWidth ?? 5,
          }}
          onClick={insertMarker}
          onmouseenter={() => setCursor("pointer")}
          onmouseleave={() => setCursor("default")}
        />
      </Source>

      <Show when={typeof props.children === "function"} fallback={props.children as JSX.Element}>
        {(props.children as (value: LineMarkerToolRenderProps) => JSX.Element)(renderProps)}
      </Show>
    </>
  );
}
