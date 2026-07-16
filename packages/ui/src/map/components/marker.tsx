import type { JSX } from "@solidjs/web";
import { render } from "@solidjs/web";
import type { LngLatLike, Marker as MaplibreMarker, MarkerOptions } from "maplibre-gl";
import { createEffect, createSignal } from "solid-js";
import { useMapContext } from "./map";

export interface MarkerProps {
  children?: JSX.Element;
  constrainDrag?: (lngLat: [number, number]) => [number, number];
  lngLat: LngLatLike;
  onClick?: (event: MouseEvent) => void;
  onDrag?: (event: unknown) => void;
  onDragEnd?: (event: unknown) => void;
  onDragStart?: (event: unknown) => void;
  onReady?: (marker: MaplibreMarker) => void;
  options?: Omit<MarkerOptions, "element">;
  popup?: HTMLElement;
}

export function Marker(props: MarkerProps): null {
  const { map } = useMapContext();
  const [marker, setMarker] = createSignal<MaplibreMarker>();

  createEffect(
    () => ({
      hasChildren: props.children !== undefined,
      map: map(),
      options: props.options,
      popup: props.popup,
    }),
    (state) => {
      if (!state.map) return;
      let cancelled = false;
      let instance: MaplibreMarker | undefined;
      let disposeChildren: (() => void) | undefined;
      let handleClick: ((event: MouseEvent) => void) | undefined;
      let handleDragStart: ((event: unknown) => void) | undefined;
      let handleDrag: ((event: unknown) => void) | undefined;
      let handleDragEnd: ((event: unknown) => void) | undefined;

      void import("maplibre-gl").then((maplibre) => {
        if (cancelled || !state.map) return;

        const element = state.hasChildren ? document.createElement("div") : undefined;
        if (element) disposeChildren = render(() => props.children, element);

        instance = new maplibre.Marker({
          ...state.options,
          ...(element ? { element } : {}),
        })
          .setLngLat(props.lngLat)
          .addTo(state.map);

        if (state.popup) {
          instance.setPopup(
            new maplibre.Popup({ closeButton: false, offset: 20 }).setDOMContent(state.popup),
          );
        }

        handleClick = (event: MouseEvent) => {
          if (!props.onClick) return;
          event.stopPropagation();
          props.onClick(event);
        };
        handleDragStart = (event: unknown) => props.onDragStart?.(event);
        handleDrag = (event: unknown) => {
          if (props.constrainDrag && instance) {
            const lngLat = instance.getLngLat();
            instance.setLngLat(props.constrainDrag([lngLat.lng, lngLat.lat]));
          }
          props.onDrag?.(event);
        };
        handleDragEnd = (event: unknown) => props.onDragEnd?.(event);

        instance.getElement().addEventListener("click", handleClick);
        instance.on("dragstart", handleDragStart);
        instance.on("drag", handleDrag);
        instance.on("dragend", handleDragEnd);
        setMarker(instance);
        props.onReady?.(instance);
      });

      return () => {
        cancelled = true;
        if (instance) {
          if (handleClick) {
            instance.getElement().removeEventListener("click", handleClick);
          }
          if (handleDragStart) instance.off("dragstart", handleDragStart);
          if (handleDrag) instance.off("drag", handleDrag);
          if (handleDragEnd) instance.off("dragend", handleDragEnd);
          instance.remove();
        }
        disposeChildren?.();
        setMarker(undefined);
      };
    },
  );

  createEffect(
    () => ({ lngLat: props.lngLat, marker: marker() }),
    (state) => {
      state.marker?.setLngLat(state.lngLat);
    },
  );

  createEffect(
    () => ({ clickable: Boolean(props.onClick), marker: marker() }),
    (state) => {
      if (state.marker) {
        state.marker.getElement().style.cursor = state.clickable ? "pointer" : "";
      }
    },
  );

  return null;
}
