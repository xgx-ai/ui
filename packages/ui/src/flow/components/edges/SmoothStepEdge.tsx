// @ts-nocheck
import { getSmoothStepPath } from "@xyflow/system";
import { createMemo } from "solid-js";
import type { SmoothStepEdgeProps } from "../../types";
import { BaseEdge } from "./BaseEdge";

export function SmoothStepEdge(props: SmoothStepEdgeProps) {
	const pathData = createMemo(() =>
		getSmoothStepPath({
			sourceX: props.sourceX,
			sourceY: props.sourceY,
			targetX: props.targetX,
			targetY: props.targetY,
			sourcePosition: props.sourcePosition,
			targetPosition: props.targetPosition,
			borderRadius: props.pathOptions?.borderRadius,
			offset: props.pathOptions?.offset,
			stepPosition: props.pathOptions?.stepPosition,
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
