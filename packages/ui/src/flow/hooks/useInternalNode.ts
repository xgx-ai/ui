import { createMemo } from "solid-js";
import type { InternalNode } from "../types";
import { useStore } from "./useStore";

export function useInternalNode(id: string): {
	readonly current: InternalNode | undefined;
} {
	const store = useStore();

	const node = createMemo(() => {
		// Access nodes to track changes
		store.nodes;
		return store.nodeLookup.get(id);
	});

	return {
		get current() {
			return node();
		},
	};
}
