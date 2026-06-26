// @ts-nocheck
import { Position } from "@xyflow/system";
import type { NodeProps } from "../../types";
import { Handle } from "../Handle";

export function InputNode(props: NodeProps) {
	return (
		<>
			{props.data?.label ?? "Node"}
			<Handle
				type="source"
				position={props.sourcePosition ?? Position.Bottom}
			/>
		</>
	);
}
