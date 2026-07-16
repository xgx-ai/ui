# MapLibre

`@xgx/ui/map` is a SolidJS v2-native declarative layer over MapLibre GL JS. It
is isolated from the root UI barrel so ordinary component imports do not bundle
MapLibre.

Import the component API and its styles explicitly:

```tsx
import { Control, Layer, MapBox, Marker, Source } from "@xgx/ui/map";
import "@xgx/ui/map/style.css";

<MapBox
  class="h-96"
  options={{
    center: [-0.1276, 51.5074],
    style: "https://demotiles.maplibre.org/style.json",
    zoom: 11,
  }}
>
  <Control.Navigation position="top-right" />
  <Marker lngLat={[-0.1276, 51.5074]} />
  <Source id="places" type="geojson" data={places()}>
    <Layer id="places-circle" type="circle" paint={{ "circle-radius": 6 }} />
  </Source>
</MapBox>;
```

`MapBox` delays initialisation until its container has dimensions, cleans up
asynchronous initialisation on disposal, and renders declarative children only
after the map has loaded. Supply `rtlTextPluginUrl` when the consuming app needs
the optional MapLibre RTL text plugin. Declarative sources, layers, images, sky,
terrain and feature state are restored after a later `map.setStyle(...)` call.

## Component surface

- `MapBox`, `MapProvider`, `MapContainer` and `useCreateMap` manage map ownership.
- `Source`, `Layer`, `Image`, `Sky` and `Terrain` manage style resources.
- `Marker`, `Popup` and `FeatureClickPopup` mount Solid content around MapLibre DOM.
- `Control` exposes MapLibre controls, a Solid button control and the geocoder.
- `DrawTool`, `RadiusTool` and `LineMarkerTool` provide interactive editing with
  Solid 2-safe undo and redo history.

Drawing-tool keyboard shortcuts are scoped to focus within their owning map.
Pass controlled values through `points`, `center`/`radius` or `fractions`, and use
the matching change callback to persist edits.

## Geocoding

`Control.Geocoder` requires an application-supplied `geocoderApi`; the shared
library does not embed a public geocoding provider or its usage policy. The
provider must implement MapLibre's `MaplibreGeocoderApi` interface.
