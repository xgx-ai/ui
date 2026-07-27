import type { SolidFlowStore } from "../../store/types";
import type { Edge, InternalNode, Node } from "../../types";

export type ConnectableContext = {
	value: boolean;
};

export type NodeWrapperProps<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = {
	node: InternalNode<NodeType>;
	store: SolidFlowStore<NodeType, EdgeType>;
	nodeClickDistance?: number;
	resizeObserver?: ResizeObserver | null;
};
