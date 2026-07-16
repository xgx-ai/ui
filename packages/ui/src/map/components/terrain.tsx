import type { JSX } from "@solidjs/web";
import type { TerrainSpecification } from "maplibre-gl";
import { createEffect } from "solid-js";
import { useMapContext } from "./map";
import { useSourceRegistration } from "./source";

export interface TerrainProps {
  children?: JSX.Element;
  style: Omit<TerrainSpecification, "source"> & { source?: string };
  visible?: boolean;
}

export function Terrain(props: TerrainProps) {
  const { map, styleRevision } = useMapContext();
  const sourceRegistration = useSourceRegistration();

  createEffect(
    () => ({
      map: map(),
      sourceId: sourceRegistration?.id || props.style.source || "",
      style: props.style,
      styleRevision: styleRevision?.() ?? 0,
      visible: props.visible ?? true,
    }),
    (state) => {
      if (!state.map || !state.sourceId) return;
      state.map.setTerrain(state.visible ? { ...state.style, source: state.sourceId } : null);
      return () => state.map?.setTerrain(null);
    },
  );

  return props.children;
}
