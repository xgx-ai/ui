import { Position } from "@xyflow/system";
import type { NodeProps } from "../../types";
import { Handle } from "../Handle";

export function DefaultNode(props: NodeProps) {
	return (
		<>
			<Handle type="target" position={props.targetPosition ?? Position.Top} />
			{props.data?.label}
			<Handle
				type="source"
				position={props.sourcePosition ?? Position.Bottom}
			/>
		</>
	);
}
