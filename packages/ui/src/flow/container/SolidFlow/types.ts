import type { AriaLabelConfig, ColorMode, ColorModeClass, ConnectionLineType, ConnectionMode, CoordinateExtent, NodeOrigin, OnConnect, OnConnectEnd, OnConnectStart, OnError, OnMove, OnReconnect, OnReconnectEnd, OnReconnectStart, PanelPosition, PanOnScrollMode, SelectionMode, SnapGrid, Viewport, ZIndexMode, } from "@xyflow/system";
import type { JSX } from "@solidjs/web";


import type {
	DefaultEdgeOptions,
	Edge,
	EdgeEvents,
	EdgeTypes,
	FitViewOptions,
	IsValidConnection,
	KeyDefinition,
	Node,
	NodeEvents,
	NodeSelectionEvents,
	NodeTypes,
	OnBeforeConnect,
	OnBeforeDelete,
	OnBeforeReconnect,
	OnDelete,
	OnSelectionChange,
	OnSelectionDrag,
	PaneEvents,
} from "../../types";

/**
 * SolidFlow component props.
 * This is a stub — will be fully fleshed out when the SolidFlow container is ported.
 */
export type SolidFlowProps<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = {
	id?: string;
	nodes: NodeType[];
	edges: EdgeType[];
	children?: JSX.Element;
	class?: string;
	style?: JSX.CSSProperties | string;
	width?: number;
	height?: number;
	viewport?: Viewport;
	initialViewport?: Viewport;

	// Node options
	nodeTypes?: NodeTypes;
	nodeOrigin?: NodeOrigin;
	nodeExtent?: CoordinateExtent;
	nodesDraggable?: boolean;
	nodesConnectable?: boolean;
	nodesFocusable?: boolean;
	nodeDragThreshold?: number;
	elevateNodesOnSelect?: boolean;
	selectNodesOnDrag?: boolean;

	// Edge options
	edgeTypes?: EdgeTypes;
	defaultEdgeOptions?: DefaultEdgeOptions;
	elevateEdgesOnSelect?: boolean;
	edgesFocusable?: boolean;

	// Selection
	elementsSelectable?: boolean;
	selectionMode?: SelectionMode;
	selectionKey?: KeyDefinition | KeyDefinition[] | null;
	multiSelectionKey?: KeyDefinition | KeyDefinition[] | null;
	deleteKey?: KeyDefinition | KeyDefinition[] | null;
	panActivationKey?: KeyDefinition | KeyDefinition[] | null;
	zoomActivationKey?: KeyDefinition | KeyDefinition[] | null;

	// Viewport controls
	fitView?: boolean;
	fitViewOptions?: FitViewOptions;
	minZoom?: number;
	maxZoom?: number;
	translateExtent?: CoordinateExtent;
	snapGrid?: SnapGrid;

	// Pan/zoom
	panOnDrag?: boolean | number[];
	panOnScroll?: boolean;
	panOnScrollMode?: PanOnScrollMode;
	panOnScrollSpeed?: number;
	selectionOnDrag?: boolean;
	zoomOnScroll?: boolean;
	zoomOnDoubleClick?: boolean;
	zoomOnPinch?: boolean;
	preventScrolling?: boolean;
	zoomActivationKeyCode?: string;
	paneClickDistance?: number;
	nodeClickDistance?: number;

	// Connection
	connectionMode?: ConnectionMode;
	connectionRadius?: number;
	connectionLineType?: ConnectionLineType;
	connectionLineStyle?: string;
	connectionLineContainerStyle?: string;
	connectionLineComponent?: any;
	isValidConnection?: IsValidConnection;
	clickConnect?: boolean;
	connectionDragThreshold?: number;

	// Auto-pan
	autoPanOnNodeDrag?: boolean;
	autoPanOnConnect?: boolean;
	autoPanOnNodeFocus?: boolean;
	autoPanSpeed?: number;

	// Rendering
	onlyRenderVisibleElements?: boolean;
	zIndexMode?: ZIndexMode;

	// Color mode
	colorMode?: ColorMode;
	colorModeSSR?: ColorModeClass;

	// Style classes
	noPanClass?: string;
	noDragClass?: string;
	noWheelClass?: string;

	// Accessibility
	disableKeyboardA11y?: boolean;
	ariaLabelConfig?: AriaLabelConfig;
	attributionPosition?: PanelPosition;
	proOptions?: any;

	// Callbacks
	onflowerror?: OnError;
	ondelete?: OnDelete<NodeType, EdgeType>;
	onbeforedelete?: OnBeforeDelete<NodeType, EdgeType>;
	onbeforeconnect?: OnBeforeConnect;
	onconnect?: OnConnect;
	onconnectstart?: OnConnectStart;
	onconnectend?: OnConnectEnd;
	onbeforereconnect?: OnBeforeReconnect<EdgeType>;
	onreconnect?: OnReconnect<EdgeType>;
	onreconnectstart?: OnReconnectStart<EdgeType>;
	onreconnectend?: OnReconnectEnd<EdgeType>;
	onclickconnectstart?: OnConnectStart;
	onclickconnectend?: OnConnectEnd;
	onselectiondrag?: OnSelectionDrag<NodeType>;
	onselectiondragstart?: OnSelectionDrag<NodeType>;
	onselectiondragstop?: OnSelectionDrag<NodeType>;
	onselectionchange?: OnSelectionChange<NodeType, EdgeType>;
	onMoveStart?: OnMove;
	onMove?: OnMove;
	onMoveEnd?: OnMove;

	defaultMarkerColor?: string | null;
} & NodeEvents<NodeType> &
	NodeSelectionEvents<NodeType> &
	PaneEvents &
	EdgeEvents<EdgeType>;
