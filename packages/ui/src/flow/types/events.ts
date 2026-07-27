import type { Edge } from "./edges";
import type { Node } from "./nodes";

export type NodeEventWithPointer<
	T = PointerEvent,
	NodeType extends Node = Node,
> = ({ node, event }: { node: NodeType; event: T }) => void;

export type NodesEventWithPointer<
	T = PointerEvent,
	NodeType extends Node = Node,
> = ({ nodes, event }: { nodes: NodeType[]; event: T }) => void;

export type NodeTargetEventWithPointer<
	T = PointerEvent,
	NodeType extends Node = Node,
> = ({
	targetNode,
	nodes,
	event,
}: {
	targetNode: NodeType | null;
	nodes: NodeType[];
	event: T;
}) => void;

export type NodeEvents<NodeType extends Node = Node> = {
	onNodeClick?: NodeEventWithPointer<MouseEvent | TouchEvent, NodeType>;
	onNodeContextMenu?: NodeEventWithPointer<MouseEvent, NodeType>;
	onNodeDrag?: NodeTargetEventWithPointer<MouseEvent | TouchEvent, NodeType>;
	onNodeDragStart?: NodeTargetEventWithPointer<
		MouseEvent | TouchEvent,
		NodeType
	>;
	onNodeDragStop?: NodeTargetEventWithPointer<
		MouseEvent | TouchEvent,
		NodeType
	>;
	onNodePointerEnter?: NodeEventWithPointer<PointerEvent, NodeType>;
	onNodePointerLeave?: NodeEventWithPointer<PointerEvent, NodeType>;
	onNodePointerMove?: NodeEventWithPointer<PointerEvent, NodeType>;
};

export type NodeSelectionEvents<NodeType extends Node = Node> = {
	onSelectionContextMenu?: NodesEventWithPointer<MouseEvent, NodeType>;
	onSelectionClick?: NodesEventWithPointer<MouseEvent, NodeType>;
};

export type PaneEvents = {
	onPaneClick?: ({ event }: { event: MouseEvent }) => void;
	onPaneContextMenu?: ({ event }: { event: MouseEvent }) => void;
};

export type EdgeEvents<EdgeType extends Edge = Edge> = {
	onEdgeClick?: ({
		edge,
		event,
	}: {
		edge: EdgeType;
		event: MouseEvent;
	}) => void;
	onEdgeContextMenu?: ({
		edge,
		event,
	}: {
		edge: EdgeType;
		event: MouseEvent;
	}) => void;
	onEdgePointerEnter?: ({
		edge,
		event,
	}: {
		edge: EdgeType;
		event: PointerEvent;
	}) => void;
	onEdgePointerLeave?: ({
		edge,
		event,
	}: {
		edge: EdgeType;
		event: PointerEvent;
	}) => void;
};

export type OnSelectionDrag<NodeType extends Node = Node> = (
	event: MouseEvent,
	nodes: NodeType[],
) => void;
