import type { OnMove, OnMoveEnd, OnMoveStart, PanOnScrollMode, } from "@xyflow/system";
import type { JSX } from "@solidjs/web";

import type { SolidFlowStore } from "../../store/types";
import type { Edge, Node } from "../../types";

export type ZoomProps<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = {
	store: SolidFlowStore<NodeType, EdgeType>;
	panOnScrollMode: PanOnScrollMode;
	panOnScrollSpeed: number;
	preventScrolling: boolean;
	zoomOnScroll: boolean;
	zoomOnDoubleClick: boolean;
	zoomOnPinch: boolean;
	panOnScroll: boolean;
	panOnDrag: boolean | number[];
	paneClickDistance: number;
	selectionOnDrag?: boolean;
	onmove?: OnMove;
	onmovestart?: OnMoveStart;
	onmoveend?: OnMoveEnd;
	oninit?: () => void;
	children: JSX.Element;
};
