// @ts-nocheck
import {
	getBoundsOfRects,
	getInternalNodesBounds,
	nodeHasDimensions,
	XYMinimap,
} from "@xyflow/system";
import {
	createMemo,
	createRenderEffect,
	createSignal,
	For,
	onCleanup,
	Show,
} from "solid-js";
import { Panel } from "../../container/Panel";
import { useStore } from "../../store";
import { MinimapNode } from "./MinimapNode";
import type { GetMiniMapNodeAttribute, MiniMapProps } from "./types";

const getAttrFunction = (func: any): GetMiniMapNodeAttribute =>
	func instanceof Function ? func : () => func;
const MINIMAP_DRAG_SENSITIVITY = 0.08;

export function MiniMap(props: MiniMapProps) {
	const store = useStore();
	const [svgRef, setSvgRef] = createSignal<SVGSVGElement | undefined>();
	let minimapInstance: ReturnType<typeof XYMinimap> | null = null;
	const [isDragging, setIsDragging] = createSignal(false);

	const width = () => props.width ?? 200;
	const height = () => props.height ?? 150;
	const nodeStrokeColor = () => props.nodeStrokeColor ?? "transparent";
	const nodeStrokeWidth = () => props.nodeStrokeWidth ?? 2;
	const nodeBorderRadius = () => props.nodeBorderRadius ?? 5;
	const pannable = () => props.pannable ?? true;
	const zoomable = () => props.zoomable ?? true;

	const shapeRendering =
		typeof window === "undefined" || !!(window as any).chrome
			? "crispEdges"
			: "geometricPrecision";
	const labelledBy = createMemo(
		() => `xy-flow__minimap-desc-${store.flowId}`,
	);

	const viewBB = createMemo(() => ({
		x: -store.viewport.x / store.viewport.zoom,
		y: -store.viewport.y / store.viewport.zoom,
		width: store.width / store.viewport.zoom,
		height: store.height / store.viewport.zoom,
	}));

	const boundingRect = createMemo(() =>
		getBoundsOfRects(
			getInternalNodesBounds(store.nodeLookup, { filter: (n) => !n.hidden }),
			viewBB(),
		),
	);

	const viewScale = createMemo(() => {
		const scaledW = boundingRect().width / width();
		const scaledH = boundingRect().height / height();
		return Math.max(scaledW, scaledH);
	});

	const viewWidth = createMemo(() => viewScale() * width());
	const viewHeight = createMemo(() => viewScale() * height());
	const offset = createMemo(() => 5 * viewScale());
	const x = createMemo(
		() =>
			boundingRect().x - (viewWidth() - boundingRect().width) / 2 - offset(),
	);
	const y = createMemo(
		() =>
			boundingRect().y - (viewHeight() - boundingRect().height) / 2 - offset(),
	);
	const viewboxWidth = createMemo(() => viewWidth() + offset() * 2);
	const viewboxHeight = createMemo(() => viewHeight() + offset() * 2);

	const getFlowPositionFromPointer = (event: PointerEvent) => {
		const svg = svgRef();
		if (!svg) {
			return null;
		}

		const screenMatrix = svg.getScreenCTM();
		if (!screenMatrix) {
			return null;
		}

		const point = svg.createSVGPoint();
		point.x = event.clientX;
		point.y = event.clientY;

		return point.matrixTransform(screenMatrix.inverse());
	};

	const centerViewportOnPointer = (
		event: PointerEvent,
		options?: { sensitivity?: number },
	) => {
		if (!pannable() || !store.panZoom) {
			return;
		}

		const position = getFlowPositionFromPointer(event);
		if (!position) {
			return;
		}

		const zoom = store.viewport.zoom;
		const targetViewport = {
			x: store.width / 2 - position.x * zoom,
			y: store.height / 2 - position.y * zoom,
			zoom,
		};
		const sensitivity = options?.sensitivity ?? 1;
		const nextViewport =
			sensitivity >= 1
				? targetViewport
				: {
						x:
							store.viewport.x +
							(targetViewport.x - store.viewport.x) * sensitivity,
						y:
							store.viewport.y +
							(targetViewport.y - store.viewport.y) * sensitivity,
						zoom,
					};

		void store.panZoom.setViewportConstrained(
			nextViewport,
			[
				[0, 0],
				[store.width, store.height],
			],
			store.translateExtent,
		);
	};

	const handlePointerDown = (event: PointerEvent) => {
		if (!pannable() || event.button !== 0) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		svgRef()?.setPointerCapture(event.pointerId);
		setIsDragging(true);
		centerViewportOnPointer(event);
	};

	const handlePointerMove = (event: PointerEvent) => {
		if (!isDragging()) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		centerViewportOnPointer(event, { sensitivity: MINIMAP_DRAG_SENSITIVITY });
	};

	const stopDragging = (event: PointerEvent) => {
		if (!isDragging()) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		const svg = svgRef();
		if (svg?.hasPointerCapture(event.pointerId)) {
			svg.releasePointerCapture(event.pointerId);
		}
		setIsDragging(false);
	};

	createRenderEffect(() => [svgRef(), store.panZoom] as const, ([svg, panZoom]) => {
		if (!svg || !panZoom) return;

		const instance = XYMinimap({
			domNode: svg,
			panZoom,
			getTransform: () => [
				store.viewport.x,
				store.viewport.y,
				store.viewport.zoom,
			],
			getViewScale: () => viewScale(),
		});
		minimapInstance = instance;
		onCleanup(() => {
			instance.destroy();
			if (minimapInstance === instance) minimapInstance = null;
		});
	});

	createRenderEffect(
		() => ({
			translateExtent: store.translateExtent,
			width: store.width,
			height: store.height,
			inversePan: props.inversePan,
			zoomStep: props.zoomStep,
			pannable: false,
			zoomable: zoomable(),
		}),
		(params) => minimapInstance?.update(params),
	);

	onCleanup(() => {
		minimapInstance?.destroy();
	});

	return (
		<Panel
			position={props.position ?? "bottom-right"}
			class={`xy-flow__minimap ${props.class ?? ""}`}
			data-testid="xy-flow__minimap"
			style={{ "--xy-minimap-background-color-props": props.bgColor }}
		>
			<Show when={store.panZoom}>
				<svg
					ref={setSvgRef}
					width={width()}
					height={height()}
					viewBox={`${x()} ${y()} ${viewboxWidth()} ${viewboxHeight()}`}
					class="xy-flow__minimap-svg"
					role="img"
					aria-labelledby={labelledBy()}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={stopDragging}
					onPointerCancel={stopDragging}
					style={{
						"--xy-minimap-mask-background-color-props": props.maskColor,
						"--xy-minimap-mask-stroke-color-props": props.maskStrokeColor,
						"--xy-minimap-mask-stroke-width-props": props.maskStrokeWidth
							? `${props.maskStrokeWidth * viewScale()}`
							: undefined,
						cursor: pannable() ? (isDragging() ? "grabbing" : "grab") : undefined,
						"touch-action": pannable() ? "none" : undefined,
					}}
				>
					<Show
						when={props.ariaLabel ?? store.ariaLabelConfig["minimap.ariaLabel"]}
					>
						<title id={labelledBy()}>
							{props.ariaLabel ?? store.ariaLabelConfig["minimap.ariaLabel"]}
						</title>
					</Show>

					<For each={store.nodes}>
						{(userNode) => {
							const node = () => store.nodeLookup.get(userNode.id);
							return (
								<Show
									when={node() && nodeHasDimensions(node()!) && !node()!.hidden}
								>
									<MinimapNode
										id={node()!.id}
										selected={node()!.selected}
										nodeComponent={props.nodeComponent}
										color={
											props.nodeColor === undefined
												? undefined
												: getAttrFunction(props.nodeColor)(userNode)
										}
										borderRadius={nodeBorderRadius()}
										strokeColor={getAttrFunction(nodeStrokeColor())(userNode)}
										strokeWidth={nodeStrokeWidth()}
										shapeRendering={shapeRendering}
										class={getAttrFunction(props.nodeClass ?? "")(userNode)}
									/>
								</Show>
							);
						}}
					</For>
					<path
						class="xy-flow__minimap-mask"
						d={`M${x() - offset()},${y() - offset()}h${viewboxWidth() + offset() * 2}v${viewboxHeight() + offset() * 2}h${-viewboxWidth() - offset() * 2}z M${viewBB().x},${viewBB().y}h${viewBB().width}v${viewBB().height}h${-viewBB().width}z`}
						fill-rule="evenodd"
						pointer-events="none"
					/>
				</svg>
			</Show>
		</Panel>
	);
}
