import { renderToString } from "@solidjs/web";
import { createComponent } from "solid-js";
import * as mapModule from "../src/map/index.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Import the public map module under Bun's server conditions with no DOM globals. */
export default async function runMapSsrSpec() {
  assert(typeof document === "undefined", "SSR smoke test unexpectedly has a document global");
  assert(typeof window === "undefined", "SSR smoke test unexpectedly has a window global");

  assert(typeof mapModule.MapBox === "function", "MapBox was not exported by the map module");
  assert(typeof mapModule.Control.Navigation === "function", "Controls were not exported");
  assert(typeof mapModule.DrawTool === "function", "DrawTool was not exported");
  assert(typeof mapModule.LineMarkerTool === "function", "LineMarkerTool was not exported");
  assert(typeof mapModule.Marker === "function", "Marker was not exported by the map module");
  assert(typeof mapModule.Popup === "function", "Popup was not exported by the map module");
  assert(typeof mapModule.RadiusTool === "function", "RadiusTool was not exported");
  assert(typeof mapModule.Source === "function", "Source was not exported by the map module");
  assert(typeof mapModule.Layer === "function", "Layer was not exported by the map module");

  const html = renderToString(() =>
    createComponent(mapModule.MapBox, {
      placeholder: "Preparing server-rendered map",
      style: { height: "1px" },
    }),
  );
  assert(html.includes("data-xgx-map-root"), "MapBox did not render its server-safe root");
  assert(html.includes("Preparing server-rendered map"), "MapBox omitted its SSR placeholder");
}
