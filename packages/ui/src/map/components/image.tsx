import type { Map as MaplibreMap } from "maplibre-gl";
import { createEffect } from "solid-js";
import { useMapContext } from "./map";

type MapImage = Parameters<MaplibreMap["addImage"]>[1];

export interface ImageProps {
  id: string;
  image?: MapImage;
  options?: Parameters<MaplibreMap["addImage"]>[2];
  url?: string;
}

export function Image(props: ImageProps): null {
  const { map, styleRevision } = useMapContext();

  createEffect(
    () => ({
      id: props.id,
      map: map(),
      styleRevision: styleRevision?.() ?? 0,
    }),
    (state) => {
      if (!state.map || !state.id) return;
      return () => {
        if (state.map?.hasImage(state.id)) state.map.removeImage(state.id);
      };
    },
  );

  createEffect(
    () => ({
      id: props.id,
      image: props.image,
      map: map(),
      options: props.options,
      styleRevision: styleRevision?.() ?? 0,
      url: props.url,
    }),
    (state, previous) => {
      if (!state.map) return;
      if (!state.image && !state.url) {
        if (state.map.hasImage(state.id)) state.map.removeImage(state.id);
        return;
      }

      let cancelled = false;
      const replaceForOptions =
        previous?.map === state.map &&
        previous.id === state.id &&
        previous.options !== state.options;

      void (async () => {
        const loaded = state.url ? await state.map?.loadImage(state.url) : undefined;
        if (cancelled || !state.map) return;
        const loadedImage = loaded && "data" in loaded ? loaded.data : loaded;
        const nextImage = state.image ?? loadedImage;
        if (!nextImage) return;

        if (state.map.hasImage(state.id) && replaceForOptions) {
          state.map.removeImage(state.id);
          state.map.addImage(state.id, nextImage, state.options);
        } else if (state.map.hasImage(state.id)) {
          state.map.updateImage(state.id, nextImage);
        } else {
          state.map.addImage(state.id, nextImage, state.options);
        }
      })();

      return () => {
        cancelled = true;
      };
    },
  );

  return null;
}
