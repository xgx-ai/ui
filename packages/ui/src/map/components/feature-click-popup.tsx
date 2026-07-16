import type { JSX } from "@solidjs/web";
import type { MapMouseEvent, PopupOptions } from "maplibre-gl";
import { createEffect, createSignal, Show } from "solid-js";
import { useLayerId } from "./layer";
import { useMapContext } from "./map";
import { Popup } from "./popup";

export interface ClickedFeature {
  lngLat: [number, number];
  properties: Record<string, unknown>;
}

export interface FeatureClickPopupProps {
  children: (feature: ClickedFeature) => JSX.Element;
  layers?: string[];
  options?: PopupOptions;
}

export function FeatureClickPopup(props: FeatureClickPopupProps) {
  const { map } = useMapContext();
  const parentLayerId = useLayerId();
  const [clickedFeature, setClickedFeature] = createSignal<ClickedFeature>();

  createEffect(
    () => ({
      layers: [...(props.layers ?? []), ...(parentLayerId ? [parentLayerId] : [])],
      map: map(),
    }),
    (state) => {
      if (!state.map || state.layers.length === 0) return;
      const handleClick = (event: MapMouseEvent) => {
        const layers = state.layers.filter((id) => state.map?.getLayer(id));
        if (layers.length === 0 || !state.map) return;
        const feature = state.map.queryRenderedFeatures(event.point, { layers })[0];
        setClickedFeature(
          feature
            ? {
                lngLat: [event.lngLat.lng, event.lngLat.lat],
                properties: feature.properties ?? {},
              }
            : undefined,
        );
      };

      state.map.on("click", handleClick);
      return () => state.map?.off("click", handleClick);
    },
  );

  return (
    <Show when={clickedFeature()}>
      {(feature) => (
        <Popup
          lngLat={feature().lngLat}
          options={{
            closeButton: false,
            closeOnClick: false,
            ...props.options,
          }}
          onClose={() => setClickedFeature(undefined)}
        >
          {props.children(feature())}
        </Popup>
      )}
    </Show>
  );
}
