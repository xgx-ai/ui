import type { JSX } from "@solidjs/web";
import { Portal } from "@solidjs/web";
import type { LngLatLike, Popup as MaplibrePopup, PopupOptions } from "maplibre-gl";
import { createEffect, createSignal, Show } from "solid-js";
import { useMapContext } from "./map";

export interface PopupProps {
  children?: JSX.Element;
  lngLat: LngLatLike;
  onClose?: () => void;
  options?: PopupOptions;
}

export function Popup(props: PopupProps) {
  const { map } = useMapContext();
  const [container, setContainer] = createSignal<HTMLDivElement>();
  const [popup, setPopup] = createSignal<MaplibrePopup>();

  createEffect(
    () => ({ map: map(), options: props.options }),
    (state) => {
      if (!state.map) return;
      let cancelled = false;
      let instance: MaplibrePopup | undefined;
      const handleClose = () => props.onClose?.();
      const content = document.createElement("div");
      setContainer(content);

      void import("maplibre-gl").then((maplibre) => {
        if (cancelled || !state.map) return;
        instance = new maplibre.Popup(state.options)
          .setLngLat(props.lngLat)
          .setDOMContent(content)
          .addTo(state.map);
        instance.on("close", handleClose);
        setPopup(instance);
      });

      return () => {
        cancelled = true;
        if (instance) {
          instance.off("close", handleClose);
          instance.remove();
        }
        setPopup(undefined);
        setContainer(undefined);
      };
    },
  );

  createEffect(
    () => ({ lngLat: props.lngLat, popup: popup() }),
    (state) => {
      state.popup?.setLngLat(state.lngLat);
    },
  );

  return (
    <Show when={container()}>{(mount) => <Portal mount={mount()}>{props.children}</Portal>}</Show>
  );
}
