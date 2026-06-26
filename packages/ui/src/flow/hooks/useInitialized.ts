// @ts-nocheck
import { useStore } from "./useStore";

export function useNodesInitialized() {
	const store = useStore();
	return {
		get current() {
			return store.nodesInitialized;
		},
	};
}

export function useViewportInitialized() {
	const store = useStore();
	return {
		get current() {
			return store.viewportInitialized;
		},
	};
}
