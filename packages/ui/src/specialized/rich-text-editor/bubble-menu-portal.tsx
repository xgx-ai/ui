import type { Editor } from "@tiptap/core";
import { createSignal, onSettled, Show } from "solid-js";
import { containsNode } from "../../overlays/floating";
import { FloatingToolbar } from "./floating-toolbar";
import type { ToolbarConfig } from "./types";

export interface BubbleMenuPortalProps {
  editor: Editor;
  config?: ToolbarConfig;
  containerRef?: HTMLElement;
}

export function BubbleMenuPortal(props: BubbleMenuPortalProps) {
  let menuRef: HTMLDivElement | undefined;
  const [position, setPosition] = createSignal({ left: 0, top: 0 });
  const [hasSelection, setHasSelection] = createSignal(false);
  const [isDismissed, setIsDismissed] = createSignal(false);

  onSettled(() => {
    const editor = props.editor;
    if (!editor || editor.isDestroyed) return;

    const updateSelection = () => {
      if (!editor || editor.isDestroyed) {
        setHasSelection(false);
        return;
      }

      try {
        const { from, to } = editor.state.selection;
        const isSelected = from !== to;
        setHasSelection(isSelected);

        if (isSelected) {
          requestAnimationFrame(() => {
            if (!editor || editor.isDestroyed) return;

            try {
              const containerRect = props.containerRef?.getBoundingClientRect();
              if (!containerRect) return;

              const { view } = editor;
              const coords = view.coordsAtPos(from);
              const menuHeight = menuRef?.offsetHeight || 40;

              setPosition({
                left: coords.left - containerRect.left,
                top: coords.top - containerRect.top - menuHeight - 8,
              });
            } catch {
              // Ignore positioning errors
            }
          });
        }
      } catch {
        setHasSelection(false);
      }
    };

    editor.on("selectionUpdate", updateSelection);
    editor.on("transaction", updateSelection);

    return () => {
      try {
        editor.off("selectionUpdate", updateSelection);
        editor.off("transaction", updateSelection);
      } catch {
        // Ignore cleanup errors
      }
    };
  });

  // Dismiss the menu when focus leaves the editor and menu
  onSettled(() => {
    const editor = props.editor;
    if (!editor || editor.isDestroyed) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!containsNode(editor.view.dom, target) && !containsNode(menuRef, target)) {
        setIsDismissed(true);
      }
    };

    const handleFocus = () => {
      setIsDismissed(false);
    };

    const handleBlur = () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (active && !containsNode(editor.view.dom, active) && !containsNode(menuRef, active)) {
          setIsDismissed(true);
        }
      }, 0);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    editor.on("focus", handleFocus);
    editor.on("blur", handleBlur);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      try {
        editor.off("focus", handleFocus);
        editor.off("blur", handleBlur);
      } catch {
        // Ignore cleanup errors
      }
    };
  });

  return (
    <Show when={hasSelection() && !isDismissed() && props.editor && !props.editor.isDestroyed}>
      <div
        ref={menuRef}
        class="absolute z-50 transition-opacity duration-150 opacity-100"
        style={{
          left: `${position().left}px`,
          top: `${position().top}px`,
        }}
      >
        <FloatingToolbar editor={props.editor} config={props.config} />
      </div>
    </Show>
  );
}
