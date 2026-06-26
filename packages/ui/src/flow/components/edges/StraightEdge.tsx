// @ts-nocheck
import { getStraightPath } from "@xyflow/system";
import { createMemo } from "solid-js";
import type { StraightEdgeProps } from "../../types";
import { BaseEdge } from "./BaseEdge";

export function StraightEdge(props: StraightEdgeProps) {
	const pathData = createMemo(() =>
		getStraightPath({
			sourceX: props.sourceX,
			sourceY: props.sourceY,
			targetX: props.targetX,
			targetY: props.targetY,
		}),
	);

	return (
		<BaseEdge
			id={props.id}
			path={pathData()[0]}
			labelX={pathData()[1]}
			labelY={pathData()[2]}
			label={props.label}
			labelStyle={props.labelStyle}
			markerStart={props.markerStart}
			markerEnd={props.markerEnd}
			interactionWidth={props.interactionWidth}
			style={props.style}
		/>
	);
}
