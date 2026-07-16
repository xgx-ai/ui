import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";
import { MapProvider, type MapContext } from "./map";

export interface MapContainerProps {
  children?: JSX.Element;
  class?: JSX.HTMLAttributes<HTMLDivElement>["class"];
  id?: string;
  mapContext: MapContext;
  style?: JSX.CSSProperties;
}

/** Provides an existing `useCreateMap` context to declarative map children. */
export function MapContainer(props: MapContainerProps) {
  return (
    <div id={props.id} class={props.class} style={props.style}>
      <MapProvider value={props.mapContext}>
        <Show when={props.mapContext.map()}>{props.children}</Show>
      </MapProvider>
    </div>
  );
}
