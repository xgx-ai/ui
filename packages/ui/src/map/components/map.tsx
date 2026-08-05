import type { JSX } from "@solidjs/web";
import type { Map as MaplibreMap, MapOptions } from "maplibre-gl";
import {
  createContext,
  createEffect,
  createSignal,
  Show,
  untrack,
  useContext,
  type Accessor,
} from "solid-js";
import {
  mapEventEntries,
  type Cursor,
  type MapEventHandlerProps,
  type MapEventListener,
} from "../types";

export type MapBoxOptions = Omit<MapOptions, "container">;

export interface MapDebugOptions {
  collisionBoxes?: boolean;
  overdrawInspector?: boolean;
  padding?: boolean;
  terrainWireframe?: boolean;
  tileBoundaries?: boolean;
}

interface MapLifecycleProps {
  cursorStyle?: Cursor;
  debug?: MapDebugOptions;
  disableResize?: boolean;
  /** Event object used by wrappers that keep DOM props separate. */
  events?: MapEventHandlerProps;
  fly?: [number, number];
  onInitError?: (error: unknown) => void;
  options?: MapBoxOptions;
  /** Optional URL for MapLibre's RTL text plugin, or `false` to disable it. */
  rtlTextPluginUrl?: string | false;
}

export type MapBoxProps = MapLifecycleProps &
  MapEventHandlerProps & {
    children?: JSX.Element;
    class?: JSX.HTMLAttributes<HTMLDivElement>["class"];
    id?: string;
    placeholder?: JSX.Element;
    style?: JSX.CSSProperties;
  };

export type UseCreateMapProps = MapLifecycleProps &
  MapEventHandlerProps & {
    container: Accessor<HTMLDivElement | undefined>;
  };

export interface MapContext {
  container: Accessor<HTMLDivElement | undefined>;
  map: Accessor<MaplibreMap | undefined>;
  setCursor: (value: Cursor) => void;
  /** Increments whenever MapLibre finishes loading a replacement style. */
  styleRevision?: Accessor<number>;
  useMapEvent: (type: string, listener: MapEventListener) => void;
  zoom: Accessor<number | undefined>;
}

const MapContextInstance = createContext<MapContext>();

export function MapProvider(props: { children: JSX.Element; value: MapContext }) {
  return <MapContextInstance value={props.value}>{props.children}</MapContextInstance>;
}

export function useMapContext(): MapContext {
  const context = useContext(MapContextInstance);
  if (!context) {
    throw new Error("useMapContext must be used within MapBox or MapProvider");
  }
  return context;
}

/** @deprecated Use `useMapContext`. */
export const useMap = useMapContext;

function hasDimensions(element: HTMLDivElement): boolean {
  const bounds = element.getBoundingClientRect();
  return bounds.width > 0 && bounds.height > 0;
}

function debugLog(enabled: boolean, label: string, value: unknown) {
  if (enabled) console.debug(`[xgx/map] ${label}`, value);
}

export function useCreateMap(props: UseCreateMapProps): MapContext {
  const [map, setMap] = createSignal<MaplibreMap>();
  const [styleRevision, setStyleRevision] = createSignal(0);
  const [zoom, setZoom] = createSignal<number>();
  let mapInstance: MaplibreMap | undefined;

  createEffect(props.container, (container) => {
    if (!container || mapInstance) return;

    let cancelled = false;
    let initialising = false;
    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;
    let animationFrame: number | undefined;

    const cancelObservers = () => {
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    };

    const initialise = async () => {
      if (cancelled || initialising || mapInstance) return;
      initialising = true;
      cancelObservers();

      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled) return;

        const rtlTextPluginUrl = untrack(() => props.rtlTextPluginUrl);
        if (rtlTextPluginUrl && maplibre.getRTLTextPluginStatus() === "unavailable") {
          await maplibre.setRTLTextPlugin(rtlTextPluginUrl, true);
        }
        if (cancelled) return;

        const options = untrack(() => props.options) ?? {};
        const disableResize = untrack(() => props.disableResize) ?? false;
        const instance = new maplibre.Map({
          ...options,
          container,
          ...(disableResize ? { trackResize: false } : {}),
        });
        mapInstance = instance;

        const handleLoad = () => {
          if (cancelled || mapInstance !== instance) return;
          setMap(instance);
          setZoom(instance.getZoom());
        };

        instance.once("load", handleLoad);
        if (instance.loaded()) handleLoad();
      } catch (error) {
        initialising = false;
        if (!cancelled) {
          untrack(() => props.onInitError)?.(error);
          console.error("Failed to initialise MapLibre", error);
        }
      }
    };

    const scheduleInitialise = () => {
      if (cancelled || initialising || mapInstance) return;
      if (!hasDimensions(container)) {
        animationFrame = requestAnimationFrame(scheduleInitialise);
        return;
      }
      animationFrame = requestAnimationFrame(() => void initialise());
    };

    if (hasDimensions(container)) {
      animationFrame = requestAnimationFrame(() => void initialise());
    } else if (
      typeof ResizeObserver === "undefined" ||
      typeof IntersectionObserver === "undefined"
    ) {
      scheduleInitialise();
    } else {
      resizeObserver = new ResizeObserver(() => {
        if (hasDimensions(container)) void initialise();
      });
      intersectionObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting) && hasDimensions(container)) {
          void initialise();
        }
      });
      resizeObserver.observe(container);
      intersectionObserver.observe(container);
    }

    return () => {
      cancelled = true;
      cancelObservers();
      const instance = mapInstance;
      mapInstance = undefined;
      setMap(undefined);
      setStyleRevision(0);
      setZoom(undefined);
      instance?.remove();
    };
  });

  createEffect(
    () => ({
      handlers: mapEventEntries((props.events ?? props) as MapEventHandlerProps),
      map: map(),
    }),
    (state) => {
      if (!state.map) return;

      for (const [event, listener] of state.handlers) {
        // MapLibre's overloads cannot represent a runtime-derived event name.
        state.map.on(event as never, listener as never);
      }

      return () => {
        for (const [event, listener] of state.handlers) {
          state.map?.off(event as never, listener as never);
        }
      };
    },
  );

  createEffect(map, (instance) => {
    if (!instance) return;
    const updateZoom = () => setZoom(instance.getZoom());
    instance.on("zoom", updateZoom);
    instance.on("zoomend", updateZoom);
    updateZoom();
    return () => {
      instance.off("zoom", updateZoom);
      instance.off("zoomend", updateZoom);
    };
  });

  createEffect(map, (instance) => {
    if (!instance) return;
    const handleStyleLoad = () => setStyleRevision((value) => value + 1);
    instance.on("style.load", handleStyleLoad);
    return () => instance.off("style.load", handleStyleLoad);
  });

  createEffect(
    () => ({ debug: props.debug, map: map() }),
    (state) => {
      if (!state.map) return;
      const options = state.debug;
      state.map.showTileBoundaries = options?.tileBoundaries ?? false;
      state.map.showPadding = options?.padding ?? false;
      state.map.showCollisionBoxes = options?.collisionBoxes ?? false;
      state.map.showOverdrawInspector = options?.overdrawInspector ?? false;
      if ("showTerrainWireframe" in state.map) {
        (state.map as MaplibreMap & { showTerrainWireframe: boolean }).showTerrainWireframe =
          options?.terrainWireframe ?? false;
      }
    },
  );

  createEffect(
    () => ({
      cursor: props.cursorStyle,
      debug: Boolean(props.debug),
      map: map(),
    }),
    (state, previous) => {
      if (!state.map || state.cursor === undefined) return;
      if (state.cursor === previous?.cursor && state.map === previous.map) return;
      debugLog(state.debug, "cursor", state.cursor);
      state.map.getCanvas().style.cursor = state.cursor;
    },
  );

  createEffect(
    () => ({ fly: props.fly, map: map() }),
    (state, previous) => {
      if (!state.map || !state.fly) return;
      const changed =
        !previous?.fly ||
        state.fly[0] !== previous.fly[0] ||
        state.fly[1] !== previous.fly[1] ||
        state.map !== previous.map;
      if (changed) state.map.flyTo({ center: state.fly, zoom: 14 });
    },
  );

  function useMapEvent(type: string, listener: MapEventListener) {
    createEffect(map, (instance) => {
      if (!instance) return;
      instance.on(type as never, listener as never);
      return () => instance.off(type as never, listener as never);
    });
  }

  function setCursor(value: Cursor) {
    const instance = map();
    if (instance && value !== undefined) instance.getCanvas().style.cursor = value;
  }

  return {
    container: props.container,
    map,
    setCursor,
    styleRevision,
    useMapEvent,
    zoom,
  };
}

/**
 * Solid 2 MapLibre root. MapLibre owns the inner target element while Solid
 * owns placeholders and declarative map children in sibling DOM.
 */
export function MapBox(props: MapBoxProps) {
  const [mapTarget, setMapTarget] = createSignal<HTMLDivElement>();
  const mapContext = useCreateMap({
    container: mapTarget,
    get cursorStyle() {
      return props.cursorStyle;
    },
    get debug() {
      return props.debug;
    },
    get disableResize() {
      return props.disableResize;
    },
    get events() {
      return props;
    },
    get fly() {
      return props.fly;
    },
    get onInitError() {
      return props.onInitError;
    },
    get options() {
      return props.options;
    },
    get rtlTextPluginUrl() {
      return props.rtlTextPluginUrl;
    },
  });

  return (
    <div
      id={props.id}
      class={props.class}
      data-xgx-map-root=""
      style={{ position: "relative", ...props.style }}
    >
      <div
        ref={(element) => setMapTarget(element)}
        data-xgx-map-target=""
        style={{
          position: "absolute",
          inset: "0",
          width: "100%",
          height: "100%",
        }}
      />

      <MapProvider value={mapContext}>
        <Show when={!mapContext.map() && props.placeholder}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0",
              width: "100%",
              height: "100%",
            }}
          >
            {props.placeholder}
          </div>
        </Show>
        <Show when={mapContext.map()}>{props.children}</Show>
      </MapProvider>
    </div>
  );
}
