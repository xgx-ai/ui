import { createEffect, type Accessor } from "solid-js";

export interface KeyboardShortcut {
  code: string;
  control?: boolean;
  handler: () => void;
  shift?: boolean;
}

function isEditableTarget(target: Element | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/** Installs shortcuts only while focus is inside the owning map. */
export function createMapKeyboardShortcuts(
  enabled: Accessor<boolean>,
  container: Accessor<HTMLDivElement | undefined>,
  shortcuts: KeyboardShortcut[],
) {
  createEffect(
    () => ({ container: container(), enabled: enabled() }),
    (state) => {
      if (!state.enabled || !state.container) return;

      const mapRoot = state.container.parentElement ?? state.container;
      const handleKeyDown = (event: KeyboardEvent) => {
        const activeElement = document.activeElement;
        if (!mapRoot.contains(activeElement) || isEditableTarget(activeElement)) {
          return;
        }

        const shortcut = shortcuts.find(
          (candidate) =>
            candidate.code === event.code &&
            Boolean(candidate.shift) === event.shiftKey &&
            Boolean(candidate.control) === (event.ctrlKey || event.metaKey),
        );
        if (!shortcut) return;

        event.preventDefault();
        shortcut.handler();
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    },
  );
}
