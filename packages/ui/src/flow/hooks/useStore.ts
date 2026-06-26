// @ts-nocheck
import { useContext } from "solid-js";
import { StoreContextObj } from "../store";
import type { SolidFlowStore, StoreContext } from "../store/types";
import type { Edge, Node } from "../types";

export function useStore<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
>(): SolidFlowStore<NodeType, EdgeType> {
	const storeContext = useContext(StoreContextObj) as
		| StoreContext<NodeType, EdgeType>
		| undefined;

	if (!storeContext) {
		throw new Error(
			"To call useStore outside of <SolidFlow /> you need to wrap your component in a <SolidFlowProvider />",
		);
	}

	return storeContext.getStore();
}
