// @ts-nocheck
import { splitProps } from "../../utils/solid-compat";

import type { PanelProps } from "./types";

export function Panel(allProps: PanelProps) {
	const [props, rest] = splitProps(allProps, [
		"position",
		"style",
		"class",
		"children",
	]);

	const positionClasses = () =>
		`${props.position ?? "top-right"}`.split("-").join(" ");

	return (
		<div
			class={`xy-flow__panel ${positionClasses()} ${props.class ?? ""}`}
			style={props.style}
			{...rest}
		>
			{props.children}
		</div>
	);
}
