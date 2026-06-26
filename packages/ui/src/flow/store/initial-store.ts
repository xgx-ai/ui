// @ts-nocheck
import {
	type AriaLabelConfig,
	adoptUserNodes,
	type ColorModeClass,
	type ConnectionLookup,
	ConnectionMode,
	type ConnectionState,
	type CoordinateExtent,
	createMarkerIds,
	devWarn,
	type EdgeLookup,
	fitViewport,
	getInternalNodesBounds,
	getViewportForBounds,
	type Handle,
	infiniteExtent,
	initialConnection,
	type MarkerProps,
	mergeAriaLabelConfig,
	type NodeLookup,
	type NodeOrigin,
	type OnConnect,
	type OnConnectEnd,
	type OnConnectStart,
	type OnError,
	type OnReconnect,
	type OnReconnectEnd,
	type OnReconnectStart,
	type PanZoomInstance,
	type ParentLookup,
	pointToRendererPoint,
	SelectionMode,
	type SelectionRect,
	type SnapGrid,
	type Transform,
	updateConnectionLookup,
	type Viewport,
	type ZIndexMode,
} from "@xyflow/system";
import { createMemo, createSignal } from "solid-js";
import {
	BezierEdgeInternal,
	SmoothStepEdgeInternal,
	StepEdgeInternal,
	StraightEdgeInternal,
} from "../components/edges";
import { DefaultNode } from "../components/nodes/DefaultNode";
import { GroupNode } from "../components/nodes/GroupNode";
import { InputNode } from "../components/nodes/InputNode";
import { OutputNode } from "../components/nodes/OutputNode";
import type {
	Edge,
	EdgeLayouted,
	EdgeTypes,
	FitViewOptions,
	InternalNode,
	IsValidConnection,
	Node,
	NodeTypes,
	OnBeforeConnect,
	OnBeforeDelete,
	OnBeforeReconnect,
	OnDelete,
	OnSelectionChange,
	OnSelectionDrag,
} from "../types";
import type { StoreSignals } from "./types";
import {
	type EdgeLayoutAllOptions,
	getLayoutedEdges,
	getVisibleNodes,
} from "./visibleElements";

export const initialNodeTypes: NodeTypes = {
	input: InputNode,
	output: OutputNode,
	default: DefaultNode,
	group: GroupNode,
};

export const initialEdgeTypes: EdgeTypes = {
	straight: StraightEdgeInternal,
	smoothstep: SmoothStepEdgeInternal,
	default: BezierEdgeInternal,
	step: StepEdgeInternal,
};

function getInitialViewport(
	_nodesInitialized: boolean,
	fitView: boolean | undefined,
	initialViewport: Viewport | undefined,
	width: number,
	height: number,
	nodeLookup: NodeLookup,
) {
	if (fitView && !initialViewport && width && height) {
		const bounds = getInternalNodesBounds(nodeLookup, {
			filter: (node) =>
				!!(
					(node.width || node.initialWidth) &&
					(node.height || node.initialHeight)
				),
		});
		return getViewportForBounds(bounds, width, height, 0.5, 2, 0.1);
	} else {
		return initialViewport ?? { x: 0, y: 0, zoom: 1 };
	}
}

/**
 * SolidJS port of the Svelte store.
 * Svelte $state -> createSignal
 * Svelte $derived -> createMemo
 * Svelte $state.raw -> createSignal (SolidJS signals are already non-deep by default)
 */
export function getInitialStore<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
>(signals: StoreSignals<NodeType, EdgeType>) {
	// --- Mutable signals (Svelte $state.raw equivalents) ---
	const [domNode, setDomNode] = createSignal<HTMLDivElement | null>(null);
	const [panZoom, setPanZoom] = createSignal<PanZoomInstance | null>(null);
	const [width, setWidth] = createSignal<number>(signals.width ?? 0);
	const [height, setHeight] = createSignal<number>(signals.height ?? 0);
	const [dragging, setDragging] = createSignal(false);
	const [selectionRect, setSelectionRect] = createSignal<SelectionRect | null>(
		null,
	);
	const [selectionKeyPressed, setSelectionKeyPressed] = createSignal(false);
	const [multiselectionKeyPressed, setMultiselectionKeyPressed] =
		createSignal(false);
	const [deleteKeyPressed, setDeleteKeyPressed] = createSignal(false);
	const [panActivationKeyPressed, setPanActivationKeyPressed] =
		createSignal(false);
	const [zoomActivationKeyPressed, setZoomActivationKeyPressed] =
		createSignal(false);
	const [selectionRectMode, setSelectionRectMode] = createSignal<string | null>(
		null,
	);
	const [ariaLiveMessage, setAriaLiveMessage] = createSignal("");
	const [_connection, set_Connection] =
		createSignal<ConnectionState>(initialConnection);
	const [clickConnectStartHandle, setClickConnectStartHandle] =
		createSignal<Pick<Handle, "id" | "nodeId" | "type"> | null>(null);
	const [nodeInternalsVersion, setNodeInternalsVersion] = createSignal(0);

	// fitView state
	let fitViewQueued = signals.props.fitView ?? false;
	let fitViewOptions: FitViewOptions | undefined = signals.props.fitViewOptions;
	let fitViewResolver: PromiseWithResolvers<boolean> | null = null;

	// Lookups (not reactive — mutable Maps)
	const nodeLookup: NodeLookup<InternalNode<NodeType>> = new Map();
	const parentLookup: ParentLookup<InternalNode<NodeType>> = new Map();
	const connectionLookup: ConnectionLookup = new Map();
	const edgeLookup: EdgeLookup<EdgeType> = new Map();

	// Selection change handlers
	const selectionChangeHandlers = new Map<
		symbol,
		OnSelectionChange<NodeType, EdgeType>
	>();

	// Previous visible edges cache
	let _prevVisibleEdges = new Map<string, EdgeLayouted<EdgeType>>();

	// Previous selection tracking
	let _prevSelectedNodes: NodeType[] = [];
	let _prevSelectedNodeIds = new Set<string>();
	let _prevSelectedEdges: EdgeType[] = [];
	let _prevSelectedEdgeIds = new Set<string>();

	// --- Derived values (Svelte $derived equivalents) ---
	const flowId = createMemo(() => signals.props.id ?? "1");
	const zIndexMode = createMemo<ZIndexMode>(
		() => signals.props.zIndexMode ?? "basic",
	);

	// These must be declared before nodesInitialized since it references them
	const nodeOrigin = createMemo<NodeOrigin>(
		() => signals.props.nodeOrigin ?? [0, 0],
	);
	const nodeExtent = createMemo<CoordinateExtent>(
		() => signals.props.nodeExtent ?? infiniteExtent,
	);

	// { equals: false } is critical here: adoptUserNodes mutates nodeLookup
	// entries in place (updating positionAbsolute etc.) but always returns
	// the same boolean. Without equals:false the visible memo never
	// re-fires after a drag because the return value doesn't change.
	const nodesInitialized = createMemo(
		() => {
			const initialized = adoptUserNodes(
				signals.nodes,
				nodeLookup,
				parentLookup,
				{
					nodeExtent: nodeExtent(),
					nodeOrigin: nodeOrigin(),
					elevateNodesOnSelect: signals.props.elevateNodesOnSelect ?? true,
					checkEquality: true,
					zIndexMode: zIndexMode(),
				},
			);

			if (fitViewQueued && initialized) {
				queueMicrotask(() => {
					void resolveFitView();
				});
			}

			return initialized;
		},
		undefined,
		{ equals: false },
	);

	const viewportInitialized = createMemo(() => panZoom() !== null);

	const _edges = createMemo(() => {
		updateConnectionLookup(connectionLookup, edgeLookup, signals.edges);
		return signals.edges;
	});

	const selectedNodes = createMemo(() => {
		const selectedNodesCount = _prevSelectedNodeIds.size;
		const selectedNodeIds = new Set<string>();
		const selected = signals.nodes.filter((node) => {
			if (node.selected) {
				selectedNodeIds.add(node.id);
				_prevSelectedNodeIds.delete(node.id);
			}
			return node.selected;
		});

		if (
			selectedNodesCount !== selectedNodeIds.size ||
			_prevSelectedNodeIds.size > 0
		) {
			_prevSelectedNodes = selected;
		}

		_prevSelectedNodeIds = selectedNodeIds;
		return _prevSelectedNodes;
	});

	const selectedEdges = createMemo(() => {
		const selectedEdgesCount = _prevSelectedEdgeIds.size;
		const selectedEdgeIds = new Set<string>();
		const selected = _edges().filter((edge) => {
			if (edge.selected) {
				selectedEdgeIds.add(edge.id);
				_prevSelectedEdgeIds.delete(edge.id);
			}
			return edge.selected;
		});

		if (
			selectedEdgesCount !== selectedEdgeIds.size ||
			_prevSelectedEdgeIds.size > 0
		) {
			_prevSelectedEdges = selected;
		}

		_prevSelectedEdgeIds = selectedEdgeIds;
		return _prevSelectedEdges;
	});

	// --- Props-derived values ---
	const nodesDraggable = createMemo(() => signals.props.nodesDraggable ?? true);
	const nodesConnectable = createMemo(
		() => signals.props.nodesConnectable ?? true,
	);
	const elementsSelectable = createMemo(
		() => signals.props.elementsSelectable ?? true,
	);
	const nodesFocusable = createMemo(() => signals.props.nodesFocusable ?? true);
	const edgesFocusable = createMemo(() => signals.props.edgesFocusable ?? true);
	const disableKeyboardA11y = createMemo(
		() => signals.props.disableKeyboardA11y ?? false,
	);
	const minZoom = createMemo(() => signals.props.minZoom ?? 0.5);
	const maxZoom = createMemo(() => signals.props.maxZoom ?? 2);
	const translateExtent = createMemo<CoordinateExtent>(
		() => signals.props.translateExtent ?? infiniteExtent,
	);
	const defaultEdgeOptions = createMemo<Partial<Edge>>(
		() => signals.props.defaultEdgeOptions ?? {},
	);
	const nodeDragThreshold = createMemo(
		() => signals.props.nodeDragThreshold ?? 1,
	);
	const autoPanOnNodeDrag = createMemo(
		() => signals.props.autoPanOnNodeDrag ?? true,
	);
	const autoPanOnConnect = createMemo(
		() => signals.props.autoPanOnConnect ?? true,
	);
	const autoPanOnNodeFocus = createMemo(
		() => signals.props.autoPanOnNodeFocus ?? true,
	);
	const autoPanSpeed = createMemo(() => signals.props.autoPanSpeed ?? 15);
	const connectionDragThreshold = createMemo(
		() => signals.props.connectionDragThreshold ?? 1,
	);
	const snapGrid = createMemo<SnapGrid | null>(
		() => signals.props.snapGrid ?? null,
	);
	const selectionMode = createMemo(
		() => signals.props.selectionMode ?? SelectionMode.Partial,
	);
	const nodeTypes = createMemo<NodeTypes>(() => ({
		...initialNodeTypes,
		...signals.props.nodeTypes,
	}));
	const edgeTypes = createMemo<EdgeTypes>(() => ({
		...initialEdgeTypes,
		...signals.props.edgeTypes,
	}));
	const noPanClass = createMemo(() => signals.props.noPanClass ?? "nopan");
	const noDragClass = createMemo(() => signals.props.noDragClass ?? "nodrag");
	const noWheelClass = createMemo(
		() => signals.props.noWheelClass ?? "nowheel",
	);
	const ariaLabelConfig = createMemo<AriaLabelConfig>(() =>
		mergeAriaLabelConfig(signals.props.ariaLabelConfig),
	);
	const connectionMode = createMemo(
		() => signals.props.connectionMode ?? ConnectionMode.Strict,
	);
	const connectionRadius = createMemo(
		() => signals.props.connectionRadius ?? 20,
	);
	const isValidConnection = createMemo<IsValidConnection>(
		() => signals.props.isValidConnection ?? (() => true),
	);
	const selectNodesOnDrag = createMemo(
		() => signals.props.selectNodesOnDrag ?? true,
	);
	const onlyRenderVisibleElements = createMemo(
		() => signals.props.onlyRenderVisibleElements ?? false,
	);
	const onerror = createMemo<OnError>(
		() => signals.props.onflowerror ?? devWarn,
	);

	const defaultMarkerColor = createMemo(() =>
		signals.props.defaultMarkerColor === undefined
			? "#b1b1b7"
			: signals.props.defaultMarkerColor,
	);

	const markers = createMemo<MarkerProps[]>(() =>
		createMarkerIds(signals.edges, {
			defaultColor: defaultMarkerColor(),
			id: flowId(),
			defaultMarkerStart: defaultEdgeOptions().markerStart,
			defaultMarkerEnd: defaultEdgeOptions().markerEnd,
		}),
	);

	// Viewport
	const [_viewport, set_Viewport] = createSignal<Viewport>(
		getInitialViewport(
			nodesInitialized(),
			signals.props.fitView,
			signals.props.initialViewport,
			width(),
			height(),
			nodeLookup,
		),
	);

	// Viewport getter/setter
	const viewport = createMemo<Viewport>(() => signals.viewport ?? _viewport());

	// Connection (viewport-dependent)
	const connection = createMemo<ConnectionState>(() => {
		const conn = _connection();
		if (!conn.inProgress) {
			return conn;
		}
		const vp = viewport();
		return {
			...conn,
			to: pointToRendererPoint(conn.to, [vp.x, vp.y, vp.zoom]),
		};
	});

	// Callback props
	const ondelete = createMemo(
		() => signals.props.ondelete as OnDelete<NodeType, EdgeType> | undefined,
	);
	const onbeforedelete = createMemo(
		() =>
			signals.props.onbeforedelete as
				| OnBeforeDelete<NodeType, EdgeType>
				| undefined,
	);
	const onbeforeconnect = createMemo(
		() => signals.props.onbeforeconnect as OnBeforeConnect | undefined,
	);
	const onconnect = createMemo(
		() => signals.props.onconnect as OnConnect | undefined,
	);
	const onconnectstart = createMemo(
		() => signals.props.onconnectstart as OnConnectStart | undefined,
	);
	const onconnectend = createMemo(
		() => signals.props.onconnectend as OnConnectEnd | undefined,
	);
	const onbeforereconnect = createMemo(
		() =>
			signals.props.onbeforereconnect as
				| OnBeforeReconnect<EdgeType>
				| undefined,
	);
	const onreconnect = createMemo(
		() => signals.props.onreconnect as OnReconnect<EdgeType> | undefined,
	);
	const onreconnectstart = createMemo(
		() =>
			signals.props.onreconnectstart as OnReconnectStart<EdgeType> | undefined,
	);
	const onreconnectend = createMemo(
		() => signals.props.onreconnectend as OnReconnectEnd<EdgeType> | undefined,
	);
	const clickConnect = createMemo(() => signals.props.clickConnect ?? true);
	const onclickconnectstart = createMemo(
		() => signals.props.onclickconnectstart as OnConnectStart | undefined,
	);
	const onclickconnectend = createMemo(
		() => signals.props.onclickconnectend as OnConnectEnd | undefined,
	);
	const onselectiondrag = createMemo(
		() =>
			signals.props.onselectiondrag as OnSelectionDrag<NodeType> | undefined,
	);
	const onselectiondragstart = createMemo(
		() =>
			signals.props.onselectiondragstart as
				| OnSelectionDrag<NodeType>
				| undefined,
	);
	const onselectiondragstop = createMemo(
		() =>
			signals.props.onselectiondragstop as
				| OnSelectionDrag<NodeType>
				| undefined,
	);

	// Color mode
	const colorMode = createMemo<ColorModeClass>(() => {
		if (signals.props.colorMode === "system") {
			// Check prefers-color-scheme
			if (typeof window !== "undefined") {
				return window.matchMedia("(prefers-color-scheme: dark)").matches
					? "dark"
					: "light";
			}
			return signals.props.colorModeSSR === "dark" ? "dark" : "light";
		}
		return signals.props.colorMode ?? "light";
	});

	// Visible elements
	const visible = createMemo(
		() => {
			// Force direct dependencies on public node updates and internal
			// measurements; nodeLookup itself is mutated outside Solid signals.
			void signals.nodes;
			nodesInitialized();
			nodeInternalsVersion();
			const edges = _edges();

			// In SolidJS, nodeLookup entries are mutated in place by adoptUserNodes,
			// so the edge layout cache (which compares sourceNode/targetNode by reference)
			// always hits and returns stale positions. We clear the cache to force
			// fresh getEdgePosition calls on every update.
			const options = {
				edges,
				defaultEdgeOptions: defaultEdgeOptions(),
				previousEdges: new Map<string, EdgeLayouted<EdgeType>>(),
				nodeLookup,
				connectionMode: connectionMode(),
				elevateEdgesOnSelect: signals.props.elevateEdgesOnSelect ?? true,
				zIndexMode: zIndexMode(),
				onerror: onerror(),
			};

			let visibleNodes: Map<string, InternalNode<NodeType>>;
			let visibleEdges: Map<string, EdgeLayouted<EdgeType>>;

			if (onlyRenderVisibleElements()) {
				const vp = viewport();
				const w = width();
				const h = height();
				const transform: Transform = [vp.x, vp.y, vp.zoom];

				visibleNodes = getVisibleNodes(nodeLookup, transform, w, h);
				visibleEdges = getLayoutedEdges({
					...options,
					onlyRenderVisible: true,
					visibleNodes,
					transform,
					width: w,
					height: h,
				});
			} else {
				visibleNodes = nodeLookup;
				visibleEdges = getLayoutedEdges(
					options as EdgeLayoutAllOptions<NodeType, EdgeType>,
				);
			}

			_prevVisibleEdges = visibleEdges;

			return {
				nodes: visibleNodes,
				edges: visibleEdges,
			};
		},
		undefined,
		{ equals: false },
	);

	const resolveFitView = async () => {
		const pz = panZoom();
		if (!pz) return;

		await fitViewport(
			{
				nodes: nodeLookup,
				width: width(),
				height: height(),
				panZoom: pz,
				minZoom: minZoom(),
				maxZoom: maxZoom(),
			},
			fitViewOptions,
		);

		set_Viewport(pz.getViewport());
		fitViewResolver?.resolve(true);
		fitViewQueued = false;
		fitViewOptions = undefined;
		fitViewResolver = null;
	};

	function resetStoreValues() {
		setDragging(false);
		setSelectionRect(null);
		setSelectionRectMode(null);
		setSelectionKeyPressed(false);
		setMultiselectionKeyPressed(false);
		setDeleteKeyPressed(false);
		setPanActivationKeyPressed(false);
		setZoomActivationKeyPressed(false);
		set_Connection(initialConnection);
		setClickConnectStartHandle(null);
		set_Viewport(signals.props.initialViewport ?? { x: 0, y: 0, zoom: 1 });
		setAriaLiveMessage("");
	}

	// The store object exposes getters that call the signals,
	// and setters that call the signal setters.
	// This keeps the same API shape as the Svelte store.
	const store = {
		// --- Signal getters/setters ---
		get flowId() {
			return flowId();
		},
		get domNode() {
			return domNode();
		},
		set domNode(v) {
			setDomNode(v);
		},
		get panZoom() {
			return panZoom();
		},
		set panZoom(v) {
			setPanZoom(v);
			if (v && fitViewQueued && nodesInitialized()) {
				queueMicrotask(() => {
					void resolveFitView();
				});
			}
		},
		get width() {
			return width();
		},
		set width(v) {
			setWidth(v);
		},
		get height() {
			return height();
		},
		set height(v) {
			setHeight(v);
		},
		get zIndexMode() {
			return zIndexMode();
		},

		get nodesInitialized() {
			return nodesInitialized();
		},
		notifyNodeInternalsUpdated() {
			setNodeInternalsVersion((version) => version + 1);
		},
		get viewportInitialized() {
			return viewportInitialized();
		},

		get nodes() {
			nodesInitialized();
			return signals.nodes;
		},
		set nodes(v) {
			signals.nodes = v;
		},
		get edges() {
			return _edges();
		},
		set edges(v) {
			signals.edges = v;
		},

		get selectedNodes() {
			return selectedNodes();
		},
		get selectedEdges() {
			return selectedEdges();
		},
		selectionChangeHandlers,

		nodeLookup,
		parentLookup,
		connectionLookup,
		edgeLookup,

		get visible() {
			return visible();
		},

		get nodesDraggable() {
			return nodesDraggable();
		},
		get nodesConnectable() {
			return nodesConnectable();
		},
		get elementsSelectable() {
			return elementsSelectable();
		},
		get nodesFocusable() {
			return nodesFocusable();
		},
		get edgesFocusable() {
			return edgesFocusable();
		},
		get disableKeyboardA11y() {
			return disableKeyboardA11y();
		},

		get minZoom() {
			return minZoom();
		},
		set minZoom(v) {
			/* handled by actions */
		},
		get maxZoom() {
			return maxZoom();
		},
		set maxZoom(v) {
			/* handled by actions */
		},

		get nodeOrigin() {
			return nodeOrigin();
		},
		get nodeExtent() {
			return nodeExtent();
		},
		get translateExtent() {
			return translateExtent();
		},
		set translateExtent(v) {
			/* handled by actions */
		},

		get defaultEdgeOptions() {
			return defaultEdgeOptions();
		},
		get nodeDragThreshold() {
			return nodeDragThreshold();
		},
		get autoPanOnNodeDrag() {
			return autoPanOnNodeDrag();
		},
		get autoPanOnConnect() {
			return autoPanOnConnect();
		},
		get autoPanOnNodeFocus() {
			return autoPanOnNodeFocus();
		},
		get autoPanSpeed() {
			return autoPanSpeed();
		},
		get connectionDragThreshold() {
			return connectionDragThreshold();
		},

		get fitViewQueued() {
			return fitViewQueued;
		},
		set fitViewQueued(v) {
			fitViewQueued = v;
		},
		get fitViewOptions() {
			return fitViewOptions;
		},
		set fitViewOptions(v) {
			fitViewOptions = v;
		},
		get fitViewResolver() {
			return fitViewResolver;
		},
		set fitViewResolver(v) {
			fitViewResolver = v;
		},

		get snapGrid() {
			return snapGrid();
		},

		get dragging() {
			return dragging();
		},
		set dragging(v) {
			setDragging(v);
		},
		get selectionRect() {
			return selectionRect();
		},
		set selectionRect(v) {
			setSelectionRect(v);
		},

		get selectionKeyPressed() {
			return selectionKeyPressed();
		},
		set selectionKeyPressed(v) {
			setSelectionKeyPressed(v);
		},
		get multiselectionKeyPressed() {
			return multiselectionKeyPressed();
		},
		set multiselectionKeyPressed(v) {
			setMultiselectionKeyPressed(v);
		},
		get deleteKeyPressed() {
			return deleteKeyPressed();
		},
		set deleteKeyPressed(v) {
			setDeleteKeyPressed(v);
		},
		get panActivationKeyPressed() {
			return panActivationKeyPressed();
		},
		set panActivationKeyPressed(v) {
			setPanActivationKeyPressed(v);
		},
		get zoomActivationKeyPressed() {
			return zoomActivationKeyPressed();
		},
		set zoomActivationKeyPressed(v) {
			setZoomActivationKeyPressed(v);
		},
		get selectionRectMode() {
			return selectionRectMode();
		},
		set selectionRectMode(v) {
			setSelectionRectMode(v);
		},
		get ariaLiveMessage() {
			return ariaLiveMessage();
		},
		set ariaLiveMessage(v) {
			setAriaLiveMessage(v);
		},

		get selectionMode() {
			return selectionMode();
		},

		get nodeTypes() {
			return nodeTypes();
		},
		set nodeTypes(_v) {
			/* derived from props */
		},
		get edgeTypes() {
			return edgeTypes();
		},
		set edgeTypes(_v) {
			/* derived from props */
		},

		get noPanClass() {
			return noPanClass();
		},
		get noDragClass() {
			return noDragClass();
		},
		get noWheelClass() {
			return noWheelClass();
		},
		get ariaLabelConfig() {
			return ariaLabelConfig();
		},

		get viewport() {
			return viewport();
		},
		set viewport(v: Viewport) {
			if (signals.viewport) {
				signals.viewport = v;
			}
			set_Viewport(v);
		},

		get _connection() {
			return _connection();
		},
		set _connection(v) {
			set_Connection(v);
		},
		get connection() {
			return connection();
		},
		get connectionMode() {
			return connectionMode();
		},
		get connectionRadius() {
			return connectionRadius();
		},
		get isValidConnection() {
			return isValidConnection();
		},

		get selectNodesOnDrag() {
			return selectNodesOnDrag();
		},

		get defaultMarkerColor() {
			return defaultMarkerColor();
		},
		get markers() {
			return markers();
		},
		get onlyRenderVisibleElements() {
			return onlyRenderVisibleElements();
		},
		get onerror() {
			return onerror();
		},

		get ondelete() {
			return ondelete();
		},
		get onbeforedelete() {
			return onbeforedelete();
		},
		get onbeforeconnect() {
			return onbeforeconnect();
		},
		get onconnect() {
			return onconnect();
		},
		get onconnectstart() {
			return onconnectstart();
		},
		get onconnectend() {
			return onconnectend();
		},
		get onbeforereconnect() {
			return onbeforereconnect();
		},
		get onreconnect() {
			return onreconnect();
		},
		get onreconnectstart() {
			return onreconnectstart();
		},
		get onreconnectend() {
			return onreconnectend();
		},

		get clickConnect() {
			return clickConnect();
		},
		get onclickconnectstart() {
			return onclickconnectstart();
		},
		get onclickconnectend() {
			return onclickconnectend();
		},
		get clickConnectStartHandle() {
			return clickConnectStartHandle();
		},
		set clickConnectStartHandle(v) {
			setClickConnectStartHandle(v);
		},

		get onselectiondrag() {
			return onselectiondrag();
		},
		get onselectiondragstart() {
			return onselectiondragstart();
		},
		get onselectiondragstop() {
			return onselectiondragstop();
		},

		get colorMode() {
			return colorMode();
		},

		resolveFitView,
		resetStoreValues,
	};

	return store;
}
