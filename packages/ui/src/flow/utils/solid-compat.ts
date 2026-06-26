// @ts-nocheck
export function batch<T>(fn: () => T): T {
	return fn();
}

export function splitProps<T extends Record<string, any>, K extends keyof T>(
	props: T,
	keys: readonly K[],
): [Pick<T, K>, Omit<T, K>] {
	const picked: Partial<Pick<T, K>> = {};
	const rest: Partial<Omit<T, K>> = {};
	const keySet = new Set<PropertyKey>(keys);

	for (const key of keys) {
		picked[key] = props[key];
	}

	for (const key of Object.keys(props) as Array<keyof T>) {
		if (!keySet.has(key)) {
			(rest as any)[key] = props[key];
		}
	}

	return [picked as Pick<T, K>, rest as Omit<T, K>];
}
