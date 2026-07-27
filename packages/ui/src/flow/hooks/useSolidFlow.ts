import { evaluateAbsolutePosition, type FitBoundsOptions, getElementsToRemove, getNodesBounds, getOverlappingArea, getViewportForBounds, type HandleConnection, type HandleType, isRectObject, nodeToRect, pointToRendererPoint, type Rect, rendererPointToPoint, type SetCenterOptions, type Viewport, type ViewportHelperFunctionOptions, type XYPosition, type ZoomInOut, } from "@xyflow/system";

import type { Edge, FitViewOptions, InternalNode, Node } from "../types";
import { isEdge, isNode } from "../utils";
import { useStore } from "./useStore";

export function useSolidFlow<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
>(): {
	zoomIn: ZoomInOut;
	zoomOut: ZoomInOut;
	getInternalNode: (id: string) => InternalNode<NodeType> | undefined;
	getNode: (id: string) => NodeType | undefined;
	getNodes: (ids?: string[]) => NodeType[];
	getEdge: (id: string) => EdgeType | undefined;
	getEdges: (ids?: string[]) => EdgeType[];
	setZoom: (
		zoomLevel: number,
		options?: ViewportHelperFunctionOptions,
	) => Promise<boolean>;
	getZoom: () => number;
	setCenter: (
		x: number,
		y: number,
		options?: SetCenterOptions,
	) => Promise<boolean>;
	setViewport: (
		viewport: Viewport,
		options?: ViewportHelperFunctionOptions,
	) => Promise<boolean>;
	getViewport: () => Viewport;
	fitView: (options?: FitViewOptions) => Promise<boolean>;
	getIntersectingNodes: (
		nodeOrRect: NodeType | { id: NodeType["id"] } | Rect,
		partially?: boolean,
		nodesToIntersect?: NodeType[],
	) => NodeType[];
	isNodeIntersecting: (
		nodeOrRect: NodeType | { id: NodeType["id"] } | Rect,
		area: Rect,
		partially?: boolean,
	) => boolean;
	fitBounds: (bounds: Rect, options?: FitBoundsOptions) => Promise<boolean>;
	deleteElements: ({
		nodes,
		edges,
	}: {
		nodes?: (Partial<NodeType> & { id: string })[];
		edges?: (Partial<EdgeType> & { id: string })[];
	}) => Promise<{ deletedNodes: NodeType[]; deletedEdges: EdgeType[] }>;
	screenToFlowPosition: (
		clientPosition: XYPosition,
		options?: { snapToGrid: boolean },
	) => XYPosition;
	flowToScreenPosition: (flowPosition: XYPosition) => XYPosition;
	updateNode: (
		id: string,
		nodeUpdate: Partial<NodeType> | ((node: NodeType) => Partial<NodeType>),
		options?: { replace: boolean },
	) => void;
	updateNodeData: (
		id: string,
		dataUpdate:
			| Partial<NodeType["data"]>
			| ((node: NodeType) => Partial<NodeType["data"]>),
		options?: { replace: boolean },
	) => void;
	updateEdge: (
		id: string,
		edgeUpdate: Partial<EdgeType> | ((edge: EdgeType) => Partial<EdgeType>),
		options?: { replace: boolean },
	) => void;
	toObject: () => { nodes: NodeType[]; edges: EdgeType[]; viewport: Viewport };
	getNodesBounds: (
		nodes: (NodeType | InternalNode<NodeType> | string)[],
	) => Rect;
	getHandleConnections: ({
		type,
		id,
		nodeId,
	}: {
		type: HandleType;
		nodeId: string;
		id?: string | null;
	}) => HandleConnection[];
} {
	const store = useStore<NodeType, EdgeType>();

	const getNodeRect = (
		node: NodeType | { id: NodeType["id"] },
	): Rect | null => {
		const nodeToUse = isNode(node) ? node : store.nodeLookup.get(node.id)!;
		const position = nodeToUse.parentId
			? evaluateAbsolutePosition(
					nodeToUse.position,
					nodeToUse.measured,
					nodeToUse.parentId,
					store.nodeLookup,
					store.nodeOrigin,
				)
			: nodeToUse.position;

		const nodeWithPosition = {
			...nodeToUse,
			position,
			width: nodeToUse.measured?.width ?? nodeToUse.width,
			height: nodeToUse.measured?.height ?? nodeToUse.height,
		};

		return nodeToRect(nodeWithPosition);
	};

	function updateNode(
		id: string,
		nodeUpdate: Partial<NodeType> | ((node: NodeType) => Partial<NodeType>),
		options: { replace: boolean } = { replace: false },
	) {
		store.nodes = store.nodes.map((node) => {
			if (node.id === id) {
				const nextNode =
					typeof nodeUpdate === "function" ? nodeUpdate(node) : nodeUpdate;
				return options?.replace && isNode<NodeType>(nextNode)
					? nextNode
					: { ...node, ...nextNode };
			}
			return node;
		});
	}

	function updateEdge(
		id: string,
		edgeUpdate: Partial<EdgeType> | ((edge: EdgeType) => Partial<EdgeType>),
		options: { replace: boolean } = { replace: false },
	) {
		store.edges = store.edges.map((edge) => {
			if (edge.id === id) {
				const nextEdge =
					typeof edgeUpdate === "function" ? edgeUpdate(edge) : edgeUpdate;
				return options.replace && isEdge<EdgeType>(nextEdge)
					? nextEdge
					: { ...edge, ...nextEdge };
			}
			return edge;
		});
	}

	const getInternalNode = (id: string) => store.nodeLookup.get(id);

	return {
		zoomIn: store.zoomIn,
		zoomOut: store.zoomOut,
		getInternalNode,
		getNode: (id) => getInternalNode(id)?.internals.userNode,
		getNodes: (ids) =>
			ids === undefined ? store.nodes : getElements(store.nodeLookup, ids),
		getEdge: (id) => store.edgeLookup.get(id),
		getEdges: (ids) =>
			ids === undefined ? store.edges : getElements(store.edgeLookup, ids),
		setZoom: (zoomLevel, options) => {
			const panZoom = store.panZoom;
			return panZoom
				? panZoom.scaleTo(zoomLevel, options)
				: Promise.resolve(false);
		},
		getZoom: () => store.viewport.zoom,
		setViewport: async (nextViewport, options) => {
			const currentViewport = store.viewport;

			if (!store.panZoom) {
				return Promise.resolve(false);
			}

			await store.panZoom.setViewport(
				{
					x: nextViewport.x ?? currentViewport.x,
					y: nextViewport.y ?? currentViewport.y,
					zoom: nextViewport.zoom ?? currentViewport.zoom,
				},
				options,
			);

			return Promise.resolve(true);
		},
		getViewport: () => ({ ...store.viewport }),
		setCenter: async (x, y, options) => store.setCenter(x, y, options),
		fitView: (options?: FitViewOptions) => store.fitView(options),
		fitBounds: async (bounds: Rect, options?: FitBoundsOptions) => {
			if (!store.panZoom) {
				return Promise.resolve(false);
			}

			const viewport = getViewportForBounds(
				bounds,
				store.width,
				store.height,
				store.minZoom,
				store.maxZoom,
				options?.padding ?? 0.1,
			);

			await store.panZoom.setViewport(viewport, {
				duration: options?.duration,
				ease: options?.ease,
				interpolate: options?.interpolate,
			});

			return Promise.resolve(true);
		},
		getIntersectingNodes: (
			nodeOrRect: NodeType | { id: NodeType["id"] } | Rect,
			partially = true,
			nodesToIntersect?: NodeType[],
		) => {
			const isRect = isRectObject(nodeOrRect);
			const nodeRect = isRect ? nodeOrRect : getNodeRect(nodeOrRect);

			if (!nodeRect) {
				return [];
			}

			return (nodesToIntersect || store.nodes).filter((n) => {
				const internalNode = store.nodeLookup.get(n.id);
				if (!internalNode || (!isRect && n.id === nodeOrRect.id)) {
					return false;
				}

				const currNodeRect = nodeToRect(internalNode);
				const overlappingArea = getOverlappingArea(currNodeRect, nodeRect);
				const partiallyVisible = partially && overlappingArea > 0;

				return (
					partiallyVisible ||
					overlappingArea >= currNodeRect.width * currNodeRect.height ||
					overlappingArea >= nodeRect.width * nodeRect.height
				);
			});
		},
		isNodeIntersecting: (
			nodeOrRect: NodeType | { id: NodeType["id"] } | Rect,
			area: Rect,
			partially = true,
		) => {
			const isRect = isRectObject(nodeOrRect);
			const nodeRect = isRect ? nodeOrRect : getNodeRect(nodeOrRect);

			if (!nodeRect) {
				return false;
			}

			const overlappingArea = getOverlappingArea(nodeRect, area);
			const partiallyVisible = partially && overlappingArea > 0;

			return (
				partiallyVisible ||
				overlappingArea >= area.width * area.height ||
				overlappingArea >= nodeRect.width * nodeRect.height
			);
		},
		deleteElements: async ({
			nodes: nodesToRemove = [],
			edges: edgesToRemove = [],
		}) => {
			const { nodes: matchingNodes, edges: matchingEdges } =
				await getElementsToRemove<NodeType, EdgeType>({
					nodesToRemove,
					edgesToRemove,
					nodes: store.nodes,
					edges: store.edges,
					onBeforeDelete: store.onbeforedelete,
				});

			if (matchingNodes) {
				store.nodes = store.nodes.filter(
					(node) => !matchingNodes.some(({ id }) => id === node.id),
				);
			}

			if (matchingEdges) {
				store.edges = store.edges.filter(
					(edge) => !matchingEdges.some(({ id }) => id === edge.id),
				);
			}

			if (matchingNodes.length > 0 || matchingEdges.length > 0) {
				store.ondelete?.({
					nodes: matchingNodes,
					edges: matchingEdges,
				});
			}

			return {
				deletedNodes: matchingNodes,
				deletedEdges: matchingEdges,
			};
		},
		screenToFlowPosition: (
			position: XYPosition,
			options: { snapToGrid: boolean } = { snapToGrid: true },
		) => {
			if (!store.domNode) {
				return position;
			}

			const _snapGrid = options.snapToGrid ? store.snapGrid : false;
			const { x, y, zoom } = store.viewport;
			const { x: domX, y: domY } = store.domNode.getBoundingClientRect();
			const correctedPosition = {
				x: position.x - domX,
				y: position.y - domY,
			};

			return pointToRendererPoint(
				correctedPosition,
				[x, y, zoom],
				_snapGrid !== null,
				_snapGrid || [1, 1],
			);
		},
		flowToScreenPosition: (position: XYPosition) => {
			if (!store.domNode) {
				return position;
			}

			const { x, y, zoom } = store.viewport;
			const { x: domX, y: domY } = store.domNode.getBoundingClientRect();
			const rendererPosition = rendererPointToPoint(position, [x, y, zoom]);

			return {
				x: rendererPosition.x + domX,
				y: rendererPosition.y + domY,
			};
		},
		toObject: () => {
			return structuredClone({
				nodes: [...store.nodes],
				edges: [...store.edges],
				viewport: { ...store.viewport },
			});
		},
		updateNode,
		updateNodeData: (id, dataUpdate, options) => {
			const node = store.nodeLookup.get(id)?.internals.userNode;

			if (!node) {
				return;
			}

			const nextData =
				typeof dataUpdate === "function" ? dataUpdate(node) : dataUpdate;
			updateNode(id, (node) => ({
				...node,
				data: options?.replace ? nextData : { ...node.data, ...nextData },
			}));
		},
		updateEdge,
		getNodesBounds: (nodes) => {
			return getNodesBounds(nodes, {
				nodeLookup: store.nodeLookup,
				nodeOrigin: store.nodeOrigin,
			});
		},
		getHandleConnections: ({ type, id, nodeId }) =>
			Array.from(
				store.connectionLookup
					.get(`${nodeId}-${type}-${id ?? null}`)
					?.values() ?? [],
			),
	};
}

function getElements<NodeType extends Node = Node>(
	lookup: Map<string, InternalNode<NodeType>>,
	ids: string[],
): NodeType[];
function getElements<EdgeType extends Edge = Edge>(
	lookup: Map<string, EdgeType>,
	ids: string[],
): EdgeType[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getElements(lookup: Map<string, any>, ids: string[]): any[] {
	const result = [];

	for (const id of ids) {
		const item = lookup.get(id);

		if (item) {
			const element = "internals" in item ? item.internals?.userNode : item;
			result.push(element);
		}
	}

	return result;
}
