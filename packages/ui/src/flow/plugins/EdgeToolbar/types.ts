import type { EdgeToolbarBaseProps } from "@xyflow/system";
import type { JSX } from "@solidjs/web";


export type EdgeToolbarProps = Omit<EdgeToolbarBaseProps, "edgeId"> & {
	selectEdgeOnClick?: boolean;
	children?: JSX.Element;
} & JSX.HTMLAttributes<HTMLDivElement>;
