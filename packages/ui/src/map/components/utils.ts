import { bbox, feature as turfFeature } from "@turf/turf";
import type { LngLatBoundsLike, Map as MaplibreMap, PaddingOptions } from "maplibre-gl";

export interface GeocoderCoordinateResult {
  address: string;
  bbox: number[];
  center: [number, number];
  context: never[];
  geometry: { coordinates: [number, number]; type: "Point" };
  id: string;
  place_name: string;
  place_type: ["place"];
  properties: Record<string, never>;
  relevance: 1;
  text: string;
  type: "Feature";
}

export function geocoderLngLat(query: string): GeocoderCoordinateResult[] {
  const [latString, lngString, ...rest] = query.split(",");
  if (
    rest.length > 0 ||
    latString === undefined ||
    lngString === undefined ||
    Number.isNaN(Number(latString)) ||
    Number.isNaN(Number(lngString))
  ) {
    return [];
  }

  const latitude = Number.parseFloat(latString);
  const longitude = Number.parseFloat(lngString);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return [];
  }

  const padding = 0.005;
  return [
    {
      address: "Coordinates (lat, lng)",
      bbox: [longitude - padding, latitude - padding, longitude + padding, latitude + padding],
      center: [longitude, latitude],
      context: [],
      geometry: { coordinates: [longitude, latitude], type: "Point" },
      id: "coordinates",
      place_name: `Coordinates, ${latitude}, ${longitude}`,
      place_type: ["place"],
      properties: {},
      relevance: 1,
      text: `${latitude}, ${longitude}`,
      type: "Feature",
    },
  ];
}

export interface FitMapOptions {
  maxZoom?: number;
  padding?: number | PaddingOptions;
}

export function fitMapToGeoJSON(
  map: MaplibreMap | undefined,
  geojson: GeoJSON.Feature | GeoJSON.FeatureCollection | GeoJSON.Geometry | null | undefined,
  options?: FitMapOptions,
) {
  if (!map || !geojson) return;

  const value =
    geojson.type === "FeatureCollection" || geojson.type === "Feature"
      ? geojson
      : turfFeature(geojson);
  const [west, south, east, north] = bbox(value);
  const bounds: LngLatBoundsLike = [
    [west, south],
    [east, north],
  ];
  map.fitBounds(bounds, {
    maxZoom: options?.maxZoom ?? 17,
    padding: options?.padding ?? 80,
  });
}

export function fitMapToPoints(
  map: MaplibreMap | undefined,
  points: Array<[number, number]>,
  options?: FitMapOptions,
) {
  if (!map || points.length === 0) return;
  if (points.length === 1) {
    map.flyTo({ center: points[0], zoom: options?.maxZoom ?? 14 });
    return;
  }

  fitMapToGeoJSON(
    map,
    {
      features: points.map((coordinates) => ({
        geometry: { coordinates, type: "Point" },
        properties: {},
        type: "Feature",
      })),
      type: "FeatureCollection",
    },
    options,
  );
}
