import { ConnectionLineType, PanOnScrollMode } from "@xyflow/system";
import { createRenderEffect, createSignal, onSettled, untrack } from "solid-js";
import { ConnectionLine } from "../../components/ConnectionLine";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { KeyHandler } from "../../components/KeyHandler";
import { createStore, StoreContextObj } from "../../store";
import type { Edge, Node } from "../../types";
import { toPxString } from "../../utils";
import { EdgeRenderer } from "../EdgeRenderer";
import { NodeRenderer } from "../NodeRenderer";
import { Viewport as ViewportComponent } from "../Viewport";
import { Zoom } from "../Zoom";
import type { SolidFlowProps } from "./types";

/**
 * SolidFlow - main component that orchestrates the entire flow system.
 * This is the SolidJS equivalent of SvelteFlow.svelte.
 */
export function SolidFlow<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
>(props: SolidFlowProps<NodeType, EdgeType>) {
	const [wrapperRef, setWrapperRef] = createSignal<HTMLDivElement | undefined>();

	// Internal signals that the store reads/writes.
	// Initialized from props and kept in sync below.
	const [nodes, setNodes] = createSignal<NodeType[]>(
		untrack(() => props.nodes ?? ([] as NodeType[])),
	);
	const [edges, setEdges] = createSignal<EdgeType[]>(
		untrack(() => props.edges ?? ([] as EdgeType[])),
	);

	// Track the last props reference we synced, so we only push
	// parent changes into the store (not overwrite internal drag updates).
	let lastPropsNodes = untrack(() => props.nodes);
	let lastPropsEdges = untrack(() => props.edges);

	createRenderEffect(() => props.nodes, (incoming) => {
		if (incoming !== lastPropsNodes) {
			lastPropsNodes = incoming;
			setNodes(() => incoming);
		}
	});

	createRenderEffect(() => props.edges, (incoming) => {
		if (incoming !== lastPropsEdges) {
			lastPropsEdges = incoming;
			setEdges(() => incoming);
		}
	});

	const store = createStore<NodeType, EdgeType>({
		props: props as any,
		width: untrack(() => props.width),
		height: untrack(() => props.height),
		get nodes() {
			return nodes();
		},
		set nodes(v) {
			setNodes(() => v);
		},
		get edges() {
			return edges();
		},
		set edges(v) {
			setEdges(() => v);
		},
		get viewport() {
			return props.viewport;
		},
		set viewport(v) {
			/* viewport is managed by store internally */
		},
	});

	// Set domNode ref on mount
	createRenderEffect(wrapperRef, (wrapper) => {
		if (!wrapper) return;

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				store.width = width;
				store.height = height;
			}
		});
		store.domNode = wrapper;
		resizeObserver.observe(wrapper);
		return () => resizeObserver.disconnect();
	});

	// Handle selection change
	createRenderEffect(
		() => [store.selectedNodes, store.selectedEdges] as const,
		([nodes, edges]) => {
		const params = { nodes, edges };
		props.onselectionchange?.(params);
		for (const handler of store.selectionChangeHandlers.values()) {
			handler(params);
		}
		},
	);

	onSettled(() => () => store.reset());

	// Wrapper scroll handler to prevent viewport shifting
	function onWrapperScroll(e: Event) {
		const el = e.currentTarget as HTMLDivElement;
		el.scrollTo({ top: 0, left: 0, behavior: "auto" });
	}

	return (
		<StoreContextObj
			value={{ provider: false, getStore: () => store }}
		>
			<div
				ref={setWrapperRef}
				style={{
					width: toPxString(props.width),
					height: toPxString(props.height),
				}}
				class={`xy-flow xy-flow__container ${props.class ?? ""} ${store.colorMode ?? ""}`}
				data-testid="xy-flow__wrapper"
				role="application"
				onScroll={onWrapperScroll}
			>
				<KeyHandler
					store={store}
					selectionKey={props.selectionKey}
					deleteKey={props.deleteKey}
					panActivationKey={props.panActivationKey}
					multiSelectionKey={props.multiSelectionKey}
					zoomActivationKey={props.zoomActivationKey}
				/>
				<Zoom
					store={store}
					panOnScrollMode={props.panOnScrollMode ?? PanOnScrollMode.Free}
					preventScrolling={props.preventScrolling ?? true}
					zoomOnScroll={props.zoomOnScroll ?? true}
					zoomOnDoubleClick={props.zoomOnDoubleClick ?? true}
					zoomOnPinch={props.zoomOnPinch ?? true}
					panOnScroll={props.panOnScroll ?? false}
					panOnScrollSpeed={props.panOnScrollSpeed ?? 0.5}
					panOnDrag={props.panOnDrag ?? true}
					paneClickDistance={props.paneClickDistance ?? 1}
					selectionOnDrag={props.selectionOnDrag}
					onmovestart={props.onMoveStart}
					onmove={props.onMove}
					onmoveend={props.onMoveEnd}
				>
					<div class="xy-flow__pane xy-flow__container">
						<ViewportComponent store={store}>
							<div class="xy-flow__viewport-back xy-flow__container" />
							<EdgeRenderer
								store={store}
								onEdgeClick={props.onEdgeClick}
								onEdgeContextMenu={props.onEdgeContextMenu}
								onEdgePointerEnter={props.onEdgePointerEnter}
								onEdgePointerLeave={props.onEdgePointerLeave}
							/>
							<div class="xy-flow__edge-labels xy-flow__container" />
							<ConnectionLine
								store={store}
								type={props.connectionLineType ?? ConnectionLineType.Bezier}
								LineComponent={props.connectionLineComponent}
								containerStyle={props.connectionLineContainerStyle}
								style={props.connectionLineStyle}
							/>
							<NodeRenderer
								store={store}
								nodeClickDistance={props.nodeClickDistance}
								onNodeClick={props.onNodeClick}
								onNodeContextMenu={props.onNodeContextMenu}
								onNodePointerEnter={props.onNodePointerEnter}
								onNodePointerMove={props.onNodePointerMove}
								onNodePointerLeave={props.onNodePointerLeave}
								onNodeDrag={props.onNodeDrag}
								onNodeDragStart={props.onNodeDragStart}
								onNodeDragStop={props.onNodeDragStop}
							/>
							<div class="xy-flow__viewport-front xy-flow__container" />
						</ViewportComponent>
					</div>
				</Zoom>
				{props.children}
			</div>
		</StoreContextObj>
	);
}
