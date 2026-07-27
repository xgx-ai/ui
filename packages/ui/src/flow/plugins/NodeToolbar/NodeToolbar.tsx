import { getNodeToolbarTransform, Position } from "@xyflow/system";
import { createMemo, omit, Show } from "solid-js";
import { useSolidFlow } from "../../hooks/useSolidFlow";
import { useStore } from "../../store";
import { getNodeIdContext } from "../../store/context";
import type { InternalNode } from "../../types";
import type { NodeToolbarProps } from "./types";

export function NodeToolbar(allProps: NodeToolbarProps) {
  const props = allProps;
  const rest = omit(allProps, "nodeId", "position", "align", "offset", "isVisible", "children");

  const store = useStore();
  const { getNodesBounds } = useSolidFlow();
  const contextNodeId = getNodeIdContext();

  const toolbarNodes = createMemo(() => {
    store.nodes; // track changes
    const nodeIds = Array.isArray(props.nodeId) ? props.nodeId : [props.nodeId ?? contextNodeId];
    return nodeIds.reduce<InternalNode[]>((res, nodeId) => {
      if (!nodeId) throw new Error("Either pass a nodeId or use within a Custom Node component");
      const node = store.nodeLookup.get(nodeId);
      if (node) res.push(node);
      return res;
    }, []);
  });

  const transform = createMemo(() => {
    const nodeRect = getNodesBounds(toolbarNodes());
    if (nodeRect) {
      return getNodeToolbarTransform(
        nodeRect,
        store.viewport,
        props.position ?? Position.Top,
        props.offset ?? 10,
        props.align ?? "center",
      );
    }
    return "";
  });

  const zIndex = createMemo(() =>
    toolbarNodes().length === 0
      ? 1
      : Math.max(...toolbarNodes().map((node) => (node.internals.z || 5) + 1)),
  );

  const selectedNodesCount = createMemo(() => store.nodes.filter((n) => n.selected).length);

  const isActive = createMemo(() =>
    typeof props.isVisible === "boolean"
      ? props.isVisible
      : toolbarNodes().length === 1 && toolbarNodes()[0].selected && selectedNodesCount() === 1,
  );

  return (
    <Show when={store.domNode && isActive() && toolbarNodes().length > 0}>
      <div
        class="xy-flow__node-toolbar"
        data-id={toolbarNodes()
          .reduce((acc, node) => `${acc}${node.id} `, "")
          .trim()}
        style={{
          position: "absolute",
          transform: transform(),
          "z-index": zIndex(),
        }}
        {...rest}
      >
        {props.children}
      </div>
    </Show>
  );
}
