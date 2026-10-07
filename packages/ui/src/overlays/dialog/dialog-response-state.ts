import type { JSX } from "@solidjs/web";
import { createSignal, createStore, getOwner, onCleanup } from "solid-js";
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
  // Each response dialog gets its own id. A dialog opened in the same tick that the previous
  // one settled changes the id rather than leaving `open` true throughout, so the host mounts
  // a fresh Dialog and its presence and initial focus run again.
  const [activeDialog, setActiveDialog] = createSignal<number | null>(null);
  const [dialogProps, setDialogProps] = createStore<DialogProps<unknown>>({
    title: "",
    description: "",
    content: initialContent,
  });
  let nextDialog = 0;
  let activePromise: Promise<unknown | null> | undefined;
  let activeSettlement: ((value: unknown) => void) | undefined;

  const showResponseDialog = <T>(props: DialogProps<T>): Promise<T | null> => {
    if (activePromise) return activePromise as Promise<T | null>;
    // Replace rather than merge, so nothing from the previous dialog (template, class,
    // mount and so on) carries into this one.
    setDialogProps(() => ({
      title: "",
      description: "",
      content: initialContent,
      ...(props as DialogProps<unknown>),
    }));
    const dialog = ++nextDialog;
    setActiveDialog(dialog);

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
        // Resolution can run inside a native mutation action. Its close write commits when
        // that action settles (S10); forcing flush here would throw. Only close this dialog:
        // the caller may already have opened the next one.
        setActiveDialog((current) => (current === dialog ? null : current));
      };
    });
    activePromise = promise;
    return promise;
  };

  // If the owner of this state goes away while a dialog is open, nobody can answer it.
  // Resolve the caller with null rather than leaving it waiting forever.
  if (getOwner()) onCleanup(() => activeSettlement?.(null));

  return {
    activeDialog,
    isOpen: () => activeDialog() !== null,
    dialogProps,
    showResponseDialog,
    settleDialog: (value: unknown) => activeSettlement?.(value),
    setDialogProps,
  };
}
