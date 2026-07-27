// @ts-nocheck
import { getEdgeToolbarTransform } from "@xyflow/system";
import { createMemo, omit, Show } from "solid-js";
import { EdgeLabel } from "../../components/EdgeLabel";
import { useStore } from "../../store";
import { getEdgeIdContext } from "../../store/context";
import type { EdgeToolbarProps } from "./types";

export function EdgeToolbar(allProps: EdgeToolbarProps) {
  const props = allProps;
  const rest = omit(
    allProps,
    "x",
    "y",
    "alignX",
    "alignY",
    "isVisible",
    "selectEdgeOnClick",
    "class",
    "children",
  );

  const store = useStore();
  const edgeId = getEdgeIdContext("EdgeToolbar must be used within an edge");

  const isActive = createMemo(() =>
    typeof props.isVisible === "boolean" ? props.isVisible : store.edgeLookup.get(edgeId)?.selected,
  );

  const transform = createMemo(() =>
    getEdgeToolbarTransform(
      props.x,
      props.y,
      store.viewport.zoom,
      props.alignX ?? "center",
      props.alignY ?? "center",
    ),
  );

  return (
    <Show when={isActive()}>
      <EdgeLabel selectEdgeOnClick={props.selectEdgeOnClick} transparent>
        <div
          style={{
            position: "absolute",
            transform: transform(),
            "transform-origin": "0 0",
          }}
          class={`xy-flow__edge-toolbar ${props.class ?? ""}`}
          data-id={edgeId}
          {...rest}
        >
          {props.children}
        </div>
      </EdgeLabel>
    </Show>
  );
}
