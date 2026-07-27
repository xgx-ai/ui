import type { ControlPosition, OnResize, OnResizeEnd, OnResizeStart, ResizeControlDirection, ResizeControlVariant, ShouldResize, } from "@xyflow/system";
import type { JSX } from "@solidjs/web";


export type NodeResizerProps = {
	nodeId?: string;
	color?: string;
	handleClass?: string;
	handleStyle?: string;
	lineClass?: string;
	lineStyle?: string;
	isVisible?: boolean;
	minWidth?: number;
	minHeight?: number;
	maxWidth?: number;
	maxHeight?: number;
	keepAspectRatio?: boolean;
	autoScale?: boolean;
	shouldResize?: ShouldResize;
	onResizeStart?: OnResizeStart;
	onResize?: OnResize;
	onResizeEnd?: OnResizeEnd;
	resizeDirection?: ResizeControlDirection;
} & JSX.HTMLAttributes<HTMLDivElement>;

export type ResizeControlProps = Pick<
	NodeResizerProps,
	| "color"
	| "minWidth"
	| "minHeight"
	| "maxWidth"
	| "maxHeight"
	| "keepAspectRatio"
	| "autoScale"
	| "shouldResize"
	| "onResizeStart"
	| "onResize"
	| "onResizeEnd"
	| "resizeDirection"
> & {
	position?: ControlPosition;
	variant?: ResizeControlVariant;
	nodeId?: string;
	children?: JSX.Element;
} & JSX.HTMLAttributes<HTMLDivElement>;
