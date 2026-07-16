import { along, length, lineString, nearestPointOnLine, point } from "@turf/turf";

export type LineMarkerCoordinate = [number, number];
export const LINE_MARKER_EPSILON = 1e-6;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function isLineValid(line: LineMarkerCoordinate[]): boolean {
  return line.length >= 2;
}

export function normaliseFractions(
  fractions: number[] | undefined,
  lockedEndpoints = true,
  epsilon = LINE_MARKER_EPSILON,
): number[] {
  const safeFractions = (fractions ?? [])
    .filter(Number.isFinite)
    .map((value) => clamp(value, 0, 1))
    .sort((left, right) => left - right);

  const deduped: number[] = [];
  for (const value of safeFractions) {
    const previous = deduped.at(-1);
    if (previous === undefined || Math.abs(previous - value) > epsilon) {
      deduped.push(value);
    }
  }

  if (!lockedEndpoints) return deduped;
  return [0, ...deduped.filter((value) => value > epsilon && value < 1 - epsilon), 1];
}

export function projectCoordinateToFraction(
  line: LineMarkerCoordinate[],
  coordinate: LineMarkerCoordinate,
): number {
  if (!isLineValid(line)) return 0;
  const feature = lineString(line);
  const lineLength = length(feature, { units: "kilometers" });
  if (!Number.isFinite(lineLength) || lineLength <= 0) return 0;

  const snapped = nearestPointOnLine(feature, point(coordinate), {
    units: "kilometers",
  });
  const location = Number(snapped.properties.location ?? 0);
  return clamp(location / lineLength, 0, 1);
}

export function fractionToCoordinate(
  line: LineMarkerCoordinate[],
  fraction: number,
): LineMarkerCoordinate | null {
  if (!isLineValid(line)) return null;
  const feature = lineString(line);
  const lineLength = length(feature, { units: "kilometers" });
  if (!Number.isFinite(lineLength) || lineLength <= 0) {
    const first = line[0];
    return first ? [first[0], first[1]] : null;
  }

  const snapped = along(feature, lineLength * clamp(fraction, 0, 1), {
    units: "kilometers",
  });
  const longitude = Number(snapped.geometry.coordinates[0]);
  const latitude = Number(snapped.geometry.coordinates[1]);
  return Number.isFinite(longitude) && Number.isFinite(latitude) ? [longitude, latitude] : null;
}

export function clampFractionBetweenNeighbours(
  fractions: number[],
  index: number,
  value: number,
): number {
  return clamp(value, fractions[index - 1] ?? 0, fractions[index + 1] ?? 1);
}

export function isLockedFractionIndex(
  index: number,
  count: number,
  lockedEndpoints: boolean,
): boolean {
  return lockedEndpoints && (index === 0 || index === count - 1);
}

export function reorderFractionForDrag(
  fractions: number[],
  index: number,
  value: number,
  lockedEndpoints = true,
  epsilon = LINE_MARKER_EPSILON,
): { fractions: number[]; index: number } {
  if (
    index < 0 ||
    index >= fractions.length ||
    isLockedFractionIndex(index, fractions.length, lockedEndpoints)
  ) {
    return { fractions: [...fractions], index };
  }

  const next = [...fractions];
  next.splice(index, 1);
  const clampedValue = clamp(value, 0, 1);
  let nextIndex = next.findIndex((fraction) => fraction > clampedValue);
  if (nextIndex < 0) nextIndex = next.length;
  if (lockedEndpoints && next.length >= 2) {
    nextIndex = clamp(nextIndex, 1, next.length - 1);
  }

  const previous = next[nextIndex - 1];
  const following = next[nextIndex];
  const lowerBound = previous === undefined ? 0 : previous + epsilon * 2;
  const upperBound = following === undefined ? 1 : following - epsilon * 2;
  const adjusted =
    lowerBound > upperBound && previous !== undefined && following !== undefined
      ? (previous + following) / 2
      : clamp(clampedValue, lowerBound, upperBound);
  next.splice(nextIndex, 0, adjusted);
  return { fractions: next, index: nextIndex };
}

export function insertFraction(
  fractions: number[],
  value: number,
  lockedEndpoints = true,
  epsilon = LINE_MARKER_EPSILON,
): { fractions: number[]; index: number; inserted: boolean } {
  const clamped = clamp(value, 0, 1);
  if (lockedEndpoints && (clamped <= epsilon || clamped >= 1 - epsilon)) {
    return {
      fractions: [...fractions],
      index: clamped <= epsilon ? 0 : Math.max(fractions.length - 1, 0),
      inserted: false,
    };
  }

  const existingIndex = fractions.findIndex((fraction) => Math.abs(fraction - clamped) <= epsilon);
  if (existingIndex >= 0) {
    return { fractions: [...fractions], index: existingIndex, inserted: false };
  }

  let index = fractions.findIndex((fraction) => fraction > clamped);
  if (index < 0) index = fractions.length;
  const next = [...fractions];
  next.splice(index, 0, clamped);
  return { fractions: next, index, inserted: true };
}

export function removeFractionAtIndex(
  fractions: number[],
  index: number,
  lockedEndpoints = true,
): number[] {
  if (
    index < 0 ||
    index >= fractions.length ||
    isLockedFractionIndex(index, fractions.length, lockedEndpoints)
  ) {
    return [...fractions];
  }
  const next = [...fractions];
  next.splice(index, 1);
  return next;
}
