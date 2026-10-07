import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  type Placement,
  type VirtualElement,
  shift,
  size,
} from "@floating-ui/dom";
import type { ComponentProps, JSX } from "@solidjs/web";
import { createContext, createEffect, createSignal, omit, untrack, useContext } from "solid-js";

import { assignRef } from "./floating";

type PopperContextValue = {
  open: () => boolean;
  /** The content has been positioned and revealed; hidden content cannot take focus. */
  placed: () => boolean;
  setPositionerRef: (element: HTMLElement) => void;
};

// Positioners outside a PopperRoot render unpositioned; they do not need a provider.
const PopperContext = createContext<PopperContextValue | null>(null);

export type PopperAnchorRect = { x: number; y: number; width: number; height: number };

export type PopperRootProps = {
  anchorRef: () => HTMLElement | undefined;
  children?: JSX.Element;
  contentRef: () => HTMLElement | undefined;
  fitViewport?: boolean;
  getAnchorRect?: () => PopperAnchorRect | undefined;
  gutter?: number;
  open: () => boolean;
  overflowPadding?: number;
  placement?: Placement;
  sameWidth?: boolean;
};

export type PopperPositionerProps = ComponentProps<"div">;

type PopperSnapshot = {
  anchor: HTMLElement | VirtualElement | undefined;
  content: HTMLElement | undefined;
  fitViewport: boolean;
  gutter: number;
  open: boolean;
  overflowPadding: number;
  placement: Placement;
  positioner: HTMLElement | undefined;
  sameWidth: boolean;
};

export function PopperRoot(props: PopperRootProps) {
  const [positionerRef, setPositionerRef] = createSignal<HTMLElement>();
  const [placed, setPlaced] = createSignal(false);

  const updatePosition = async (snapshot: PopperSnapshot) => {
    if (!snapshot.anchor || !snapshot.positioner || !snapshot.open) return;

    const { x, y, placement } = await computePosition(snapshot.anchor, snapshot.positioner, {
      middleware: [
        offset(snapshot.gutter),
        flip({ padding: snapshot.overflowPadding }),
        shift({ padding: snapshot.overflowPadding }),
        size({
          padding: snapshot.overflowPadding,
          apply({ availableHeight, availableWidth, rects }) {
            const anchorWidth = Math.round(rects.reference.width);

            snapshot.positioner?.style.setProperty("--xgx-popper-anchor-width", `${anchorWidth}px`);
            snapshot.positioner?.style.setProperty(
              "--xgx-popper-content-available-width",
              `${Math.floor(availableWidth)}px`,
            );
            snapshot.positioner?.style.setProperty(
              "--xgx-popper-content-available-height",
              `${Math.floor(availableHeight)}px`,
            );
            snapshot.positioner?.style.setProperty(
              "--xgx-popper-content-overflow-padding",
              `${snapshot.overflowPadding}px`,
            );

            if (snapshot.sameWidth && snapshot.positioner) {
              snapshot.positioner.style.width = `${anchorWidth}px`;
            }

            if (snapshot.fitViewport && snapshot.positioner) {
              snapshot.positioner.style.maxWidth = `${Math.floor(availableWidth)}px`;
              snapshot.positioner.style.maxHeight = `${Math.floor(availableHeight)}px`;
            }
          },
        }),
      ],
      placement: snapshot.placement,
      strategy: "fixed",
    });

    const origin = transformOrigin(placement);
    for (const element of [snapshot.positioner, snapshot.content]) {
      if (!element) continue;
      element.style.setProperty("--xgx-popper-content-transform-origin", origin);
      element.dataset.side = placement.split("-")[0];
      element.dataset.align = placement.split("-")[1] ?? "center";
    }

    // A position computed for an opening that has since closed must not reveal the content.
    if (!untrack(props.open)) return;
    Object.assign(snapshot.positioner.style, {
      left: "0",
      top: "0",
      transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
      visibility: "visible",
    });
    setPlaced(true);
  };

  createEffect(
    () => {
      const element = props.anchorRef();
      const rect = props.open() ? props.getAnchorRect?.() : undefined;
      const anchor: HTMLElement | VirtualElement | undefined = rect
        ? {
            contextElement: element,
            getBoundingClientRect: () => ({
              ...rect,
              top: rect.y,
              left: rect.x,
              right: rect.x + rect.width,
              bottom: rect.y + rect.height,
            }),
          }
        : element;
      return {
        anchor,
        content: props.contentRef(),
        fitViewport: props.fitViewport ?? false,
        gutter: props.gutter ?? 0,
        open: props.open(),
        overflowPadding: props.overflowPadding ?? 8,
        placement: props.placement ?? "bottom",
        positioner: positionerRef(),
        sameWidth: props.sameWidth ?? false,
      };
    },
    (snapshot) => {
      if (!snapshot.open) {
        if (snapshot.positioner) snapshot.positioner.style.visibility = "hidden";
        setPlaced(false);
        return;
      }

      if (!snapshot.anchor || !snapshot.positioner) return;

      const cleanup = autoUpdate(
        snapshot.anchor,
        snapshot.positioner,
        () => updatePosition(snapshot),
        { elementResize: typeof ResizeObserver === "function" },
      );

      queueMicrotask(() => updatePosition(snapshot));

      const { content, positioner } = snapshot;
      if (content && positioner) {
        queueMicrotask(() => {
          const zIndex = getComputedStyle(content).zIndex;
          if (zIndex && zIndex !== "auto") {
            positioner.style.setProperty("z-index", zIndex);
          }
        });
      }

      return cleanup;
    },
  );

  return (
    <PopperContext value={{ open: props.open, placed, setPositionerRef }}>
      {props.children}
    </PopperContext>
  );
}

/**
 * Whether the floating content has been positioned and revealed, so it can take focus.
 * Content outside a `PopperRoot` is never hidden for positioning, so it reads as placed.
 */
export function usePopperPlaced(): () => boolean {
  const context = useContext(PopperContext);
  return () => context?.placed() ?? true;
}

export function PopperPositioner(props: PopperPositionerProps) {
  const context = useContext(PopperContext);
  const local = props;
  const rest = omit(props, "ref", "style");

  return (
    <div
      data-popper-positioner=""
      ref={(element) => {
        context?.setPositionerRef(element);
        assignRef(local.ref, element);
      }}
      style={mergeStyle(
        {
          left: "0",
          "min-width": "max-content",
          position: "fixed",
          top: "0",
          transform: "translate3d(0, 0, 0)",
          visibility: "hidden",
        },
        local.style,
      )}
      {...rest}
    />
  );
}

function mergeStyle(base: Record<string, string>, style: unknown) {
  if (!style) return base;
  if (typeof style === "string") return `${toStyleString(base)}; ${style}`;
  if (typeof style === "object") return { ...base, ...style };
  return base;
}

function toStyleString(style: Record<string, string>) {
  return Object.entries(style)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}

function transformOrigin(placement: string) {
  const [side, align = "center"] = placement.split("-");
  const crossAxis = align === "start" ? "left" : align === "end" ? "right" : "center";

  if (side === "top") return `${crossAxis} bottom`;
  if (side === "bottom") return `${crossAxis} top`;
  if (side === "left") return "right center";
  if (side === "right") return "left center";
  return "center top";
}

export type { Placement as PopperPlacement };
