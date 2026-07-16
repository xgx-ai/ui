import { lineSplit, lineString, point } from "@turf/turf";

export type DrawToolCoordinate = [number, number];
export type DrawToolMode = "geometry" | "line";

const COORDINATE_EPSILON = 1e-10;

function coordinatesMatch(left: DrawToolCoordinate, right: DrawToolCoordinate): boolean {
  return (
    Math.abs(left[0] - right[0]) <= COORDINATE_EPSILON &&
    Math.abs(left[1] - right[1]) <= COORDINATE_EPSILON
  );
}

export function insertCoordinateIntoDrawLine(
  points: DrawToolCoordinate[],
  coordinate: DrawToolCoordinate,
  mode: DrawToolMode,
): DrawToolCoordinate[] | null {
  if (points.length < 2) return null;

  const closesGeometry = mode === "geometry";
  const geometryPoints = closesGeometry ? [...points, points[0]!] : points;
  const { features } = lineSplit(lineString(geometryPoints), point(coordinate));
  if (features.length < 2) return null;

  const updatedMarkers: DrawToolCoordinate[] = [];
  for (const [featureIndex, feature] of features.entries()) {
    const coordinates = feature.geometry.coordinates as DrawToolCoordinate[];
    for (const item of coordinates) {
      const previous = updatedMarkers.at(-1);
      if (featureIndex > 0 && previous && coordinatesMatch(previous, item)) {
        continue;
      }
      updatedMarkers.push([item[0], item[1]]);
    }
  }

  const first = updatedMarkers[0];
  const last = updatedMarkers.at(-1);
  if (closesGeometry && first && last && coordinatesMatch(first, last)) {
    updatedMarkers.pop();
  }
  return updatedMarkers.length > points.length ? updatedMarkers : null;
}
