import { ResizeControlVariant, XY_RESIZER_HANDLE_POSITIONS, XY_RESIZER_LINE_POSITIONS, } from "@xyflow/system";
import { For, Show } from "solid-js";
import { ResizeControl } from "./ResizeControl";
import type { NodeResizerProps } from "./types";

export function NodeResizer(props: NodeResizerProps) {
	return (
		<Show when={props.isVisible ?? true}>
			<For each={XY_RESIZER_LINE_POSITIONS}>
				{(position) => (
					<ResizeControl
						class={props.lineClass}
						style={props.lineStyle}
						nodeId={props.nodeId}
						position={position}
						autoScale={props.autoScale ?? true}
						variant={ResizeControlVariant.Line}
						color={props.color}
						minWidth={props.minWidth}
						minHeight={props.minHeight}
						maxWidth={props.maxWidth}
						maxHeight={props.maxHeight}
						keepAspectRatio={props.keepAspectRatio}
						shouldResize={props.shouldResize}
						onResizeStart={props.onResizeStart}
						onResize={props.onResize}
						onResizeEnd={props.onResizeEnd}
						resizeDirection={props.resizeDirection}
					/>
				)}
			</For>
			<For each={XY_RESIZER_HANDLE_POSITIONS}>
				{(position) => (
					<ResizeControl
						class={props.handleClass}
						style={props.handleStyle}
						nodeId={props.nodeId}
						position={position}
						autoScale={props.autoScale ?? true}
						color={props.color}
						minWidth={props.minWidth}
						minHeight={props.minHeight}
						maxWidth={props.maxWidth}
						maxHeight={props.maxHeight}
						keepAspectRatio={props.keepAspectRatio}
						shouldResize={props.shouldResize}
						onResizeStart={props.onResizeStart}
						onResize={props.onResize}
						onResizeEnd={props.onResizeEnd}
						resizeDirection={props.resizeDirection}
					/>
				)}
			</For>
		</Show>
	);
}
