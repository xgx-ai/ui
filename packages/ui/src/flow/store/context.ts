// @ts-nocheck
import { createContext, useContext } from "solid-js";

export type ConnectableContext = {
	value: boolean;
};

/**
 * Creates a type-safe SolidJS context pair.
 * Equivalent of Svelte's createContext pattern.
 */
function createTypedContext<T>(): [
	{
		(errorMessage: string): T;
		(): T | undefined;
	},
	(value: T) => void,
	ReturnType<typeof createContext<T | undefined>>,
] {
	const Context = createContext<T | undefined>(undefined);
	let _setter: ((value: T) => void) | undefined;

	const getter = (errorMessage?: string) => {
		const value = useContext(Context);
		if (errorMessage && value === undefined) {
			throw new Error(errorMessage);
		}
		return value as T;
	};

	const setter = (value: T) => {
		// In SolidJS, context values are provided via <Context.Provider value={...}>
		// The setter is used during component setup to prepare the value
		_setter?.(value);
	};

	return [getter as any, setter, Context];
}

export const [getNodeIdContext, setNodeIdContext, NodeIdContext] =
	createTypedContext<string>();
export const [
	getNodeConnectableContext,
	setNodeConnectableContext,
	NodeConnectableContext,
] = createTypedContext<ConnectableContext>();

export const [getEdgeIdContext, setEdgeIdContext, EdgeIdContext] =
	createTypedContext<string>();
