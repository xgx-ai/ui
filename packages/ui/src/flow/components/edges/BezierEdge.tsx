import { getBezierPath } from "@xyflow/system";
import type { BezierEdgeProps } from "../../types";
import { BaseEdge } from "./BaseEdge";

export function BezierEdge(props: BezierEdgeProps) {
	const pathData = () =>
		getBezierPath({
			sourceX: props.sourceX,
			sourceY: props.sourceY,
			targetX: props.targetX,
			targetY: props.targetY,
			sourcePosition: props.sourcePosition,
			targetPosition: props.targetPosition,
			curvature: props.pathOptions?.curvature,
		});

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
