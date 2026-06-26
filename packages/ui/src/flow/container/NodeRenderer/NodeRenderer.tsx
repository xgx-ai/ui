// @ts-nocheck
import {
	elementSelectionKeys,
	isInputDOMNode,
	nodeHasDimensions,
	XYDrag,
	type XYDragParams,
} from "@xyflow/system";
import type { JSX } from "@solidjs/web";
import { createMemo, createRenderEffect, For, onCleanup, untrack } from "solid-js";
import { DefaultNode } from "../../components/nodes/DefaultNode";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { NodeConnectableContext, NodeIdContext } from "../../store/context";
import type { SolidFlowStore } from "../../store/types";
import type {
	Edge,
	InternalNode,
	Node,
	NodeEvents,
	NodeTargetEventWithPointer,
} from "../../types";
import { arrowKeyDiffs, toPxString } from "../../utils";

type NodeRendererProps<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = {
	store: SolidFlowStore<NodeType, EdgeType>;
	nodeClickDistance?: number;
} & NodeEvents<NodeType>;

function serialiseStyleObject(style: JSX.CSSProperties) {
	return Object.entries(style)
		.map(([key, value]) => `${key}:${value}`)
		.join(";");
}

export function NodeRenderer<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
>(props: NodeRendererProps<NodeType, EdgeType>) {
	const store = untrack(() => props.store);
	const resizeObserver: ResizeObserver | null =
		typeof ResizeObserver === "undefined"
			? null
			: new ResizeObserver((entries) => {
					const updates = new Map();
					for (const entry of entries) {
						const id = entry.target.getAttribute("data-id") as string;
						updates.set(id, {
							id,
							nodeElement: entry.target as HTMLDivElement,
						});
					}
					store.updateNodeInternals(updates);
				});

	onCleanup(() => {
		resizeObserver?.disconnect();
	});

	const nodeEntries = () => Array.from(store.visible.nodes.values());

	return (
		<div class="xy-flow__nodes">
			<For each={nodeEntries()}>
				{(node) => (
					<NodeWrapper
						node={node}
						store={store}
						resizeObserver={resizeObserver}
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
				)}
			</For>
		</div>
	);
}

function NodeWrapper<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
>(
	props: {
		node: InternalNode<NodeType>;
		store: SolidFlowStore<NodeType, EdgeType>;
		resizeObserver: ResizeObserver | null;
		nodeClickDistance?: number;
	} & NodeEvents<NodeType>,
) {
	const store = untrack(() => props.store);
	const id = untrack(() => props.node.id);
	const initialNode = untrack(() => props.node);

	let nodeRef!: HTMLDivElement;
	let dragInstance: ReturnType<typeof XYDrag> | null = null;
	let observedNodeRef: HTMLDivElement | null = null;

	// Re-read node from the lookup whenever store.nodes changes.
	// adoptUserNodes mutates InternalNode objects in place, so we need
	// to subscribe to the nodes signal to know when positions changed.
	const node = createMemo(() => {
		// subscribing to store.nodes forces re-evaluation after every drag / update
		void store.nodes;
		return store.nodeLookup.get(id) ?? initialNode;
	});

	const draggable = () => node().draggable ?? store.nodesDraggable;
	const selectable = () => node().selectable ?? store.elementsSelectable;
	const connectable = () => node().connectable ?? store.nodesConnectable;
	const focusable = () => node().focusable ?? store.nodesFocusable;
	const hasDimensions = () => nodeHasDimensions(node());

	const getNodeComponent = () =>
		store.nodeTypes[node().type ?? "default"] ?? DefaultNode;

	function RenderNodeComponent(nodeProps: any) {
		const Comp = getNodeComponent();
		return <Comp {...nodeProps} />;
	}

	const nodeStyle = createMemo(() => {
		const n = node();
		const measured = n.measured;
		const measuredWidth = measured?.width;
		const measuredHeight = measured?.height;
		const w =
			measuredWidth === undefined ? (n.width ?? n.initialWidth) : n.width;
		const h =
			measuredHeight === undefined ? (n.height ?? n.initialHeight) : n.height;

		const baseStyle: JSX.CSSProperties = {
			transform: `translate(${n.internals.positionAbsolute.x}px, ${n.internals.positionAbsolute.y}px)`,
			"z-index": n.internals.z,
			visibility: hasDimensions() ? "visible" : "hidden",
			...(w != null ? { width: toPxString(w) } : {}),
			...(h != null ? { height: toPxString(h) } : {}),
		};
		const customStyle = n.style;

		if (typeof customStyle === "string") {
			const stylePrefix =
				customStyle.length > 0 && !customStyle.trimEnd().endsWith(";")
					? `${customStyle};`
					: customStyle;
			return `${stylePrefix}${serialiseStyleObject(baseStyle)}`;
		}

		return {
			...(typeof customStyle === "object" && customStyle !== null
				? customStyle
				: {}),
			...baseStyle,
		};
	});

	const ensureDragInstance = () => {
		if (!nodeRef || dragInstance) {
			return;
		}

		dragInstance = XYDrag({
			onDrag: (event: any, _: any, targetNode: any, nodes: any) => {
				props.onNodeDrag?.({
					event,
					targetNode: targetNode as NodeType,
					nodes: nodes as NodeType[],
				});
			},
			onDragStart: (event: any, _: any, targetNode: any, nodes: any) => {
				props.onNodeDragStart?.({
					event,
					targetNode: targetNode as NodeType,
					nodes: nodes as NodeType[],
				});
			},
			onDragStop: (event: any, _: any, targetNode: any, nodes: any) => {
				props.onNodeDragStop?.({
					event,
					targetNode: targetNode as NodeType,
					nodes: nodes as NodeType[],
				});
			},
			onNodeMouseDown: (nodeId: string) => {
				store.handleNodeSelection(nodeId);
			},
			getStoreItems: () => {
				const { snapGrid, viewport } = store;
				return {
					nodes: store.nodes,
					nodeLookup: store.nodeLookup,
					edges: store.edges,
					nodeExtent: store.nodeExtent,
					snapGrid: snapGrid ? snapGrid : [0, 0],
					snapToGrid: !!snapGrid,
					nodeOrigin: store.nodeOrigin,
					multiSelectionActive: store.multiselectionKeyPressed,
					domNode: store.domNode,
					transform: [viewport.x, viewport.y, viewport.zoom],
					autoPanOnNodeDrag: store.autoPanOnNodeDrag,
					nodesDraggable: store.nodesDraggable,
					selectNodesOnDrag: store.selectNodesOnDrag,
					nodeDragThreshold: store.nodeDragThreshold,
					unselectNodesAndEdges: store.unselectNodesAndEdges,
					updateNodePositions: store.updateNodePositions,
					onSelectionDrag: store.onselectiondrag,
					onSelectionDragStart: store.onselectiondragstart,
					onSelectionDragStop: store.onselectiondragstop,
					panBy: store.panBy,
				};
			},
		} as XYDragParams<
			NodeTargetEventWithPointer<MouseEvent | TouchEvent, NodeType>
		>);
	};

	const updateDragInstance = () => {
		if (!nodeRef) {
			return;
		}

		ensureDragInstance();
		if (!dragInstance) {
			return;
		}

		if (!draggable()) {
			dragInstance.destroy();
			dragInstance = null;
			return;
		}

		dragInstance.update({
			domNode: nodeRef,
			noDragClassName: store.noDragClass,
			handleSelector: node().dragHandle,
			nodeId: id,
			isSelectable: selectable(),
			nodeClickDistance: props.nodeClickDistance,
		});
	};

	// Update drag instance reactively
	createRenderEffect(
		() => [draggable(), node().dragHandle, selectable(), props.nodeClickDistance] as const,
		updateDragInstance,
	);

	onCleanup(() => {
		dragInstance?.destroy();
	});

	const observeAndMeasureNode = () => {
		if (!nodeRef) {
			return;
		}

		if (props.resizeObserver && observedNodeRef !== nodeRef) {
			if (observedNodeRef) {
				props.resizeObserver.unobserve(observedNodeRef);
			}
			props.resizeObserver.observe(nodeRef);
			observedNodeRef = nodeRef;
		}

		// Force initial handle bounds measurement after handles are rendered
		requestAnimationFrame(() => {
			if (nodeRef) {
				store.updateNodeInternals(
					new Map([[id, { id, nodeElement: nodeRef, force: true }]]),
				);
			}
		});
	};

	onCleanup(() => {
		if (props.resizeObserver && observedNodeRef) {
			props.resizeObserver.unobserve(observedNodeRef);
		}
	});

	function onSelectNodeHandler(event: MouseEvent | TouchEvent) {
		if (
			selectable() &&
			(!store.selectNodesOnDrag || !draggable() || store.nodeDragThreshold > 0)
		) {
			store.handleNodeSelection(id);
		}
		props.onNodeClick?.({ node: node().internals.userNode, event });
	}

	function onKeyDown(event: KeyboardEvent) {
		if (isInputDOMNode(event) || store.disableKeyboardA11y) return;

		if (elementSelectionKeys.includes(event.key) && selectable()) {
			const unselect = event.key === "Escape";
			store.handleNodeSelection(id, unselect, nodeRef);
		} else if (
			draggable() &&
			node().selected &&
			Object.hasOwn(arrowKeyDiffs, event.key)
		) {
			event.preventDefault();
			store.moveSelectedNodes(arrowKeyDiffs[event.key], event.shiftKey ? 4 : 1);
		}
	}

	return (
		<NodeIdContext value={id}>
			<NodeConnectableContext value={{ value: connectable }}>
				<div
					ref={(el) => {
						nodeRef = el;
						updateDragInstance();
						observeAndMeasureNode();
					}}
					data-id={id}
					class={[
						"xy-flow__node",
						`xy-flow__node-${node().type ?? "default"}`,
						node().class ?? "",
						node().dragging ? "dragging" : "",
						node().selected ? "selected" : "",
						draggable() ? "draggable" : "",
						connectable() ? "connectable" : "",
						selectable() ? "selectable" : "",
						draggable() ? "nopan" : "",
						store.parentLookup.has(id) ? "parent" : "",
					]
						.filter(Boolean)
						.join(" ")}
					style={nodeStyle()}
					onClick={onSelectNodeHandler}
					onPointerEnter={
						props.onNodePointerEnter
							? (event) =>
									props.onNodePointerEnter!({
										node: node().internals.userNode,
										event,
									})
							: undefined
					}
					onPointerLeave={
						props.onNodePointerLeave
							? (event) =>
									props.onNodePointerLeave!({
										node: node().internals.userNode,
										event,
									})
							: undefined
					}
					onPointerMove={
						props.onNodePointerMove
							? (event) =>
									props.onNodePointerMove!({
										node: node().internals.userNode,
										event,
									})
							: undefined
					}
					onContextMenu={
						props.onNodeContextMenu
							? (event) =>
									props.onNodeContextMenu!({
										node: node().internals.userNode,
										event,
									})
							: undefined
					}
					onKeyDown={focusable() ? onKeyDown : undefined}
					tabIndex={focusable() ? 0 : undefined}
					role={node().ariaRole ?? (focusable() ? "group" : undefined)}
					aria-roledescription="node"
				>
					<RenderNodeComponent
						id={id}
						data={node().internals.userNode.data}
						type={node().type}
						selected={node().selected}
						dragging={node().dragging}
						zIndex={node().internals.z}
						positionAbsoluteX={node().internals.positionAbsolute.x}
						positionAbsoluteY={node().internals.positionAbsolute.y}
						isConnectable={connectable()}
						sourcePosition={node().sourcePosition}
						targetPosition={node().targetPosition}
						dragHandle={node().dragHandle}
						parentId={node().parentId}
					/>
				</div>
			</NodeConnectableContext>
		</NodeIdContext>
	);
}
