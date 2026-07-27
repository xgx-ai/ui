// @ts-nocheck
import { omit } from "solid-js";

import type { PanelProps } from "./types";

export function Panel(allProps: PanelProps) {
  const props = allProps;
  const rest = omit(allProps, "position", "style", "class", "children");

  const positionClasses = () => `${props.position ?? "top-right"}`.split("-").join(" ");

  return (
    <div
      class={`xy-flow__panel ${positionClasses()} ${props.class ?? ""}`}
      style={props.style}
      {...rest}
    >
      {props.children}
    </div>
  );
}
