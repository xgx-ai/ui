// @ts-nocheck
import { ConnectionLineType, getBezierPath, getConnectionStatus, getSmoothStepPath, getStraightPath, } from "@xyflow/system";
import type { Component } from "solid-js";
import { createMemo, Show } from "solid-js";

import type { SolidFlowStore } from "../../store/types";
import type { Edge, Node } from "../../types";

type ConnectionLineProps<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = {
	store: SolidFlowStore<NodeType, EdgeType>;
	type: ConnectionLineType;
	containerStyle?: string;
	style?: string;
	LineComponent?: Component;
};

export function ConnectionLine<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
>(props: ConnectionLineProps<NodeType, EdgeType>) {
	const path = createMemo(() => {
		if (!props.store.connection.inProgress) {
			return "";
		}

		const conn = props.store.connection;
		const pathParams = {
			sourceX: conn.from.x,
			sourceY: conn.from.y,
			sourcePosition: conn.fromPosition,
			targetX: conn.to.x,
			targetY: conn.to.y,
			targetPosition: conn.toPosition ?? conn.fromPosition,
		};

		try {
			switch (props.type) {
				case ConnectionLineType.Straight: {
					const [p] = getStraightPath(pathParams);
					return p;
				}
				case ConnectionLineType.Step: {
					const [p] = getSmoothStepPath({ ...pathParams, borderRadius: 0 });
					return p;
				}
				case ConnectionLineType.SmoothStep: {
					const [p] = getSmoothStepPath(pathParams);
					return p;
				}
				case ConnectionLineType.Bezier:
				default: {
					const [p] = getBezierPath(pathParams);
					return p;
				}
			}
		} catch {
			// Fallback to straight line if path calculation fails
			return `M ${pathParams.sourceX} ${pathParams.sourceY} L ${pathParams.targetX} ${pathParams.targetY}`;
		}
	});

	return (
		<Show when={props.store.connection.inProgress}>
			<svg
				width={props.store.width}
				height={props.store.height}
				class="xy-flow__connectionline"
				style={props.containerStyle}
			>
				<g
					class={`xy-flow__connection ${getConnectionStatus(props.store.connection.isValid)}`}
				>
					<Show
						when={props.LineComponent}
						fallback={
							<path
								d={path()}
								style={props.style}
								fill="none"
								class="xy-flow__connection-path"
							/>
						}
					>
						{props.LineComponent && <props.LineComponent />}
					</Show>
				</g>
			</svg>
		</Show>
	);
}
