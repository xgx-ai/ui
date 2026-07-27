import { type DistributivePick, shallowNodeData } from "@xyflow/system";
import { createMemo } from "solid-js";

import type { Node } from "../types";
import { useStore } from "./useStore";

export function useNodesData<NodeType extends Node = Node>(
	nodeId: string,
): {
	readonly current: DistributivePick<NodeType, "id" | "data" | "type"> | null;
};
export function useNodesData<NodeType extends Node = Node>(
	nodeIds: string[],
): { readonly current: DistributivePick<NodeType, "id" | "data" | "type">[] };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useNodesData(nodeIds: any): any {
	const store = useStore();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let prevNodesData: any[] = [];
	let initialRun = true;

	const nodeData = createMemo(() => {
		// Access nodes to track changes
		store.nodes;
		const nextNodesData = [];
		const isArrayOfIds = Array.isArray(nodeIds);
		const _nodeIds = isArrayOfIds ? nodeIds : [nodeIds];

		for (const nodeId of _nodeIds) {
			const node = store.nodeLookup.get(nodeId)?.internals.userNode;
			if (node) {
				nextNodesData.push({
					id: node.id,
					type: node.type,
					data: node.data,
				});
			}
		}

		if (!shallowNodeData(nextNodesData, prevNodesData) || initialRun) {
			prevNodesData = nextNodesData;
			initialRun = false;
		}

		return isArrayOfIds ? prevNodesData : (prevNodesData[0] ?? null);
	});

	return {
		get current() {
			return nodeData();
		},
	};
}
