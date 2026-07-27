import type { EdgeChange } from "@xyflow/system";
import { type Accessor, createSignal, type Setter } from "solid-js";
import type { Edge } from "../types";
import { applyEdgeChanges } from "../utils/changes";

export type OnEdgesChange<EdgeType extends Edge = Edge> = (
	changes: EdgeChange<EdgeType>[],
) => void;

export function useEdgesState<EdgeType extends Edge = Edge>(
	initialEdges: EdgeType[],
): [
	edges: Accessor<EdgeType[]>,
	setEdges: Setter<EdgeType[]>,
	onEdgesChange: OnEdgesChange<EdgeType>,
] {
	const [edges, setEdges] = createSignal<EdgeType[]>(initialEdges);
	const onEdgesChange: OnEdgesChange<EdgeType> = (changes) =>
		setEdges((eds) => applyEdgeChanges(changes, eds) as EdgeType[]);

	return [edges, setEdges, onEdgesChange];
}
