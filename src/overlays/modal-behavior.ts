import { createEffect } from "solid-js";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(",");

export function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.offsetParent !== null,
  );
}

export function createModalBehavior(options: {
  open: () => boolean;
  content: () => HTMLElement | undefined;
  modal?: () => boolean;
  preventScroll?: () => boolean;
  onClose: () => void;
}) {
  createEffect(
    () => ({
      content: options.content(),
      modal: options.modal?.() ?? true,
      open: options.open(),
      preventScroll: options.preventScroll?.(),
    }),
    (state) => {
      if (!state.open || !state.content || typeof document === "undefined") return;

      const content = state.content;
      const restoreTarget =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const shouldPreventScroll = state.preventScroll ?? state.modal;
      const originalOverflow = document.body.style.overflow;

      if (shouldPreventScroll) document.body.style.overflow = "hidden";

      queueMicrotask(() => {
        if (!content.contains(document.activeElement)) {
          const first = getFocusableElements(content)[0] ?? content;
          first.focus();
        }
      });

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          options.onClose();
          return;
        }

        if (!state.modal || event.key !== "Tab") return;

        const focusable = getFocusableElements(content);
        if (focusable.length === 0) {
          event.preventDefault();
          content.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };

      document.addEventListener("keydown", onKeyDown, true);

      return () => {
        document.removeEventListener("keydown", onKeyDown, true);
        if (shouldPreventScroll) document.body.style.overflow = originalOverflow;
        if (restoreTarget?.isConnected) restoreTarget.focus();
      };
    },
  );
}
