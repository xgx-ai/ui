// @ts-nocheck
import type { JSX } from "@solidjs/web";


export type EdgeLabelProps = {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	selectEdgeOnClick?: boolean;
	transparent?: boolean;
	children?: JSX.Element;
} & JSX.HTMLAttributes<HTMLDivElement>;
