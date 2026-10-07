import type { JSX } from "@solidjs/web";
import { createSignal, createStore } from "solid-js";
import type { DialogContentProps } from "./dialog-response";

export interface DialogProps<T> {
  content?: (props: DialogContentProps<T>) => JSX.Element;
  title?: string;
  description?: string;
  class?: string;
  mount?: HTMLDivElement;
  modal?: boolean;
  preventScroll?: boolean;
  closeOnInteractOutside?: boolean;
  zIndex?: string;
  hideCloseButton?: boolean;
  template?: "alert";
  templateProps?: { action: string };
}

/** Promise settlement must survive the dialog content owner's disposal. */
export function createResponseDialogState(
  initialContent: (props: DialogContentProps<unknown>) => JSX.Element,
) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [dialogProps, setDialogProps] = createStore<DialogProps<unknown>>({
    title: "",
    description: "",
    content: initialContent,
  });
  let activePromise: Promise<unknown | null> | undefined;
  let activeSettlement: ((value: unknown) => void) | undefined;

  const showResponseDialog = <T>(props: DialogProps<T>): Promise<T | null> => {
    if (activePromise) return activePromise as Promise<T | null>;
    setDialogProps((state) => {
      Object.assign(state, props);
    });
    setIsOpen(true);

    const promise = new Promise<T | null>((resolve) => {
      let settled = false;
      activeSettlement = (value: unknown) => {
        if (settled) return;
        settled = true;
        // Closing can dispose the native action calling resolve. Release the
        // response first, so its parent can continue and open another dialog.
        activePromise = undefined;
        activeSettlement = undefined;
        resolve(value as T | null);
        // Resolution can run inside a native mutation action. Its close write
        // commits when that action settles; forcing flush here would throw.
        setIsOpen(false);
      };
    });
    activePromise = promise;
    return promise;
  };

  return {
    isOpen,
    dialogProps,
    showResponseDialog,
    settleDialog: (value: unknown) => activeSettlement?.(value),
    setDialogProps,
  };
}
