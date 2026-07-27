// @ts-nocheck
import {
  type ControlPosition,
  ResizeControlVariant,
  XYResizer,
  type XYResizerChange,
  type XYResizerChildChange,
  type XYResizerInstance,
} from "@xyflow/system";
import { createMemo, createRenderEffect, createSignal, omit, onCleanup } from "solid-js";
import { useStore } from "../../store";
import { getNodeIdContext } from "../../store/context";
import type { ResizeControlProps } from "./types";

export function ResizeControl(allProps: ResizeControlProps) {
  const props = allProps;
  const rest = omit(
    allProps,
    "nodeId",
    "position",
    "variant",
    "color",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
    "keepAspectRatio",
    "resizeDirection",
    "autoScale",
    "shouldResize",
    "onResizeStart",
    "onResize",
    "onResizeEnd",
    "class",
    "children",
  );

  const store = useStore();
  const contextNodeId = getNodeIdContext();
  const id = () => (typeof props.nodeId === "string" ? props.nodeId : contextNodeId);

  const [resizeControlRef, setResizeControlRef] = createSignal<HTMLDivElement | undefined>();
  let resizer: XYResizerInstance | null = null;

  const isLineVariant = () =>
    (props.variant ?? ResizeControlVariant.Handle) === ResizeControlVariant.Line;

  const controlPosition = createMemo<ControlPosition>(() => {
    const defaultPosition = (isLineVariant() ? "right" : "bottom-right") as ControlPosition;
    return props.position ?? defaultPosition;
  });

  const positionClasses = () => controlPosition().split("-").join(" ");

  createRenderEffect(
    () => [resizeControlRef(), id()] as const,
    ([resizeControl, nodeId]) => {
      if (!resizeControl || !nodeId) return;

      const instance = XYResizer({
        domNode: resizeControl,
        nodeId,
        getStoreItems: () => ({
          nodeLookup: store.nodeLookup,
          transform: [store.viewport.x, store.viewport.y, store.viewport.zoom],
          snapGrid: store.snapGrid ?? undefined,
          snapToGrid: !!store.snapGrid,
          nodeOrigin: store.nodeOrigin,
          paneDomNode: store.domNode,
        }),
        onChange: (change: XYResizerChange, childChanges: XYResizerChildChange[]) => {
          const changes = new Map<string, XYResizerChange>();
          changes.set(nodeId, change);
          for (const childChange of childChanges) {
            changes.set(childChange.id, {
              x: childChange.position.x,
              y: childChange.position.y,
            });
          }
          const horizontal = !props.resizeDirection || props.resizeDirection === "horizontal";
          const vertical = !props.resizeDirection || props.resizeDirection === "vertical";

          store.nodes = store.nodes.map((node) => {
            const c = changes.get(node.id);
            if (c) {
              return {
                ...node,
                position: {
                  x: horizontal ? (c.x ?? node.position.x) : node.position.x,
                  y: vertical ? (c.y ?? node.position.y) : node.position.y,
                },
                width: horizontal ? (c.width ?? node.width) : node.width,
                height: vertical ? (c.height ?? node.height) : node.height,
              };
            }
            return node;
          });
        },
      });
      resizer = instance;
      onCleanup(() => {
        instance.destroy();
        if (resizer === instance) resizer = null;
      });
    },
  );

  createRenderEffect(
    () => ({
      controlPosition: controlPosition(),
      boundaries: {
        minWidth: props.minWidth ?? 10,
        minHeight: props.minHeight ?? 10,
        maxWidth: props.maxWidth ?? Number.MAX_VALUE,
        maxHeight: props.maxHeight ?? Number.MAX_VALUE,
      },
      keepAspectRatio: !!props.keepAspectRatio,
      resizeDirection: props.resizeDirection,
      onResizeStart: props.onResizeStart,
      onResize: props.onResize,
      onResizeEnd: props.onResizeEnd,
      shouldResize: props.shouldResize,
    }),
    (params) => resizer?.update(params),
  );

  onCleanup(() => {
    resizer?.destroy();
  });

  const autoScale = () => props.autoScale ?? true;

  return (
    <div
      ref={setResizeControlRef}
      class={`xy-flow__resize-control ${store.noDragClass} ${positionClasses()} ${props.variant ?? ResizeControlVariant.Handle} ${props.class ?? ""}`}
      style={{
        "border-color": isLineVariant() ? props.color : undefined,
        "background-color": isLineVariant() ? undefined : props.color,
        scale:
          isLineVariant() || !autoScale() ? undefined : `${Math.max(1 / store.viewport.zoom, 1)}`,
      }}
      {...rest}
    >
      {props.children}
    </div>
  );
}
