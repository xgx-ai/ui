import { createEffect } from "solid-js";
import { containsNode } from "./floating";

export type PopoverDismissal = {
  registerContent: (element: HTMLElement) => () => void;
};

type PopoverDismissalOptions = {
  close: () => void;
  contentRef: () => HTMLElement | undefined;
  open: () => boolean;
  parent?: PopoverDismissal;
  rootRef: () => HTMLElement | undefined;
};

export function createPopoverDismissal(options: PopoverDismissalOptions): PopoverDismissal {
  const descendantContents = new Set<HTMLElement>();
  const parent = options.parent;
  const registerContent = (element: HTMLElement) => {
    descendantContents.add(element);
    const unregisterAncestor = parent?.registerContent(element);
    return () => {
      descendantContents.delete(element);
      unregisterAncestor?.();
    };
  };

  // Portals preserve Solid context, but their DOM is outside the parent panel.
  // Register only open descendant content, releasing it on close/ref change/disposal.
  createEffect(
    () => ({ open: options.open(), content: options.contentRef() }),
    ({ open, content }) => {
      if (!open || !content || !parent) return;
      return parent.registerContent(content);
    },
  );

  createEffect(options.open, (open) => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const root = options.rootRef();
      const content = options.contentRef();
      const path = event.composedPath();
      // An option can unmount before this bubble listener runs. The dispatch path
      // still identifies the content where the event started.
      const startedInside = path.some(
        (node) => node === root || node === content || descendantContents.has(node as HTMLElement),
      );
      const insideDescendant = [...descendantContents].some((element) =>
        containsNode(element, target),
      );
      if (
        !startedInside &&
        !containsNode(root, target) &&
        !containsNode(content, target) &&
        !insideDescendant
      ) {
        options.close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") options.close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  return { registerContent };
}
