// @ts-nocheck
import { omit } from "solid-js";

import type { ControlButtonProps } from "./types";

export function ControlButton(allProps: ControlButtonProps) {
  const props = allProps;
  const rest = omit(
    allProps,
    "class",
    "bgColor",
    "bgColorHover",
    "color",
    "colorHover",
    "borderColor",
    "onClick",
    "children",
  );

  return (
    <button
      type="button"
      onClick={props.onClick}
      class={`xy-flow__controls-button ${props.class ?? ""}`}
      style={{
        "--xy-controls-button-background-color-props": props.bgColor,
        "--xy-controls-button-background-color-hover-props": props.bgColorHover,
        "--xy-controls-button-color-props": props.color,
        "--xy-controls-button-color-hover-props": props.colorHover,
        "--xy-controls-button-border-color-props": props.borderColor,
      }}
      {...rest}
    >
      {props.children}
    </button>
  );
}
