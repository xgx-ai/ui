import {
	type PanZoomInstance,
	type PanZoomUpdateOptions,
	type Transform,
	XYPanZoom,
} from "@xyflow/system";
import { createRenderEffect, createSignal, untrack } from "solid-js";
import type { Edge, Node } from "../../types";
import type { ZoomProps } from "./types";

export function Zoom<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
>(props: ZoomProps<NodeType, EdgeType>) {
	const store = untrack(() => props.store);
	const [domNode, setDomNode] = createSignal<HTMLDivElement>();
	const [panZoomInstance, setPanZoomInstance] = createSignal<PanZoomInstance>();
	let onInitCalled = false;

	const initialViewport = untrack(() => ({ ...store.viewport }));

	createRenderEffect(
		() => ({
			domNode: domNode(),
			maxZoom: store.maxZoom,
			minZoom: store.minZoom,
			onmove: props.onmove,
			onmoveend: props.onmoveend,
			onmovestart: props.onmovestart,
			translateExtent: store.translateExtent,
		}),
		(state) => {
			if (!state.domNode) return;

			const instance = XYPanZoom({
			domNode: state.domNode,
			minZoom: state.minZoom,
			maxZoom: state.maxZoom,
			translateExtent: state.translateExtent,
			viewport: initialViewport,
			onPanZoom: state.onmove,
			onPanZoomStart: state.onmovestart,
			onPanZoomEnd: state.onmoveend,
				onDraggingChange: (dragging: boolean) => {
					store.dragging = dragging;
				},
			});

		const viewport = instance.getViewport();
		if (
			initialViewport.x !== viewport.x ||
			initialViewport.y !== viewport.y ||
			initialViewport.zoom !== viewport.zoom
		) {
			store.viewport = {
				x: viewport.x,
				y: viewport.y,
				zoom: viewport.zoom,
			};
		}

		store.panZoom = instance;
		setPanZoomInstance(instance);

		return () => {
			instance.destroy?.();
			if (store.panZoom === instance) store.panZoom = null;
			setPanZoomInstance((current) => (current === instance ? undefined : current));
		};
		},
	);

	const getPanZoomUpdateParams = (): PanZoomUpdateOptions => {
		const panOnDragActive =
			store.panActivationKeyPressed || props.panOnDrag;
		const panOnScrollActive =
			store.panActivationKeyPressed || props.panOnScroll;

		return {
			zoomOnScroll: props.zoomOnScroll,
			zoomOnDoubleClick: props.zoomOnDoubleClick,
			zoomOnPinch: props.zoomOnPinch,
			panOnScroll: panOnScrollActive,
			panOnDrag: panOnDragActive,
			panOnScrollSpeed: props.panOnScrollSpeed,
			panOnScrollMode: props.panOnScrollMode,
			zoomActivationKeyPressed: store.zoomActivationKeyPressed,
			preventScrolling:
				typeof props.preventScrolling === "boolean"
					? props.preventScrolling
					: true,
			noPanClassName: store.noPanClass,
			noWheelClassName: store.noWheelClass,
			userSelectionActive: !!store.selectionRect,
			lib: "xy",
			paneClickDistance: props.paneClickDistance,
			selectionOnDrag: props.selectionOnDrag,
			onTransformChange: (transform: Transform) => {
				store.viewport = {
					x: transform[0],
					y: transform[1],
					zoom: transform[2],
				};
			},
			connectionInProgress: store.connection.inProgress,
		};
	};

	// Update panZoom params reactively
	createRenderEffect(
		() => ({ instance: panZoomInstance(), params: getPanZoomUpdateParams() }),
		({ instance, params }) => {
			instance?.update(params);
		},
	);

	// Call oninit when viewport is initialized
	createRenderEffect(
		() => ({ initialized: store.viewportInitialized, oninit: props.oninit }),
			({ initialized, oninit }) => {
				if (!onInitCalled && initialized) {
					oninit?.();
					onInitCalled = true;
				}
			},
		);

	return (
		<div ref={setDomNode} class="xy-flow__zoom xy-flow__container">
			{props.children}
		</div>
	);
}
