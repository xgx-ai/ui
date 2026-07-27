import { isEdgeBase, isNodeBase, type XYPosition } from "@xyflow/system";

import type { Edge, Node } from "../types";

export const isNode = <NodeType extends Node = Node>(
	element: unknown,
): element is NodeType => isNodeBase<NodeType>(element);

export const isEdge = <EdgeType extends Edge = Edge>(
	element: unknown,
): element is EdgeType => isEdgeBase<EdgeType>(element);

export function toPxString(value: number | undefined): string | undefined {
	return value === undefined ? undefined : `${value}px`;
}

export const arrowKeyDiffs: Record<string, XYPosition> = {
	ArrowUp: { x: 0, y: -1 },
	ArrowDown: { x: 0, y: 1 },
	ArrowLeft: { x: -1, y: 0 },
	ArrowRight: { x: 1, y: 0 },
};
