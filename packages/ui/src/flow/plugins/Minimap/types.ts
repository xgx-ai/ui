// @ts-nocheck
import type { PanelPosition } from "@xyflow/system";
import type { Component } from "solid-js";
import type { Node } from "../../types";
import type { JSX } from "@solidjs/web";

export type GetMiniMapNodeAttribute = (node: Node) => string;

export type MiniMapNodeProps = {
	id: string;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	borderRadius?: number;
	class?: string;
	color?: string;
	shapeRendering?: string;
	strokeColor?: string;
	strokeWidth?: number;
	selected?: boolean;
};

export type MiniMapProps = {
	bgColor?: string;
	nodeColor?: string | GetMiniMapNodeAttribute;
	nodeStrokeColor?: string | GetMiniMapNodeAttribute;
	nodeClass?: string | GetMiniMapNodeAttribute;
	nodeBorderRadius?: number;
	nodeStrokeWidth?: number;
	nodeComponent?: Component<MiniMapNodeProps>;
	maskColor?: string;
	maskStrokeColor?: string;
	maskStrokeWidth?: number;
	position?: PanelPosition;
	class?: string;
	style?: string;
	ariaLabel?: string | null;
	width?: number;
	height?: number;
	pannable?: boolean;
	zoomable?: boolean;
	inversePan?: boolean;
	zoomStep?: number;
} & JSX.HTMLAttributes<HTMLDivElement>;
