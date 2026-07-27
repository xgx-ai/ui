import {
  areConnectionMapsEqual,
  type Connection,
  ConnectionMode,
  type ConnectionState,
  getHostForElement,
  type HandleConnection,
  handleConnectionChange,
  isMouseEvent,
  type Optional,
  Position,
  XYHandle,
} from "@xyflow/system";
import { createMemo, createRenderEffect, omit } from "solid-js";

import { useStore } from "../../store";
import { getNodeConnectableContext, getNodeIdContext } from "../../store/context";
import type { HandleProps } from "./types";

export function Handle(allProps: HandleProps) {
  const props = allProps;
  const rest = omit(
    allProps,
    "id",
    "type",
    "position",
    "style",
    "class",
    "isConnectable",
    "isConnectableStart",
    "isConnectableEnd",
    "isValidConnection",
    "onconnect",
    "ondisconnect",
    "children",
  );

  const handleId = () => props.id ?? null;
  const type = () => props.type ?? "source";
  const position = () => props.position ?? Position.Top;
  const isConnectableStart = () => props.isConnectableStart ?? true;
  const isConnectableEnd = () => props.isConnectableEnd ?? true;

  const nodeId = getNodeIdContext("Handle must be used within a Custom Node component");
  const isConnectableContext = getNodeConnectableContext(
    "Handle must be used within a Custom Node component",
  );

  const isTarget = createMemo(() => type() === "target");
  const isConnectable = createMemo(() =>
    props.isConnectable !== undefined
      ? props.isConnectable
      : typeof isConnectableContext.value === "function"
        ? isConnectableContext.value()
        : isConnectableContext.value,
  );

  const store = useStore();

  let prevConnections: Map<string, HandleConnection> | null = null;
  createRenderEffect(
    () => {
      if (props.onconnect || props.ondisconnect) {
        // Access edges to trigger reactivity
        store.edges;
        return (
          store.connectionLookup.get(`${nodeId}-${type()}${handleId() ? `-${handleId()}` : ""}`) ??
          new Map()
        );
      }
      return null;
    },
    (connections) => {
      if (!connections) return;

      if (prevConnections && !areConnectionMapsEqual(connections, prevConnections)) {
        const _connections = connections ?? new Map();
        handleConnectionChange(prevConnections, _connections, props.ondisconnect);
        handleConnectionChange(_connections, prevConnections, props.onconnect);
      }

      prevConnections = new Map(connections);
    },
  );

  const connectionState = createMemo(() => {
    if (!store.connection.inProgress) {
      return [false, false, false, false, null] as const;
    }

    const { fromHandle, toHandle, isValid } = store.connection;

    const connectingFrom =
      fromHandle &&
      fromHandle.nodeId === nodeId &&
      fromHandle.type === type() &&
      fromHandle.id === handleId();

    const connectingTo =
      toHandle &&
      toHandle.nodeId === nodeId &&
      toHandle.type === type() &&
      toHandle.id === handleId();

    const isPossibleTargetHandle =
      store.connectionMode === ConnectionMode.Strict
        ? fromHandle?.type !== type()
        : nodeId !== fromHandle?.nodeId || handleId() !== fromHandle?.id;

    const valid = connectingTo && isValid;

    return [true, connectingFrom, connectingTo, isPossibleTargetHandle, valid] as const;
  });

  function onConnectExtended(connection: Connection) {
    const edge = store.onbeforeconnect ? store.onbeforeconnect(connection) : connection;
    if (!edge) return;
    store.addEdge(edge);
    store.onconnect?.(connection);
  }

  function onpointerdown(event: MouseEvent | TouchEvent) {
    const isMouseTriggered = isMouseEvent(event);

    if (
      event.currentTarget &&
      ((isMouseTriggered && (event as MouseEvent).button === 0) || !isMouseTriggered)
    ) {
      XYHandle.onPointerDown(event, {
        handleId: handleId(),
        nodeId,
        isTarget: isTarget(),
        connectionRadius: store.connectionRadius,
        domNode: store.domNode,
        nodeLookup: store.nodeLookup,
        connectionMode: store.connectionMode,
        lib: "xy",
        autoPanOnConnect: store.autoPanOnConnect,
        autoPanSpeed: store.autoPanSpeed,
        flowId: store.flowId,
        isValidConnection:
          props.isValidConnection || ((...args) => store.isValidConnection?.(...args) ?? true),
        updateConnection: store.updateConnection,
        cancelConnection: store.cancelConnection,
        panBy: store.panBy,
        onConnect: onConnectExtended,
        onConnectStart: store.onconnectstart,
        onConnectEnd: (...args) => store.onconnectend?.(...args),
        getTransform: () => [store.viewport.x, store.viewport.y, store.viewport.zoom],
        getFromHandle: () => store.connection.fromHandle,
        dragThreshold: store.connectionDragThreshold,
        handleDomNode: event.currentTarget as HTMLElement,
      });
    }
  }

  function onclick(event: MouseEvent) {
    if (!nodeId || (!store.clickConnectStartHandle && !isConnectableStart())) {
      return;
    }

    if (!store.clickConnectStartHandle) {
      store.onclickconnectstart?.(event, {
        nodeId,
        handleId: handleId(),
        handleType: type(),
      });
      store.clickConnectStartHandle = { nodeId, type: type(), id: handleId() };
      return;
    }

    const doc = getHostForElement(event.target);
    const isValidConnectionHandler = props.isValidConnection ?? store.isValidConnection;

    const { connectionMode, clickConnectStartHandle, flowId, nodeLookup } = store;
    const { connection, isValid } = XYHandle.isValid(event, {
      handle: {
        nodeId,
        id: handleId(),
        type: type(),
      },
      connectionMode,
      fromNodeId: clickConnectStartHandle.nodeId,
      fromHandleId: clickConnectStartHandle.id ?? null,
      fromType: clickConnectStartHandle.type,
      isValidConnection: isValidConnectionHandler,
      flowId,
      doc,
      lib: "xy",
      nodeLookup,
    });

    if (isValid && connection) {
      onConnectExtended(connection);
    }

    const connectionClone = structuredClone(store.connection) as Optional<
      ConnectionState,
      "inProgress"
    >;
    delete connectionClone.inProgress;
    connectionClone.toPosition = connectionClone.toHandle
      ? connectionClone.toHandle.position
      : null;
    store.onclickconnectend?.(event, connectionClone);

    store.clickConnectStartHandle = null;
  }

  const [connectionInProgress, connectingFrom, connectingTo, isPossibleTargetHandle, valid] = [
    () => connectionState()[0],
    () => connectionState()[1],
    () => connectionState()[2],
    () => connectionState()[3],
    () => connectionState()[4],
  ];

  return (
    <div
      data-handleid={handleId()}
      data-nodeid={nodeId}
      data-handlepos={position()}
      data-id={`${store.flowId}-${nodeId}-${handleId() ?? "null"}-${type()}`}
      class={[
        "xy-flow__handle",
        `xy-flow__handle-${position()}`,
        store.noDragClass,
        store.noPanClass,
        position(),
        valid() ? "valid" : "",
        connectingTo() ? "connectingto" : "",
        connectingFrom() ? "connectingfrom" : "",
        !isTarget() ? "source" : "target",
        isConnectableStart() ? "connectablestart" : "",
        isConnectableEnd() ? "connectableend" : "",
        isConnectable() ? "connectable" : "",
        isConnectable() &&
        (!connectionInProgress() || isPossibleTargetHandle()) &&
        (connectionInProgress() || store.clickConnectStartHandle
          ? isConnectableEnd()
          : isConnectableStart())
          ? "connectionindicator"
          : "",
        props.class ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseDown={onpointerdown}
      onTouchStart={onpointerdown}
      onClick={store.clickConnect ? onclick : undefined}
      style={props.style}
      role="button"
      aria-label={store.ariaLabelConfig[`handle.ariaLabel`]}
      tabindex="-1"
      {...rest}
    >
      {props.children}
    </div>
  );
}
