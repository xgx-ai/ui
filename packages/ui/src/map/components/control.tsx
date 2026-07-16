import type { JSX } from "@solidjs/web";
import { render } from "@solidjs/web";
import type { CarmenGeojsonFeature, MaplibreGeocoderApi } from "@maplibre/maplibre-gl-geocoder";
import type { IControl } from "maplibre-gl";
import { createEffect } from "solid-js";
import { useMapContext } from "./map";

export type ControlPosition = "bottom-left" | "bottom-right" | "top-left" | "top-right";

export interface ControlProps {
  children?: JSX.Element;
  options?: Record<string, unknown>;
  position?: ControlPosition;
}

export interface ButtonControlProps extends Omit<ControlProps, "options"> {
  label: string;
  onClick: () => void;
  title?: string;
}

export interface GeocoderControlProps extends Omit<ControlProps, "options"> {
  collapsed?: boolean;
  countries?: string;
  flyTo?: boolean;
  /** Provider implementation supplied by the consuming application. */
  geocoderApi: MaplibreGeocoderApi;
  marker?: boolean;
  onResult?: (event: {
    result: CarmenGeojsonFeature & {
      center?: [number, number];
      place_name?: string;
      text?: string;
    };
  }) => void;
  placeholder?: string;
  types?: string;
}

type ControlType = "attribution" | "fullscreen" | "geolocate" | "navigation" | "scale";

async function getControlClass(type: ControlType) {
  const maplibre = await import("maplibre-gl");
  return {
    attribution: maplibre.AttributionControl,
    fullscreen: maplibre.FullscreenControl,
    geolocate: maplibre.GeolocateControl,
    navigation: maplibre.NavigationControl,
    scale: maplibre.ScaleControl,
  }[type];
}

function createControl(type: ControlType) {
  return function MapControl(props: ControlProps) {
    const { map } = useMapContext();

    createEffect(
      () => ({ map: map(), options: props.options, position: props.position }),
      (state) => {
        if (!state.map) return;
        let cancelled = false;
        let control: IControl | undefined;

        void getControlClass(type).then((ControlClass) => {
          if (cancelled || !state.map) return;
          control = new ControlClass(state.options as never);
          state.map.addControl(control, state.position);
        });

        return () => {
          cancelled = true;
          if (control && state.map?.hasControl(control)) {
            state.map.removeControl(control);
          }
        };
      },
    );

    return <>{props.children}</>;
  };
}

function ButtonControl(props: ButtonControlProps): null {
  const { map } = useMapContext();

  createEffect(
    () => ({ map: map(), position: props.position }),
    (state) => {
      if (!state.map) return;
      let disposeChildren: (() => void) | undefined;
      let container: HTMLDivElement | undefined;

      const handleClick = (event: MouseEvent) => {
        event.preventDefault();
        props.onClick();
      };
      const control: IControl = {
        onAdd: () => {
          container = document.createElement("div");
          container.className = "maplibregl-ctrl maplibregl-ctrl-group";
          const button = document.createElement("button");
          button.type = "button";
          button.title = props.title ?? props.label;
          button.setAttribute("aria-label", props.label);
          button.addEventListener("click", handleClick);
          disposeChildren = render(() => props.children ?? props.label, button);
          container.append(button);
          return container;
        },
        onRemove: () => {
          const button = container?.querySelector("button");
          button?.removeEventListener("click", handleClick);
          disposeChildren?.();
          disposeChildren = undefined;
          container?.remove();
          container = undefined;
        },
      };

      state.map.addControl(control, state.position);
      return () => {
        if (state.map?.hasControl(control)) state.map.removeControl(control);
      };
    },
  );

  return null;
}

function GeocoderControl(props: GeocoderControlProps): null {
  const { map } = useMapContext();

  createEffect(
    () => ({
      collapsed: props.collapsed,
      countries: props.countries,
      flyTo: props.flyTo,
      geocoderApi: props.geocoderApi,
      map: map(),
      marker: props.marker,
      onResult: props.onResult,
      placeholder: props.placeholder,
      position: props.position,
      types: props.types,
    }),
    (state) => {
      if (!state.map) return;
      let cancelled = false;
      let geocoder: IControl | undefined;
      let removeResultListener: (() => void) | undefined;

      void Promise.all([import("@maplibre/maplibre-gl-geocoder"), import("maplibre-gl")]).then(
        ([geocoderModule, maplibre]) => {
          if (cancelled || !state.map) return;
          const Geocoder = geocoderModule.default;
          const instance = new Geocoder(state.geocoderApi, {
            collapsed: state.collapsed ?? false,
            countries: state.countries,
            flyTo: state.flyTo ?? true,
            maplibregl: maplibre,
            marker: state.marker ?? false,
            placeholder: state.placeholder ?? "Search for a place…",
            types: state.types,
          });
          geocoder = instance as IControl;
          state.map.addControl(geocoder, state.position ?? "top-left");

          if (state.onResult) {
            instance.on("result", state.onResult as never);
            removeResultListener = () => instance.off("result", state.onResult as never);
          }
        },
      );

      return () => {
        cancelled = true;
        removeResultListener?.();
        if (geocoder && state.map?.hasControl(geocoder)) {
          state.map.removeControl(geocoder);
        }
      };
    },
  );

  return null;
}

export const Control = {
  Attribution: createControl("attribution"),
  Button: ButtonControl,
  Fullscreen: createControl("fullscreen"),
  Geocoder: GeocoderControl,
  Geolocate: createControl("geolocate"),
  Navigation: createControl("navigation"),
  Scale: createControl("scale"),
};
