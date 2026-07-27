import type {
	Connection,
	CoordinateExtent,
	InternalNodeUpdate,
	SetCenter,
	UpdateConnection,
	UpdateNodePositions,
	Viewport,
	ViewportHelperFunctionOptions,
	XYPosition,
} from "@xyflow/system";
import type { SolidFlowProps } from "../container/SolidFlow";
import type {
	Edge,
	EdgeTypes,
	FitViewOptions,
	Node,
	NodeTypes,
} from "../types";
import type { getInitialStore } from "./initial-store";

export type SolidFlowStoreActions<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = {
	setNodeTypes: (nodeTypes: NodeTypes) => void;
	setEdgeTypes: (edgeTypes: EdgeTypes) => void;
	addEdge: (edge: EdgeType | Connection) => void;
	zoomIn: (options?: ViewportHelperFunctionOptions) => Promise<boolean>;
	zoomOut: (options?: ViewportHelperFunctionOptions) => Promise<boolean>;
	setMinZoom: (minZoom: number) => void;
	setMaxZoom: (maxZoom: number) => void;
	setTranslateExtent: (extent: CoordinateExtent) => void;
	fitView: (options?: FitViewOptions) => Promise<boolean>;
	setCenter: SetCenter;
	updateNodePositions: UpdateNodePositions;
	updateNodeInternals: (updates: Map<string, InternalNodeUpdate>) => void;
	notifyNodeInternalsUpdated?: () => void;
	unselectNodesAndEdges: (params?: {
		nodes?: NodeType[];
		edges?: EdgeType[];
	}) => void;
	addSelectedNodes: (ids: string[]) => void;
	addSelectedEdges: (ids: string[]) => void;
	handleNodeSelection: (
		id: string,
		unselect?: boolean,
		nodeRef?: HTMLDivElement | null,
	) => void;
	handleEdgeSelection: (id: string) => void;
	moveSelectedNodes: (direction: XYPosition, factor: number) => void;
	panBy: (delta: XYPosition) => Promise<boolean>;
	updateConnection: UpdateConnection;
	cancelConnection: () => void;
	reset(): void;
};

export type SolidFlowRestProps<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = Omit<
	SolidFlowProps<NodeType, EdgeType>,
	| "width"
	| "height"
	| "class"
	| "proOptions"
	| "selectionKey"
	| "deleteKey"
	| "panActivationKey"
	| "multiSelectionKey"
	| "zoomActivationKey"
	| "paneClickDistance"
	| "nodeClickDistance"
	| "onMoveStart"
	| "onMoveEnd"
	| "onMove"
	| "onNodeClick"
	| "onNodeContextMenu"
	| "onNodeDrag"
	| "onNodeDragStart"
	| "onNodeDragStop"
	| "onNodePointerEnter"
	| "onNodePointerMove"
	| "onNodePointerLeave"
	| "onSelectionClick"
	| "onSelectionContextMenu"
	| "onEdgeClick"
	| "onEdgeContextMenu"
	| "onEdgePointerEnter"
	| "onEdgePointerLeave"
	| "onPaneClick"
	| "onPaneContextMenu"
	| "panOnScrollMode"
	| "preventScrolling"
	| "zoomOnScroll"
	| "zoomOnDoubleClick"
	| "zoomOnPinch"
	| "panOnScroll"
	| "panOnDrag"
	| "selectionOnDrag"
	| "connectionLineComponent"
	| "connectionLineStyle"
	| "connectionLineContainerStyle"
	| "connectionLineType"
	| "attributionPosition"
	| "children"
	| "nodes"
	| "edges"
	| "viewport"
>;

export type StoreSignals<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = {
	props: SolidFlowRestProps<NodeType, EdgeType>;
	width?: number;
	height?: number;
	nodes: NodeType[];
	edges: EdgeType[];
	viewport?: Viewport;
};

export type SolidFlowStoreState<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = ReturnType<typeof getInitialStore<NodeType, EdgeType>>;

export type SolidFlowStore<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = SolidFlowStoreState<NodeType, EdgeType> &
	SolidFlowStoreActions<NodeType, EdgeType>;

export type StoreContext<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = {
	getStore: () => SolidFlowStore<NodeType, EdgeType>;
	provider: boolean;
};

export type ProviderContext<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = StoreContext<NodeType, EdgeType> & {
	setStore: (store: SolidFlowStore<NodeType, EdgeType>) => void;
};
