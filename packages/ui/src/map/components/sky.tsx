import type { Map as MaplibreMap, SkySpecification } from "maplibre-gl";
import { createEffect } from "solid-js";
import { useMapContext } from "./map";

export type SkyProps = SkySpecification;

type MapWithOptionalSky = Omit<MaplibreMap, "setSky"> & {
  setSky: (sky?: SkySpecification) => MaplibreMap;
};

export function Sky(props: SkyProps): null {
  const { map, styleRevision } = useMapContext();

  createEffect(
    () => ({
      map: map(),
      sky: { ...props } as SkySpecification,
      styleRevision: styleRevision?.() ?? 0,
    }),
    (state) => {
      if (!state.map) return;
      state.map.setSky(state.sky);
      return () => (state.map as MapWithOptionalSky | undefined)?.setSky();
    },
  );

  return null;
}
