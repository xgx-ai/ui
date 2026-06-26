// @ts-nocheck
import {
	type PanZoomInstance,
	type PanZoomUpdateOptions,
	type Transform,
	XYPanZoom,
} from "@xyflow/system";
import { createRenderEffect, onCleanup } from "solid-js";
import type { Edge, Node } from "../../types";
import type { ZoomProps } from "./types";

export function Zoom<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
>(props: ZoomProps<NodeType, EdgeType>) {
	let domNode: HTMLDivElement | null = null;
	let panZoomInstance: PanZoomInstance | null = null;
	let onInitCalled = false;

	const initialViewport = { ...props.store.viewport };

	const ensurePanZoomInstance = () => {
		if (!domNode || panZoomInstance) {
			return;
		}

		panZoomInstance = XYPanZoom({
			domNode,
			minZoom: props.store.minZoom,
			maxZoom: props.store.maxZoom,
			translateExtent: props.store.translateExtent,
			viewport: initialViewport,
			onPanZoom: props.onmove,
			onPanZoomStart: props.onmovestart,
			onPanZoomEnd: props.onmoveend,
			onDraggingChange: (dragging: boolean) => {
				props.store.dragging = dragging;
			},
		});

		const viewport = panZoomInstance.getViewport();
		if (
			initialViewport.x !== viewport.x ||
			initialViewport.y !== viewport.y ||
			initialViewport.zoom !== viewport.zoom
		) {
			props.store.viewport = {
				x: viewport.x,
				y: viewport.y,
				zoom: viewport.zoom,
			};
		}

		props.store.panZoom = panZoomInstance;
	};

	const getPanZoomUpdateParams = (): PanZoomUpdateOptions => {
		const panOnDragActive =
			props.store.panActivationKeyPressed || props.panOnDrag;
		const panOnScrollActive =
			props.store.panActivationKeyPressed || props.panOnScroll;

		return {
			zoomOnScroll: props.zoomOnScroll,
			zoomOnDoubleClick: props.zoomOnDoubleClick,
			zoomOnPinch: props.zoomOnPinch,
			panOnScroll: panOnScrollActive,
			panOnDrag: panOnDragActive,
			panOnScrollSpeed: props.panOnScrollSpeed,
			panOnScrollMode: props.panOnScrollMode,
			zoomActivationKeyPressed: props.store.zoomActivationKeyPressed,
			preventScrolling:
				typeof props.preventScrolling === "boolean"
					? props.preventScrolling
					: true,
			noPanClassName: props.store.noPanClass,
			noWheelClassName: props.store.noWheelClass,
			userSelectionActive: !!props.store.selectionRect,
			lib: "xy",
			paneClickDistance: props.paneClickDistance,
			selectionOnDrag: props.selectionOnDrag,
			onTransformChange: (transform: Transform) => {
				props.store.viewport = {
					x: transform[0],
					y: transform[1],
					zoom: transform[2],
				};
			},
			connectionInProgress: props.store.connection.inProgress,
		};
	};

	const updatePanZoomInstance = (params: PanZoomUpdateOptions) => {
		ensurePanZoomInstance();
		panZoomInstance?.update(params);
	};

	onCleanup(() => {
		panZoomInstance?.destroy?.();
		props.store.panZoom = null;
	});

	// Update panZoom params reactively
	createRenderEffect(getPanZoomUpdateParams, updatePanZoomInstance);

	// Call oninit when viewport is initialized
	createRenderEffect(
		() => props.store.viewportInitialized,
		(viewportInitialized) => {
		if (!onInitCalled && viewportInitialized) {
			props.oninit?.();
			onInitCalled = true;
		}
		},
	);

	return (
		<div
			ref={(el) => {
				domNode = el;
				updatePanZoomInstance(getPanZoomUpdateParams());
			}}
			class="xy-flow__zoom xy-flow__container"
		>
			{props.children}
		</div>
	);
}
