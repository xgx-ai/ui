export function splitProps<T extends object, K extends readonly (keyof T)[]>(
  props: T,
  keys: K,
): [Pick<T, K[number]>, Omit<T, K[number]>];
export function splitProps<T extends object>(
  props: T,
  ...keyGroups: readonly (readonly (keyof T)[])[]
): unknown[] {
  const omittedKeys = new Set<PropertyKey>();
  const splits = keyGroups.map((keys) => {
    const local: Record<PropertyKey, unknown> = {};
    const localKeys = new Set<PropertyKey>();
    const localOverrides = new Map<PropertyKey, unknown>();

    for (const key of keys) {
      if (localKeys.has(key)) continue;
      localKeys.add(key);
      omittedKeys.add(key);
      Object.defineProperty(local, key, {
        enumerable: true,
        configurable: true,
        get: () => (localOverrides.has(key) ? localOverrides.get(key) : props[key]),
        set: (value) => localOverrides.set(key, value),
      });
    }

    return local;
  });

  const others: Record<PropertyKey, unknown> = {};
  const otherOverrides = new Map<PropertyKey, unknown>();
  for (const key of Reflect.ownKeys(props)) {
    if (omittedKeys.has(key)) continue;
    Object.defineProperty(others, key, {
      enumerable: true,
      configurable: true,
      get: () => (otherOverrides.has(key) ? otherOverrides.get(key) : props[key as keyof T]),
      set: (value) => otherOverrides.set(key, value),
    });
  }

  return [...splits, others];
}
