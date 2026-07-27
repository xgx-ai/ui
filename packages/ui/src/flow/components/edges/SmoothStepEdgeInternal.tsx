import { getSmoothStepPath } from "@xyflow/system";
import type { EdgeProps } from "../../types";
import { BaseEdge } from "./BaseEdge";

export function SmoothStepEdgeInternal(props: EdgeProps) {
	const pathData = () =>
		getSmoothStepPath({
			sourceX: props.sourceX,
			sourceY: props.sourceY,
			targetX: props.targetX,
			targetY: props.targetY,
			sourcePosition: props.sourcePosition,
			targetPosition: props.targetPosition,
		});

	return (
		<BaseEdge
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
