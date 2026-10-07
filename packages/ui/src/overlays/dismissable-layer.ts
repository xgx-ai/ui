import { createContext, createEffect, useContext } from "solid-js";
import { containsNode } from "./floating";

/**
 * A floating surface that dismisses on an outside pointer press or on Escape: popovers, menus,
 * listboxes and dialogs.
 *
 * Layers nest through `DismissableLayerContext`, which crosses portals. While a layer is open it
 * registers its elements with every ancestor layer, so a descendant rendered into `document.body`
 * still counts as inside each parent, and it marks itself as an open descendant, so Escape
 * reaches only the innermost open layer.
 */
export type DismissableLayer = {
  /** Whether a node belongs to this layer or to an open descendant layer. */
  contains: (node: unknown) => boolean;
  /** Counts an element as inside this layer and its ancestors until the returned release runs. */
  registerContent: (element: HTMLElement) => () => void;
  /** Leaves Escape to an open descendant layer until the returned release runs. */
  registerOpenDescendant: () => () => void;
};

export const DismissableLayerContext = createContext<DismissableLayer | null>(null);

export type DismissableLayerOptions = {
  open: () => boolean;
  /** Elements owned by this layer: its trigger root, floating content and any overlay. */
  elements: () => ReadonlyArray<HTMLElement | undefined>;
  /** A pointer press outside this layer and its descendants. Omit to ignore outside presses. */
  onPointerDownOutside?: (event: PointerEvent) => void;
  /** Escape while no descendant layer is open. Omit to leave Escape to other handlers. */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  /**
   * Listen for Escape in the capture phase. Modal surfaces use this so content inside them
   * cannot swallow it; they still defer to open descendant layers, which handle it themselves.
   * Bubble-phase layers also ignore an Escape that something else already handled.
   */
  escapeCapture?: boolean;
  /** The enclosing layer. Defaults to the nearest `DismissableLayerContext`. */
  parent?: DismissableLayer | null;
};

/** Joins the nearest `DismissableLayerContext`. Provide the result to this layer's children. */
export function createDismissableLayer(options: DismissableLayerOptions): DismissableLayer {
  const parent = "parent" in options ? options.parent : useContext(DismissableLayerContext);
  const descendantContents = new Set<HTMLElement>();
  let openDescendants = 0;

  const registerContent = (element: HTMLElement) => {
    descendantContents.add(element);
    const releaseAncestor = parent?.registerContent(element);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      descendantContents.delete(element);
      releaseAncestor?.();
    };
  };

  const registerOpenDescendant = () => {
    openDescendants += 1;
    const releaseAncestor = parent?.registerOpenDescendant();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      openDescendants -= 1;
      releaseAncestor?.();
    };
  };

  const contains = (node: unknown) =>
    options.elements().some((element) => containsNode(element, node)) ||
    [...descendantContents].some((element) => containsNode(element, node));

  // Announce this layer to its ancestors only while it is open; closing, swapping an element
  // or disposal releases the registration.
  createEffect(
    () => (options.open() ? options.elements() : undefined),
    (elements) => {
      if (!elements || !parent) return;
      const releases = elements.flatMap((element) =>
        element ? [parent.registerContent(element)] : [],
      );
      if (options.onEscapeKeyDown) releases.push(parent.registerOpenDescendant());
      return () => {
        for (const release of releases) release();
      };
    },
  );

  createEffect(options.open, (open) => {
    if (!open) return;
    // Pointer presses are judged in the capture phase. Solid flushes between native listeners,
    // so by the bubble phase a pressed option may already have closed its listbox and released
    // its registration here, making a press inside a descendant look like an outside press.
    const onPointerDown = (event: PointerEvent) => {
      const path = event.composedPath();
      if (path.length ? path.some(contains) : contains(event.target)) return;
      options.onPointerDownOutside?.(event);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || openDescendants > 0) return;
      if (event.defaultPrevented && !options.escapeCapture) return;
      event.preventDefault();
      options.onEscapeKeyDown?.(event);
    };
    const capture = options.escapeCapture === true;
    if (options.onPointerDownOutside) document.addEventListener("pointerdown", onPointerDown, true);
    if (options.onEscapeKeyDown) document.addEventListener("keydown", onKeyDown, capture);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, capture);
    };
  });

  return { contains, registerContent, registerOpenDescendant };
}
