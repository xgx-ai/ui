import { omit, Show } from "solid-js";
import type { BaseEdgeProps } from "../../types";
import { EdgeLabel } from "../EdgeLabel";

export function BaseEdge(allProps: BaseEdgeProps) {
  const props = allProps;
  const rest = omit(
    allProps,
    "id",
    "path",
    "label",
    "labelX",
    "labelY",
    "labelStyle",
    "markerStart",
    "markerEnd",
    "style",
    "interactionWidth",
    "class",
  );

  const interactionWidth = () => props.interactionWidth ?? 20;

  return (
    <>
      <path
        id={props.id}
        d={props.path}
        class={`xy-flow__edge-path ${props.class ?? ""}`}
        marker-start={props.markerStart}
        marker-end={props.markerEnd}
        fill="none"
        style={props.style}
      />
      <Show when={interactionWidth() > 0}>
        <path
          d={props.path}
          stroke-opacity={0}
          stroke-width={interactionWidth()}
          fill="none"
          class="xy-flow__edge-interaction"
          {...rest}
        />
      </Show>
      <Show when={props.label}>
        <EdgeLabel x={props.labelX} y={props.labelY} style={props.labelStyle} selectEdgeOnClick>
          {props.label}
        </EdgeLabel>
      </Show>
    </>
  );
}
