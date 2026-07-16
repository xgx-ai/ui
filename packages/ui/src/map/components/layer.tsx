import type { JSX } from "@solidjs/web";
import type { FilterSpecification, LayerSpecification, MapMouseEvent } from "maplibre-gl";
import { createContext, createEffect, untrack, useContext } from "solid-js";
import { changedEntries } from "../types";
import { useMapContext } from "./map";
import { useSourceRegistration } from "./source";

export interface LayerFeatureState {
  id?: number | string;
  state: Record<string, unknown>;
}

export type LayerProps = Partial<LayerSpecification> & {
  before?: string;
  children?: JSX.Element;
  featureState?: LayerFeatureState;
  filter?: FilterSpecification;
  id: string;
  visible?: boolean;
  [key: `on${string}`]: ((event: MapMouseEvent) => void) | undefined;
};

const LayerContext = createContext("");

export function useLayerId(): string {
  return useContext(LayerContext);
}

function layerSpecification(props: LayerProps, sourceId: string): LayerSpecification {
  const specification: Record<string, unknown> = {};

  for (const key of Object.keys(props)) {
    if (
      key === "before" ||
      key === "children" ||
      key === "featureState" ||
      key === "filter" ||
      key === "visible" ||
      key.startsWith("on")
    ) {
      continue;
    }
    specification[key] = props[key as keyof LayerProps];
  }

  if (sourceId && specification.type !== "background") {
    specification.source = sourceId;
  }
  return specification as unknown as LayerSpecification;
}

function layerEventEntries(props: LayerProps) {
  return Object.keys(props).flatMap((key) => {
    if (!key.startsWith("on")) return [];
    const listener = props[key as `on${string}`];
    if (typeof listener !== "function") return [];
    return [[key.slice(2).toLowerCase(), listener] as const];
  });
}

export function Layer(props: LayerProps) {
  const { map, styleRevision } = useMapContext();
  const sourceRegistration = useSourceRegistration();

  createEffect(
    () => ({
      before: props.before,
      id: props.id,
      map: map(),
      sourceId: sourceRegistration?.id ?? "",
      styleRevision: styleRevision?.() ?? 0,
      type: props.type,
    }),
    (state) => {
      if (!state.map || !state.id || !state.type) return;
      if (state.sourceId && !state.map.getSource(state.sourceId)) return;

      const owned = !state.map.getLayer(state.id);
      if (owned) {
        state.map.addLayer(
          untrack(() => layerSpecification(props, state.sourceId)),
          state.before && state.map.getLayer(state.before) ? state.before : undefined,
        );
      }
      const unregister = sourceRegistration?.registerLayer(state.id);

      return () => {
        unregister?.();
        if (owned && state.map?.getLayer(state.id)) state.map.removeLayer(state.id);
      };
    },
  );

  createEffect(
    () => ({
      events: layerEventEntries(props),
      id: props.id,
      map: map(),
      styleRevision: styleRevision?.() ?? 0,
    }),
    (state) => {
      if (!state.map?.getLayer(state.id)) return;
      for (const [event, listener] of state.events) {
        state.map.on(event as never, state.id, listener as never);
      }
      return () => {
        for (const [event, listener] of state.events) {
          state.map?.off(event as never, state.id, listener as never);
        }
      };
    },
  );

  createEffect(
    () => ({
      id: props.id,
      layout: props.layout,
      map: map(),
      maxzoom: props.maxzoom,
      minzoom: props.minzoom,
      paint: props.paint,
      styleRevision: styleRevision?.() ?? 0,
      visible: props.visible,
    }),
    (state, previous) => {
      if (!state.map?.getLayer(state.id)) return;
      const comparablePrevious =
        previous?.map === state.map &&
        previous.id === state.id &&
        previous.styleRevision === state.styleRevision
          ? previous
          : undefined;

      for (const [key, value] of changedEntries(state.layout, comparablePrevious?.layout)) {
        state.map.setLayoutProperty(state.id, key, value);
      }
      for (const [key, value] of changedEntries(state.paint, comparablePrevious?.paint)) {
        state.map.setPaintProperty(state.id, key, value);
      }

      if (
        state.minzoom !== comparablePrevious?.minzoom ||
        state.maxzoom !== comparablePrevious?.maxzoom
      ) {
        state.map.setLayerZoomRange(state.id, state.minzoom ?? 0, state.maxzoom ?? 24);
      }

      if (state.visible !== comparablePrevious?.visible) {
        state.map.setLayoutProperty(
          state.id,
          "visibility",
          state.visible === false ? "none" : "visible",
          { validate: false },
        );
      }
    },
  );

  createEffect(
    () => ({
      filter: props.filter,
      id: props.id,
      map: map(),
      styleRevision: styleRevision?.() ?? 0,
    }),
    (state) => {
      if (!state.map?.getLayer(state.id)) return;
      state.map.setFilter(state.id, state.filter ?? null);
    },
  );

  createEffect(
    () => ({
      featureState: props.featureState,
      id: props.id,
      map: map(),
      sourceId: sourceRegistration?.id ?? "",
      sourceLayer: "source-layer" in props ? props["source-layer"] : undefined,
      styleRevision: styleRevision?.() ?? 0,
    }),
    (state) => {
      const featureState = state.featureState;
      const featureId = featureState?.id;
      if (
        !state.map?.getLayer(state.id) ||
        !featureState ||
        !state.sourceId ||
        featureId === undefined
      ) {
        return;
      }

      const target = {
        id: featureId,
        source: state.sourceId,
        sourceLayer: state.sourceLayer,
      };
      state.map.setFeatureState(target, featureState.state);
      return () => {
        if (state.map?.getSource(target.source)) {
          state.map.removeFeatureState(target);
        }
      };
    },
  );

  return <LayerContext value={props.id}>{props.children}</LayerContext>;
}
