import { type MarkerProps, MarkerType } from "@xyflow/system";
import { Show } from "solid-js";

export function Marker(props: MarkerProps) {
	return (
		<marker
			class="xy-flow__arrowhead"
			id={props.id}
			markerWidth={`${props.width ?? 12.5}`}
			markerHeight={`${props.height ?? 12.5}`}
			viewBox="-10 -10 20 20"
			markerUnits={
				(props.markerUnits ?? "strokeWidth") as
					| "strokeWidth"
					| "userSpaceOnUse"
			}
			orient={props.orient ?? "auto-start-reverse"}
			refX="0"
			refY="0"
		>
			<Show when={props.type === MarkerType.Arrow}>
				<polyline
					class="arrow"
					style={{ stroke: props.color ?? "none" }}
					fill="none"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width={props.strokeWidth}
					points="-5,-4 0,0 -5,4"
				/>
			</Show>
			<Show when={props.type === MarkerType.ArrowClosed}>
				<polyline
					class="arrowclosed"
					style={{ stroke: props.color ?? "none", fill: props.color ?? "none" }}
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width={props.strokeWidth}
					points="-5,-4 0,0 -5,4 -5,-4"
				/>
			</Show>
		</marker>
	);
}
