// @ts-nocheck
import type { NodeChange } from "@xyflow/system";
import { type Accessor, createSignal, type Setter } from "solid-js";
import type { Node } from "../types";
import { applyNodeChanges } from "../utils/changes";

export type OnNodesChange<NodeType extends Node = Node> = (
	changes: NodeChange<NodeType>[],
) => void;

export function useNodesState<NodeType extends Node = Node>(
	initialNodes: NodeType[],
): [
	nodes: Accessor<NodeType[]>,
	setNodes: Setter<NodeType[]>,
	onNodesChange: OnNodesChange<NodeType>,
] {
	const [nodes, setNodes] = createSignal<NodeType[]>(initialNodes);
	const onNodesChange: OnNodesChange<NodeType> = (changes) =>
		setNodes((nds) => applyNodeChanges(changes, nds) as NodeType[]);

	return [nodes, setNodes, onNodesChange];
}
