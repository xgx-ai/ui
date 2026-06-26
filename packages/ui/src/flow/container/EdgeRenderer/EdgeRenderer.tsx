// @ts-nocheck
import { getMarkerId } from "@xyflow/system";
import { createMemo, For, Show } from "solid-js";
import { BezierEdgeInternal } from "../../components/edges";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { EdgeIdContext } from "../../store/context";
import type { SolidFlowStore } from "../../store/types";
import type { Edge, EdgeEvents, EdgeLayouted, Node } from "../../types";
import { MarkerDefinition } from "./MarkerDefinition";

type EdgeRendererProps<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = {
	store: SolidFlowStore<NodeType, EdgeType>;
} & EdgeEvents<EdgeType>;

export function EdgeRenderer<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
>(props: EdgeRendererProps<NodeType, EdgeType>) {
	const edgeIds = () => {
		void props.store.nodes;
		void props.store.edges;
		return Array.from(props.store.visible.edges.keys());
	};

	return (
		<div class="xy-flow__edges">
			<svg class="xy-flow__marker">
				<MarkerDefinition />
			</svg>

			<For each={edgeIds()}>
				{(edgeId) => (
					<ReactiveEdge edgeId={edgeId} store={props.store} events={props} />
				)}
			</For>
		</div>
	);
}

/**
 * ReactiveEdge reads edge data inside a createMemo that subscribes
 * to store.nodes, ensuring edge positions update when nodes are dragged.
 */
function ReactiveEdge<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
>(props: {
	edgeId: string;
	store: SolidFlowStore<NodeType, EdgeType>;
	events: EdgeEvents<EdgeType>;
}) {
	const store = props.store;
	const id = props.edgeId;

	// This memo re-evaluates whenever nodes or edges change,
	// producing fresh edge position data for rendering.
	// We spread to create a new object so createMemo detects the change
	// (the Map stores mutated objects with the same reference).
	const edgeData = createMemo(
		() => {
			void store.nodes;
			void store.edges;
			const e = store.visible.edges.get(id);
			return e ? ({ ...e } as EdgeLayouted<EdgeType>) : undefined;
		},
		undefined,
		{ equals: false }, // always notify — edge objects are mutated in place
	);

	const selectable = () => edgeData()?.selectable ?? store.elementsSelectable;
	const focusable = () => edgeData()?.focusable ?? store.edgesFocusable;

	const markerStartUrl = () => {
		const e = edgeData();
		return e?.markerStart
			? `url('#${getMarkerId(e.markerStart, store.flowId)}')`
			: undefined;
	};

	const markerEndUrl = () => {
		const e = edgeData();
		return e?.markerEnd
			? `url('#${getMarkerId(e.markerEnd, store.flowId)}')`
			: undefined;
	};

	function onclick(event: MouseEvent) {
		const e = store.edgeLookup.get(id);
		if (e) {
			if (selectable()) store.handleEdgeSelection(id);
			props.events.onEdgeClick?.({ event, edge: e });
		}
	}

	return (
		<Show when={edgeData()} keyed>
			{(e) => {
				const Comp = store.edgeTypes[e.type ?? "default"] ?? BezierEdgeInternal;

				return (
					<EdgeIdContext value={id}>
						<svg
							style={{ "z-index": e.zIndex }}
							class="xy-flow__edge-wrapper"
						>
							<g
								class={[
									"xy-flow__edge",
									e.class ?? "",
									e.animated ? "animated" : "",
									e.selected ? "selected" : "",
									selectable() ? "selectable" : "",
								]
									.filter(Boolean)
									.join(" ")}
								data-id={id}
								onClick={onclick}
								onPointerEnter={
									props.events.onEdgePointerEnter
										? (ev) => {
												const edg = store.edgeLookup.get(id);
												if (edg)
													props.events.onEdgePointerEnter!({
														event: ev,
														edge: edg,
													});
											}
										: undefined
								}
								onPointerLeave={
									props.events.onEdgePointerLeave
										? (ev) => {
												const edg = store.edgeLookup.get(id);
												if (edg)
													props.events.onEdgePointerLeave!({
														event: ev,
														edge: edg,
													});
											}
										: undefined
								}
								aria-label={
									e.ariaLabel ?? `Edge from ${e.source} to ${e.target}`
								}
								role={e.ariaRole ?? (focusable() ? "group" : "img")}
								aria-roledescription="edge"
							>
								<Comp
									id={id}
									source={e.source}
									target={e.target}
									sourceX={e.sourceX}
									sourceY={e.sourceY}
									targetX={e.targetX}
									targetY={e.targetY}
									sourcePosition={e.sourcePosition}
									targetPosition={e.targetPosition}
									animated={e.animated}
									selected={e.selected}
									label={e.label}
									labelStyle={e.labelStyle}
									data={e.data}
									style={e.style}
									interactionWidth={e.interactionWidth}
									selectable={selectable()}
									deletable={e.deletable}
									type={e.type}
									sourceHandleId={e.sourceHandleId}
									targetHandleId={e.targetHandleId}
									markerStart={markerStartUrl()}
									markerEnd={markerEndUrl()}
								/>
							</g>
						</svg>
					</EdgeIdContext>
				);
			}}
		</Show>
	);
}
