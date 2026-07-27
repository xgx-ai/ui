import { Position } from "@xyflow/system";
import type { NodeProps } from "../../types";
import { Handle } from "../Handle";

export function OutputNode(props: NodeProps) {
	return (
		<>
			{props.data?.label ?? "Node"}
			<Handle type="target" position={props.targetPosition ?? Position.Top} />
		</>
	);
}
