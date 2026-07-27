/**
 * Query key identity.
 *
 * A key is serialised to a string, and two keys are the same question when their strings
 * match. The rules are fixed and tested in `test/key-identity.test.ts`, because identity is
 * what decides whether a request is deduplicated, cached, invalidated or orphaned.
 */

export type QueryKey = readonly unknown[];

export function queryKey(...parts: unknown[]): QueryKey {
  return parts;
}

export function serialiseQueryKeyPart(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "undefined":
      return "undefined";
    case "boolean":
      return value ? "boolean:true" : "boolean:false";
    case "number":
      if (Number.isNaN(value)) return "number:NaN";
      if (Object.is(value, -0)) return "number:-0";
      return `number:${value}`;
    case "bigint":
      return `bigint:${value}`;
    case "string":
      return `string:${JSON.stringify(value)}`;
    case "function":
    case "symbol":
      throw new TypeError("Query keys must contain serialisable values.");
    case "object": {
      if (seen.has(value)) throw new TypeError("Query keys cannot contain circular values.");
      seen.add(value);

      let result: string;
      if (Array.isArray(value)) {
        // Array position is significant: [a, b] and [b, a] are different questions. A
        // normaliser sorts before building the key when order is semantically irrelevant.
        result = `[${value.map((item) => serialiseQueryKeyPart(item, seen)).join(",")}]`;
      } else if (value instanceof Date) {
        result = `date:${value.toISOString()}`;
      } else {
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) {
          throw new TypeError("Query keys may only contain arrays, dates, and plain objects.");
        }
        const record = value as Record<string, unknown>;
        // An `undefined` property is equivalent to an omitted one, matching TanStack Query.
        // Without this a normaliser that emits `{ clientId: undefined }` splits the cache
        // against one that omits the key, for the same question. Note this is a property
        // rule only: a positional `undefined` in the key array stays distinct, because
        // dropping it would shift every part after it.
        const body = Object.keys(record)
          .filter((key) => record[key] !== undefined)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${serialiseQueryKeyPart(record[key], seen)}`)
          .join(",");
        result = `{${body}}`;
      }

      seen.delete(value);
      return result;
    }
  }

  throw new TypeError("Unsupported query key value.");
}

export function stableQueryKey(key: QueryKey): string {
  return serialiseQueryKeyPart(key);
}

export function queryKeyStartsWith(key: QueryKey, prefix: QueryKey): boolean {
  if (prefix.length > key.length) return false;
  return prefix.every(
    (part, index) => serialiseQueryKeyPart(part) === serialiseQueryKeyPart(key[index]),
  );
}
