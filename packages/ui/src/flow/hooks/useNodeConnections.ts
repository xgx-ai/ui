// @ts-nocheck
import { areConnectionMapsEqual, type HandleConnection, type HandleType, handleConnectionChange, type NodeConnection, } from "@xyflow/system";
import { createMemo, createRenderEffect } from "solid-js";
import { getNodeIdContext } from "../store/context";
import { useStore } from "./useStore";

type UseNodeConnectionsParams = {
	id?: string;
	handleType?: HandleType;
	handleId?: string;
	onConnect?: (connections: HandleConnection[]) => void;
	onDisconnect?: (connections: HandleConnection[]) => void;
};

type ConnectionMap = Map<string, NodeConnection>;

const initialConnections: NodeConnection[] = [];

export function useNodeConnections({
	id,
	handleType,
	handleId,
	onConnect,
	onDisconnect,
}: UseNodeConnectionsParams = {}) {
	const store = useStore();
	const contextNodeId = getNodeIdContext();
	const nodeId = id ?? contextNodeId;

	let connectionMaps: { previous: ConnectionMap; next: ConnectionMap } = {
		previous: new Map(),
		next: new Map(),
	};
	let connectionsArray: NodeConnection[] = initialConnections;

	const connections = createMemo(() => {
		// Access edges to track changes
		store.edges;

		const prevConnections = connectionMaps.next;
		const nextConnections =
			store.connectionLookup.get(
				`${nodeId}${handleType ? (handleId ? `-${handleType}-${handleId}` : `-${handleType}`) : ""}`,
			) ?? new Map();

		if (!areConnectionMapsEqual(nextConnections, prevConnections)) {
			connectionMaps = {
				previous: prevConnections,
				next: nextConnections,
			};
			connectionsArray = Array.from(
				nextConnections.values() || initialConnections,
			);
		}
		return connectionsArray;
	});

	createRenderEffect(connections, () => {
		if (onConnect) {
			handleConnectionChange(
				connectionMaps.next,
				connectionMaps.previous,
				onConnect,
			);
		}

		if (onDisconnect) {
			handleConnectionChange(
				connectionMaps.previous,
				connectionMaps.next,
				onDisconnect,
			);
		}
	});

	return {
		get current() {
			return connections();
		},
	};
}
