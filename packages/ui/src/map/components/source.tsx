import type { JSX } from "@solidjs/web";
import type {
  GeoJSONSource,
  GeoJSONSourceSpecification,
  SourceSpecification,
  VectorTileSource,
  VectorSourceSpecification,
} from "maplibre-gl";
import { createContext, createEffect, createSignal, Show, untrack, useContext } from "solid-js";
import { useMapContext } from "./map";

export type SourceProps = SourceSpecification & {
  children?: JSX.Element;
  id: string;
};

interface SourceContextValue {
  readonly id: string;
  registerLayer: (id: string) => () => void;
}

const SourceContext = createContext<SourceContextValue | undefined>(undefined);

export function useSourceId(): string {
  return useContext(SourceContext)?.id ?? "";
}

export function useSourceRegistration(): SourceContextValue | undefined {
  return useContext(SourceContext);
}

function sourceSpecification(props: SourceProps): SourceSpecification {
  const specification: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (key === "children" || key === "id") continue;
    specification[key] = props[key as keyof SourceProps];
  }
  return specification as SourceSpecification;
}

export function Source(props: SourceProps) {
  const { map, styleRevision } = useMapContext();
  const [loaded, setLoaded] = createSignal(false);
  const ownedLayerIds = new Set<string>();
  const context: SourceContextValue = {
    get id() {
      return props.id;
    },
    registerLayer(id) {
      ownedLayerIds.add(id);
      return () => ownedLayerIds.delete(id);
    },
  };

  createEffect(
    () => ({
      id: props.id,
      map: map(),
      styleRevision: styleRevision?.() ?? 0,
      type: props.type,
    }),
    (state) => {
      if (!state.map || !state.id) return;

      const owned = !state.map.getSource(state.id);
      if (owned) {
        state.map.addSource(
          state.id,
          untrack(() => sourceSpecification(props)),
        );
      }
      setLoaded(true);

      return () => {
        setLoaded(false);
        if (!owned) return;

        for (const layerId of ownedLayerIds) {
          if (state.map?.getLayer(layerId)) state.map.removeLayer(layerId);
        }
        ownedLayerIds.clear();
        if (state.map?.getSource(state.id)) state.map.removeSource(state.id);
      };
    },
  );

  createEffect(
    () => ({
      id: props.id,
      map: map(),
      specification: sourceSpecification(props),
      styleRevision: styleRevision?.() ?? 0,
    }),
    (state) => {
      const source = state.map?.getSource(state.id);
      if (!source) return;

      if (state.specification.type === "geojson" && source.type === "geojson") {
        const data = (state.specification as GeoJSONSourceSpecification).data;
        if (data) (source as GeoJSONSource).setData(data);
        return;
      }

      if (state.specification.type !== "vector" || source.type !== "vector") {
        return;
      }

      const vector = state.specification as VectorSourceSpecification;
      const vectorSource = source as VectorTileSource;
      if (vector.url) vectorSource.setUrl(vector.url);
      if (vector.tiles) vectorSource.setTiles(vector.tiles);
    },
  );

  return (
    <SourceContext value={context}>
      <Show when={loaded()}>{props.children}</Show>
    </SourceContext>
  );
}
