// @ts-nocheck
import { createMemo } from "solid-js";
import { useStore } from "../../store";
import { getEdgeIdContext } from "../../store/context";
import { toPxString } from "../../utils";
import type { EdgeLabelProps } from "./types";
import { splitProps } from "../../utils/solid-compat";

export function EdgeLabel(allProps: EdgeLabelProps) {
	const [props, rest] = splitProps(allProps, [
		"x",
		"y",
		"width",
		"height",
		"selectEdgeOnClick",
		"transparent",
		"class",
		"children",
	]);

	const store = useStore();
	const edgeId = getEdgeIdContext(
		"EdgeLabel must be used within a Custom Edge component",
	);

	const z = createMemo(() => store.visible.edges.get(edgeId)?.zIndex);

	return (
		<div
			class={`xy-flow__edge-label ${props.transparent ? "transparent" : ""} ${props.class ?? ""}`}
			style={{
				cursor: props.selectEdgeOnClick ? "pointer" : undefined,
				transform: `translate(-50%, -50%) translate(${props.x ?? 0}px,${props.y ?? 0}px)`,
				"pointer-events": "all",
				width: toPxString(props.width),
				height: toPxString(props.height),
				"z-index": z(),
			}}
			tabindex="-1"
			onClick={() => {
				if (props.selectEdgeOnClick && edgeId)
					store.handleEdgeSelection(edgeId);
			}}
			{...rest}
		>
			{props.children}
		</div>
	);
}
