// @ts-nocheck
import type { Align, Position } from "@xyflow/system";
import type { JSX } from "@solidjs/web";


export type NodeToolbarProps = {
	nodeId?: string | string[];
	position?: Position;
	align?: Align;
	offset?: number;
	isVisible?: boolean;
	children?: JSX.Element;
} & JSX.HTMLAttributes<HTMLDivElement>;
