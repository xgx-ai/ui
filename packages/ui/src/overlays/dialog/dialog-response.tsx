import type { JSX } from "@solidjs/web";
import { createSignal, createStore, flush, Match, Show, Switch } from "solid-js";
import { cn } from "../../cn.ts";
import { Button } from "../../forms/button.tsx";
import { TriangleAlert } from "../../icons.index";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTemplate,
  DialogTitle,
} from "../dialog.tsx";

export type DialogContentProps<T> = {
  resolve: (value: T) => void;
  reject: () => void;
  setClass?: (c: string) => void;
  setTitle?: (t: string) => void;
  setDescription?: (d: string) => void;
  setMount?: (m: HTMLDivElement) => void;
};
interface DialogProps<T> {
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
  templateProps?: {
    action: string;
  };
}

/**
 * A utility hook that creates a controlled dialog (modal) which can return a value.
 *
 * This is useful for creating interactive dialogs that need to return data back to the caller,
 * such as confirmation dialogs, form inputs, or selection dialogs.
 *
 * @template T The type of value that will be returned by the dialog
 *
 * @returns {Object} An object containing:
 * - showResponseDialog: Function to display the dialog and return a Promise of the result
 * - DialogResponse: Component that renders the actual dialog UI
 *
 * @example
 * ```tsx
 * const { showResponseDialog, DialogResponse } = useResponseDialog<string>();
 *
 * // Show a dialog and wait for the result
 * const result = await showResponseDialog({
 *   title: "Enter your name",
 *   content: ({ resolve, reject }) => (
 *     <div>
 *       <input
 *         onKeyUp={(e) => e.key === "Enter" && resolve(e.currentTarget.value)}
 *       />
 *       <button onClick={() => reject()}>Cancel</button>
 *     </div>
 *   )
 * });
 * ```
 */

export function useResponseDialog() {
  const [isOpen, setIsOpen] = createSignal(false);
  const [dialogProps, setDialogProps] = createStore<DialogProps<unknown>>({
    title: "",
    description: "",
    content: DialogContentPlaceholder,
  });
  let activePromise: Promise<unknown | null> | undefined;
  let settleDialog: ((value: unknown) => void) | undefined;

  const showResponseDialog = <T,>(props: DialogProps<T>): Promise<T | null> => {
    if (activePromise) return activePromise as Promise<T | null>;

    setDialogProps((state) => {
      Object.assign(state, props);
    });
    setIsOpen(true);

    const promise = new Promise<T | null>((resolve) => {
      let settled = false;

      settleDialog = (value: unknown) => {
        if (settled) return;

        settled = true;
        setIsOpen(false);
        flush();
        activePromise = undefined;
        settleDialog = undefined;
        resolve(value as T | null);
      };
    });

    activePromise = promise;
    return promise;
  };

  const DialogResponse = () => {
    function handleClose() {
      settleDialog?.(null);
    }
    return (
      <Show when={isOpen()}>
        <Dialog
          defaultOpen
          onOpenChange={(open) => !open && handleClose()}
          open={isOpen()}
          modal={dialogProps.modal ?? false}
          preventScroll={dialogProps.preventScroll ?? true}
        >
          <Switch
            fallback={
              <DialogTemplate
                class={cn("max-w-lg w-full", dialogProps.class)}
                description={dialogProps.description}
                mount={dialogProps.mount}
                hideCloseButton={dialogProps.hideCloseButton}
                title={dialogProps.title}
                zIndex={dialogProps.zIndex ?? "z-[50]"}
                onInteractOutside={(event) => {
                  if (dialogProps.closeOnInteractOutside !== true) {
                    event.preventDefault();
                  }
                }}
              >
                {dialogProps.content?.({
                  resolve: (value: unknown) => {
                    settleDialog?.(value);
                  },
                  reject: () => {
                    settleDialog?.(null);
                  },
                  setClass: (c: string) => {
                    setDialogProps((state) => {
                      state.class = c;
                    });
                  },
                  setTitle: (t: string) => {
                    setDialogProps((state) => {
                      state.title = t;
                    });
                  },
                  setDescription: (d: string) => {
                    setDialogProps((state) => {
                      state.description = d;
                    });
                  },
                  setMount: (m: HTMLDivElement) => {
                    setDialogProps((state) => {
                      state.mount = m;
                    });
                  },
                })}
              </DialogTemplate>
            }
          >
            <Match when={dialogProps.template === "alert"}>
              {() => (
                <DialogContent
                  class={cn("w-full max-w-md", dialogProps.class)}
                  hideCloseButton={dialogProps.hideCloseButton}
                  mount={dialogProps.mount}
                  zIndex={dialogProps.zIndex ?? "z-[60]"}
                  onInteractOutside={(event) => {
                    if (dialogProps.closeOnInteractOutside !== true) {
                      event.preventDefault();
                    }
                  }}
                >
                  <DialogAlertTemplate
                    {...dialogProps}
                    resolve={(value: unknown) => {
                      settleDialog?.(value);
                    }}
                    reject={() => settleDialog?.(null)}
                  />
                </DialogContent>
              )}
            </Match>
          </Switch>
        </Dialog>
      </Show>
    );
  };

  return { showResponseDialog, DialogResponse };
}

export function DialogContentPlaceholder(props: DialogContentProps<unknown>) {
  return (
    <DialogFooter>
      <Button variant={"outline"} size={"sm"} onClick={props.reject}>
        Cancel
      </Button>
      <Button size={"sm"} onClick={() => props.resolve(true)}>
        Confirm
      </Button>
    </DialogFooter>
  );
}

function DialogAlertTemplate(
  props: DialogContentProps<unknown> & {
    title?: string;
    description?: string;
    templateProps?: { action: string };
  },
) {
  return (
    <>
      <div class="flex items-start pr-4 gap-4">
        <div class={`flex size-10 shrink-0 items-center justify-center rounded-full bg-error`}>
          <TriangleAlert color="red" />
        </div>
        <div class="flex flex-col gap-2">
          <DialogTitle>{`${props.title}`}</DialogTitle>

          <DialogDescription>{props.description}</DialogDescription>
        </div>
      </div>

      <DialogFooter>
        <Button variant={"outline"} size={"sm"} onClick={props.reject}>
          Cancel
        </Button>
        <Button size={"sm"} variant={"destructive"} onClick={() => props.resolve(true)}>
          {props.templateProps?.action || "Confirm"}
        </Button>
      </DialogFooter>
    </>
  );
}
export type ShowResponseDialog = ReturnType<typeof useResponseDialog>["showResponseDialog"];
