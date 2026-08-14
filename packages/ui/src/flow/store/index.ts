import { addEdge as addEdgeUtil, type Connection, type ConnectionState, type CoordinateExtent, calculateNodePosition, errorMessages, getHandlePosition, type InternalNodeUpdate, initialConnection, Position, panBy as panBySystem, type SetCenterOptions, snapPosition, type UpdateConnection, type UpdateNodePositions, updateAbsolutePositions, updateNodeInternals as updateNodeInternalsSystem, type ViewportHelperFunctionOptions, type XYPosition, } from "@xyflow/system";
import { createContext, flush } from "solid-js";

import type {
	Edge,
	EdgeTypes,
	FitViewOptions,
	Node,
	NodeTypes,
} from "../types";
import {
	getInitialStore,
	initialEdgeTypes,
	initialNodeTypes,
} from "./initial-store";
import type {
	SolidFlowStore,
	SolidFlowStoreActions,
	StoreContext,
	StoreSignals,
} from "./types";

export { useStore } from "../hooks/useStore";

// The context erases store generics; useStore restores them at the consumer boundary.
export const StoreContextObj = createContext<StoreContext<any, any>>();

export function createStore<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
>(
	signals: StoreSignals<NodeType, EdgeType>,
): SolidFlowStore<NodeType, EdgeType> {
	const store = getInitialStore<NodeType, EdgeType>(signals);

	function setNodeTypes(nodeTypes: NodeTypes) {
		store.nodeTypes = {
			...initialNodeTypes,
			...nodeTypes,
		};
	}

	function setEdgeTypes(edgeTypes: EdgeTypes) {
		store.edgeTypes = {
			...initialEdgeTypes,
			...edgeTypes,
		};
	}

	function addEdge(edgeParams: EdgeType | Connection) {
		store.edges = addEdgeUtil<EdgeType>(edgeParams, store.edges);
	}

	const updateNodePositions: UpdateNodePositions = (
		nodeDragItems,
		dragging = false,
	) => {
		store.nodes = store.nodes.map((node) => {
			if (
				store.connection.inProgress &&
				store.connection.fromNode.id === node.id
			) {
				const internalNode = store.nodeLookup.get(node.id);
				if (internalNode) {
					store._connection = {
						...store.connection,
						from: getHandlePosition(
							internalNode,
							store.connection.fromHandle,
							Position.Left,
							true,
						),
					};
				}
			}
			const dragItem = nodeDragItems.get(node.id);
			return dragItem
				? { ...node, position: dragItem.position, dragging }
				: node;
		});
	};

	function updateNodeInternals(updates: Map<string, InternalNodeUpdate>) {
		const { changes, updatedInternals } = updateNodeInternalsSystem(
			updates,
			store.nodeLookup,
			store.parentLookup,
			store.domNode,
			store.nodeOrigin,
			store.nodeExtent,
			store.zIndexMode,
		);

		if (!updatedInternals) {
			return;
		}

		updateAbsolutePositions(store.nodeLookup, store.parentLookup, {
			nodeOrigin: store.nodeOrigin,
			nodeExtent: store.nodeExtent,
			zIndexMode: store.zIndexMode,
		});
		store.notifyNodeInternalsUpdated?.();

		if (store.fitViewQueued) {
			store.resolveFitView();
		}

		const newNodes = new Map<string, NodeType>();
		for (const change of changes) {
			const userNode = store.nodeLookup.get(change.id)?.internals.userNode;

			if (!userNode) {
				continue;
			}

			const node = { ...userNode };
			let nodeChanged = false;

			switch (change.type) {
				case "dimensions": {
					const measured = { ...node.measured, ...change.dimensions };
					nodeChanged =
						measured.width !== node.measured?.width ||
						measured.height !== node.measured?.height;

					if (change.setAttributes) {
						const width = change.dimensions?.width ?? node.width;
						const height = change.dimensions?.height ?? node.height;
						nodeChanged =
							nodeChanged || width !== node.width || height !== node.height;
						node.width = width;
						node.height = height;
					}

					node.measured = measured;
					break;
				}
				case "position": {
					const position = change.position ?? node.position;
					nodeChanged =
						position.x !== node.position.x || position.y !== node.position.y;
					node.position = position;
					break;
				}
			}

			if (nodeChanged) {
				newNodes.set(change.id, node);
			}
		}

		if (newNodes.size > 0) {
			store.nodes = store.nodes.map((node) => newNodes.get(node.id) ?? node);
		}
	}

	function fitView(options?: FitViewOptions) {
		const fitViewResolver =
			store.fitViewResolver ?? Promise.withResolvers<boolean>();

		store.fitViewQueued = true;
		store.fitViewOptions = options;
		store.fitViewResolver = fitViewResolver;

		store.nodes = [...store.nodes];

		return fitViewResolver.promise;
	}

	async function setCenter(x: number, y: number, options?: SetCenterOptions) {
		const nextZoom =
			typeof options?.zoom !== "undefined" ? options.zoom : store.maxZoom;
		const currentPanZoom = store.panZoom;

		if (!currentPanZoom) {
			return Promise.resolve(false);
		}

		await currentPanZoom.setViewport(
			{
				x: store.width / 2 - x * nextZoom,
				y: store.height / 2 - y * nextZoom,
				zoom: nextZoom,
			},
			{
				duration: options?.duration,
				ease: options?.ease,
				interpolate: options?.interpolate,
			},
		);

		return Promise.resolve(true);
	}

	function zoomBy(factor: number, options?: ViewportHelperFunctionOptions) {
		const panZoom = store.panZoom;
		if (!panZoom) {
			return Promise.resolve(false);
		}
		return panZoom.scaleBy(factor, options);
	}

	function zoomIn(options?: ViewportHelperFunctionOptions) {
		return zoomBy(1.2, options);
	}

	function zoomOut(options?: ViewportHelperFunctionOptions) {
		return zoomBy(1 / 1.2, options);
	}

	function setMinZoom(minZoom: number) {
		const panZoom = store.panZoom;
		if (panZoom) {
			panZoom.setScaleExtent([minZoom, store.maxZoom]);
			store.minZoom = minZoom;
		}
	}

	function setMaxZoom(maxZoom: number) {
		const panZoom = store.panZoom;
		if (panZoom) {
			panZoom.setScaleExtent([store.minZoom, maxZoom]);
			store.maxZoom = maxZoom;
		}
	}

	function setTranslateExtent(extent: CoordinateExtent) {
		const panZoom = store.panZoom;
		if (panZoom) {
			panZoom.setTranslateExtent(extent);
			store.translateExtent = extent;
		}
	}

	function deselect<T extends Node | Edge>(
		elements: T[],
		elementsToDeselect: Set<string> | null = null,
	): [boolean, T[]] {
		let deselected = false;
		const newElements = elements.map((element) => {
			const shouldDeselect = elementsToDeselect
				? elementsToDeselect.has(element.id)
				: true;
			if (shouldDeselect && element.selected) {
				deselected = true;
				return { ...element, selected: false };
			}
			return element;
		});
		return [deselected, newElements];
	}

	function unselectNodesAndEdges(params?: { nodes?: Node[]; edges?: Edge[] }) {
		const nodesToDeselect = params?.nodes
			? new Set(params.nodes.map((node) => node.id))
			: null;
		const [nodesDeselected, newNodes] = deselect(store.nodes, nodesToDeselect);
		if (nodesDeselected) {
			store.nodes = newNodes;
		}

		const edgesToDeselect = params?.edges
			? new Set(params.edges.map((node) => node.id))
			: null;
		const [edgesDeselected, newEdges] = deselect(store.edges, edgesToDeselect);
		if (edgesDeselected) {
			store.edges = newEdges;
		}
	}

	function addSelectedNodes(ids: string[]) {
		const isMultiSelection = store.multiselectionKeyPressed;

		store.nodes = store.nodes.map((node) => {
			const nodeWillBeSelected = ids.includes(node.id);
			const selected = isMultiSelection
				? node.selected || nodeWillBeSelected
				: nodeWillBeSelected;
			if (!!node.selected !== selected) {
				return { ...node, selected };
			}
			return node;
		});

		if (!isMultiSelection) {
			unselectNodesAndEdges({ nodes: [] });
		}
	}

	function addSelectedEdges(ids: string[]) {
		const isMultiSelection = store.multiselectionKeyPressed;

		store.edges = store.edges.map((edge) => {
			const edgeWillBeSelected = ids.includes(edge.id);
			const selected = isMultiSelection
				? edge.selected || edgeWillBeSelected
				: edgeWillBeSelected;
			if (!!edge.selected !== selected) {
				return { ...edge, selected };
			}
			return edge;
		});

		if (!isMultiSelection) {
			unselectNodesAndEdges({ edges: [] });
		}
	}

	function handleNodeSelection(
		id: string,
		unselect?: boolean,
		nodeRef?: HTMLDivElement | null,
	) {
		const node = store.nodeLookup.get(id);

		if (!node) {
			console.warn("012", errorMessages["error012"](id));
			return;
		}

		store.selectionRect = null;
		store.selectionRectMode = null;

		if (!node.selected) {
			addSelectedNodes([id]);
		} else if (unselect || (node.selected && store.multiselectionKeyPressed)) {
			unselectNodesAndEdges({ nodes: [node], edges: [] });
			requestAnimationFrame(() => nodeRef?.blur());
		}

		/*
		 * XYDrag calls this from `startDrag` and then immediately builds its drag
		 * set from `nodeLookup`, taking every entry whose `selected` is true. The
		 * writes above land on `store.nodes`; `nodeLookup` only catches up when
		 * `adoptUserNodes` re-runs, so without this flush the drag set is built
		 * from the previous selection and the node selected before this one gets
		 * dragged along with it. See docs/solid-2-beta-issues.md S13.
		 */
		flush();
	}

	function handleEdgeSelection(id: string) {
		const edge = store.edgeLookup.get(id);

		if (!edge) {
			console.warn("012", errorMessages["error012"](id));
			return;
		}

		const selectable =
			edge.selectable ||
			(store.elementsSelectable && typeof edge.selectable === "undefined");

		if (selectable) {
			store.selectionRect = null;
			store.selectionRectMode = null;

			if (!edge.selected) {
				addSelectedEdges([id]);
			} else if (edge.selected && store.multiselectionKeyPressed) {
				unselectNodesAndEdges({ nodes: [], edges: [edge] });
			}
		}
	}

	function moveSelectedNodes(direction: XYPosition, factor: number) {
		const {
			nodeExtent,
			snapGrid,
			nodeOrigin,
			nodeLookup,
			nodesDraggable,
			onerror,
		} = store;

		const nodeUpdates = new Map();
		const xVelo = snapGrid?.[0] ?? 5;
		const yVelo = snapGrid?.[1] ?? 5;

		const xDiff = direction.x * xVelo * factor;
		const yDiff = direction.y * yVelo * factor;

		for (const node of nodeLookup.values()) {
			const isSelected =
				node.selected &&
				(node.draggable ||
					(nodesDraggable && typeof node.draggable === "undefined"));

			if (!isSelected) {
				continue;
			}

			let nextPosition = {
				x: node.internals.positionAbsolute.x + xDiff,
				y: node.internals.positionAbsolute.y + yDiff,
			};

			if (snapGrid) {
				nextPosition = snapPosition(nextPosition, snapGrid);
			}

			const { position, positionAbsolute } = calculateNodePosition({
				nodeId: node.id,
				nextPosition,
				nodeLookup,
				nodeExtent,
				nodeOrigin,
				onError: onerror,
			});

			node.position = position;
			node.internals.positionAbsolute = positionAbsolute;

			nodeUpdates.set(node.id, node);
		}
		updateNodePositions(nodeUpdates);
	}

	function panBy(delta: XYPosition) {
		return panBySystem({
			delta,
			panZoom: store.panZoom,
			transform: [store.viewport.x, store.viewport.y, store.viewport.zoom],
			translateExtent: store.translateExtent,
			width: store.width,
			height: store.height,
		});
	}

	/*
	 * Both of these are driven imperatively by @xyflow/system's XYHandle, which
	 * writes the connection and then reads it straight back inside the same
	 * pointer event — `startConnection()` calls `updateConnection(...)` and the
	 * next line bails out unless `getFromHandle()` already returns the new value.
	 * Solid 2 makes setter writes visible only after the microtask flush, so
	 * without the explicit `flush()` that read sees the previous (empty)
	 * connection and every drag cancels itself on its first move.
	 * See docs/solid-2-beta-issues.md S13.
	 */
	const updateConnection: UpdateConnection = (
		newConnection: ConnectionState,
	) => {
		store._connection = { ...newConnection };
		flush();
	};

	function cancelConnection() {
		store._connection = initialConnection;
		flush();
	}

	function reset() {
		store.resetStoreValues();
		unselectNodesAndEdges();
	}

	const storeWithActions = Object.assign(store, {
		setNodeTypes,
		setEdgeTypes,
		addEdge,
		updateNodePositions,
		updateNodeInternals,
		zoomIn,
		zoomOut,
		fitView,
		setCenter,
		setMinZoom,
		setMaxZoom,
		setTranslateExtent,
		unselectNodesAndEdges,
		addSelectedNodes,
		addSelectedEdges,
		handleNodeSelection,
		handleEdgeSelection,
		moveSelectedNodes,
		panBy,
		updateConnection,
		cancelConnection,
		reset,
	} satisfies SolidFlowStoreActions<NodeType, EdgeType>);

	return storeWithActions;
}
