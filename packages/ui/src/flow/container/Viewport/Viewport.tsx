import type { JSX } from "@solidjs/web";

import type { SolidFlowStore } from "../../store/types";
import type { Edge, Node } from "../../types";

type ViewportProps<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = {
	store: SolidFlowStore<NodeType, EdgeType>;
	children: JSX.Element;
};

export function Viewport<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
>(props: ViewportProps<NodeType, EdgeType>) {
	return (
		<div
			class="xy-flow__viewport xyflow__viewport xy-flow__container"
			style={{
				transform: `translate(${props.store.viewport.x}px, ${props.store.viewport.y}px) scale(${props.store.viewport.zoom})`,
			}}
		>
			{props.children}
		</div>
	);
}
