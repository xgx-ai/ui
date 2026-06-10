import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import {
  createContext,
  createUniqueId,
  createSignal,
  Show,
  useContext,
  type Component,
} from "solid-js";

import { cn } from "../cn";
import { X } from "../icons.index";
import { splitProps } from "../utils/split-props";
import { assignRef } from "./floating";
import { createModalBehavior } from "./modal-behavior";
import { PortalMount } from "./portal";

type DialogContextValue = {
  close: () => void;
  descriptionId: string;
  modal: () => boolean;
  open: () => boolean;
  preventScroll: () => boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
};

const DialogContext = createContext<DialogContextValue>();

function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog parts must be used inside Dialog.");
  }
  return context;
}

type DialogProps = ComponentProps<"div"> & {
  children?: JSX.Element;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  preventScroll?: boolean;
};

const Dialog: Component<DialogProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "defaultOpen",
    "modal",
    "onOpenChange",
    "open",
    "preventScroll",
  ]);
  const [internalOpen, setInternalOpen] = createSignal(local.defaultOpen === true);
  const open = () => local.open ?? internalOpen();
  const modal = () => local.modal ?? true;
  const preventScroll = () => local.preventScroll ?? modal();
  const titleId = createUniqueId();
  const descriptionId = createUniqueId();
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    local.onOpenChange?.(next);
  };

  return (
    <DialogContext
      value={{
        close: () => setOpen(false),
        descriptionId,
        modal,
        open,
        preventScroll,
        setOpen,
        titleId,
      }}
    >
      <div data-open={open() ? "" : undefined} class={local.class} {...rest}>
        {local.children}
      </div>
    </DialogContext>
  );
};

type DialogTriggerProps<T extends ValidComponent = "button"> = ComponentProps<"button"> & {
  as?: T;
  class?: string;
  children?: JSX.Element;
};

const DialogTrigger = <T extends ValidComponent = "button">(props: DialogTriggerProps<T>) => {
  const dialog = useDialog();
  const [local, rest] = splitProps(props, ["as", "children", "class", "onClick"]);

  return (
    <Dynamic
      component={local.as ?? "button"}
      type={local.as ? undefined : "button"}
      class={local.class}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement }) => {
        callEventHandler(local.onClick, event);
        dialog.setOpen(true);
      }}
      {...rest}
    >
      {local.children}
    </Dynamic>
  );
};

const DialogPortal: Component<{
  children: JSX.Element;
  mount?: Element;
  zIndex?: string;
}> = (props) => {
  return (
    <PortalMount mount={props.mount}>
      <div
        class={cn(
          "pointer-events-none fixed inset-0 flex items-start justify-center p-6 print:hidden sm:!items-center",
          props.zIndex || "z-50",
        )}
      >
        {props.children}
      </div>
    </PortalMount>
  );
};

type DialogOverlayProps<T extends ValidComponent = "div"> = ComponentProps<"div"> & {
  as?: T;
  class?: string | undefined;
  zIndex?: string;
};

const DialogOverlay = <T extends ValidComponent = "div">(props: DialogOverlayProps<T>) => {
  const [local, rest] = splitProps(props, ["as", "class", "zIndex", "onClick"]);

  return (
    <Dynamic
      component={local.as ?? "div"}
      class={cn(
        "pointer-events-auto fixed inset-0 bg-foreground/30 p-6",
        local.zIndex || "z-50",
        local.class,
      )}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement }) => {
        callEventHandler(local.onClick, event);
      }}
      {...rest}
    />
  );
};

export type DialogContentProps<T extends ValidComponent = "div"> = ComponentProps<"div"> & {
  as?: T;
  class?: string | undefined;
  children?: JSX.Element;
  mount?: HTMLDivElement;
  hideCloseButton?: boolean;
  zIndex?: string;
  onInteractOutside?: (event: { preventDefault: () => void }) => void;
};

const DialogContent = <T extends ValidComponent = "div">(props: DialogContentProps<T>) => {
  const dialog = useDialog();
  const [local, rest] = splitProps(props, [
    "as",
    "class",
    "children",
    "mount",
    "hideCloseButton",
    "zIndex",
    "onInteractOutside",
    "aria-labelledby",
    "aria-describedby",
    "ref",
  ]);
  const [contentRef, setContentRef] = createSignal<HTMLElement>();
  createModalBehavior({
    content: contentRef,
    modal: dialog.modal,
    onClose: dialog.close,
    open: dialog.open,
    preventScroll: dialog.preventScroll,
  });
  const canCloseFromOutside = () => {
    let prevented = false;
    local.onInteractOutside?.({
      preventDefault: () => {
        prevented = true;
      },
    });
    return !prevented;
  };

  return (
    <Show when={dialog.open()}>
      <DialogPortal mount={local.mount} zIndex={local.zIndex}>
        <DialogOverlay
          zIndex={local.zIndex}
          onClick={() => {
            if (canCloseFromOutside()) dialog.close();
          }}
        />
        <Dynamic
          component={local.as ?? "div"}
          role="dialog"
          aria-modal={dialog.modal() ? "true" : undefined}
          aria-labelledby={local["aria-labelledby"] ?? dialog.titleId}
          aria-describedby={local["aria-describedby"] ?? dialog.descriptionId}
          tabIndex={-1}
          ref={(element: HTMLElement) => {
            setContentRef(element);
            assignRef(local.ref, element);
          }}
          class={cn(
            "pointer-events-auto relative flex max-h-full max-w-full flex-col gap-4 overflow-hidden border border-border-subtle bg-surface-raised p-6 text-surface-raised-foreground shadow-elevation-high sm:!rounded-lg",
            local.zIndex || "z-50",
            local.class,
          )}
          {...rest}
        >
          {local.children}
          {!local.hideCloseButton && (
            <button
              type="button"
              class="absolute right-4 top-4 cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              onClick={dialog.close}
            >
              <X aria-hidden="true" class="size-4" />
              <span class="sr-only">Close</span>
            </button>
          )}
        </Dynamic>
      </DialogPortal>
    </Show>
  );
};

const DialogHeader: Component<ComponentProps<"div">> = (props) => {
  const [local, rest] = splitProps(props, ["class"]);
  return <div class={cn("flex flex-col gap-4 text-center sm:!text-left", local.class)} {...rest} />;
};

const DialogFooter: Component<ComponentProps<"div">> = (props) => {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("flex flex-col-reverse sm:!flex-row sm:!justify-end sm:!space-x-2", local.class)}
      {...rest}
    />
  );
};

type DialogTitleProps<T extends ValidComponent = "h2"> = ComponentProps<"h2"> & {
  as?: T;
  class?: string | undefined;
  children?: JSX.Element;
};

const DialogTitle = <T extends ValidComponent = "h2">(props: DialogTitleProps<T>) => {
  const dialog = useDialog();
  const [local, rest] = splitProps(props, ["as", "class", "children", "id"]);
  return (
    <Dynamic
      component={local.as ?? "h2"}
      id={local.id ?? dialog.titleId}
      class={cn("font-semibold leading-none tracking-tight -mb-3", local.class)}
      {...rest}
    >
      {local.children}
    </Dynamic>
  );
};

type DialogDescriptionProps<T extends ValidComponent = "p"> = ComponentProps<"p"> & {
  as?: T;
  class?: string | undefined;
  children?: JSX.Element;
};

const DialogDescription = <T extends ValidComponent = "p">(props: DialogDescriptionProps<T>) => {
  const dialog = useDialog();
  const [local, rest] = splitProps(props, ["as", "class", "children", "id"]);
  return (
    <Dynamic
      component={local.as ?? "p"}
      id={local.id ?? dialog.descriptionId}
      class={cn("pt-2 text-xs text-muted-foreground", local.class)}
      {...rest}
    >
      {local.children}
    </Dynamic>
  );
};

function callEventHandler<TElement, TEvent>(
  handler: unknown,
  event: TEvent & { currentTarget: TElement },
) {
  if (typeof handler === "function") {
    handler(event);
    return;
  }
  if (Array.isArray(handler) && typeof handler[0] === "function") {
    handler[0](handler[1], event);
  }
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
