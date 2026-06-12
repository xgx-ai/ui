import type { JSX } from "@solidjs/web";
import { CircleAlert, CircleCheck, CircleX, Info } from "../../icons.index";

import { For } from "solid-js";
import type { ToastTypes } from "./types";

const bars = Array(12).fill(0);

export function Loader(props: { visible: boolean }) {
  return (
    <div class="sonner-loading-wrapper" data-visible={props.visible}>
      <div class="sonner-spinner">
        <For each={bars}>{() => <div class="sonner-loading-bar" />}</For>
      </div>
    </div>
  );
}

function SuccessIcon() {
  return <CircleCheck aria-hidden="true" class="size-5" />;
}

function WarningIcon() {
  return <CircleAlert aria-hidden="true" class="size-5" />;
}

function InfoIcon() {
  return <Info aria-hidden="true" class="size-5" />;
}

function ErrorIcon() {
  return <CircleX aria-hidden="true" class="size-5" />;
}

export function getAsset(type: ToastTypes): (() => JSX.Element) | null {
  switch (type) {
    case "success":
      return SuccessIcon;

    case "info":
      return InfoIcon;

    case "warning":
      return WarningIcon;

    case "error":
      return ErrorIcon;

    default:
      return null;
  }
}
