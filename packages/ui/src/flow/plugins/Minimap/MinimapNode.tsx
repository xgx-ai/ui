// @ts-nocheck
import { getNodeDimensions } from "@xyflow/system";
import type { Component } from "solid-js";
import { createMemo, Show } from "solid-js";
import { useInternalNode } from "../../hooks/useInternalNode";
import type { MiniMapNodeProps } from "./types";

type MinimapNodeInternalProps = MiniMapNodeProps & {
	nodeComponent?: Component<MiniMapNodeProps>;
};

export function MinimapNode(props: MinimapNodeInternalProps) {
	const internalNode = useInternalNode(props.id);

	const dims = createMemo(() => {
		if (!internalNode.current) {
			return { width: 0, height: 0, x: 0, y: 0 };
		}
		const { width, height } = getNodeDimensions(internalNode.current);
		return {
			width: props.width ?? width,
			height: props.height ?? height,
			x: props.x ?? internalNode.current.internals.positionAbsolute.x,
			y: props.y ?? internalNode.current.internals.positionAbsolute.y,
		};
	});

	return (
		<Show
			when={props.nodeComponent}
			fallback={
				<rect
					class={`xy-flow__minimap-node ${props.selected ? "selected" : ""} ${props.class ?? ""}`}
					x={dims().x}
					y={dims().y}
					rx={props.borderRadius ?? 5}
					ry={props.borderRadius ?? 5}
					width={dims().width}
					height={dims().height}
					style={{
						fill: props.color,
						stroke: props.strokeColor,
						"stroke-width": props.strokeWidth,
					}}
					shape-rendering={props.shapeRendering}
				/>
			}
		>
			{(() => {
				const CustomComponent = props.nodeComponent!;
				return (
					<CustomComponent
						id={props.id}
						x={dims().x}
						y={dims().y}
						width={dims().width}
						height={dims().height}
						borderRadius={props.borderRadius}
						class={props.class}
						color={props.color}
						shapeRendering={props.shapeRendering}
						strokeColor={props.strokeColor}
						strokeWidth={props.strokeWidth}
						selected={props.selected}
					/>
				);
			})()}
		</Show>
	);
}
