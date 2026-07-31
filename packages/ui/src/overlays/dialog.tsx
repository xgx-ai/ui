/**
 * # Dialog
 *
 * Opens modal or non-modal content above the page.
 *
 * @example
 * ```tsx
 * <Dialog open={open()} onOpenChange={setOpen}>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Review decision</DialogTitle>
 *     </DialogHeader>
 *   </DialogContent>
 * </Dialog>
 * ```
 */
import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import {
  type Component,
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  omit,
  Show,
  untrack,
  useContext,
} from "solid-js";

import { cn } from "../cn";
import { X } from "../icons.index";
import { assignRef } from "./floating";
import { createModalBehavior } from "./modal-behavior";
import { PortalMount } from "./portal";

const DynamicAny = Dynamic as any;

type DialogContextValue = {
  close: () => void;
  descriptionId: string;
  modal: () => boolean;
  open: () => boolean;
  preventScroll: () => boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
};

// Solid 2 treats an undefined context default as missing, so use an explicit sentinel.
const missingDialogContext = Symbol("missing-dialog-context");
const DialogContext = createContext<DialogContextValue | typeof missingDialogContext>(
  missingDialogContext,
);
const DialogTemplateContext = createContext({ stickyFooter: false });

function useDialog() {
  const context = useContext(DialogContext);
  if (context === missingDialogContext) {
    throw new Error("Dialog parts must be used inside Dialog.");
  }
  return context;
}

function useOptionalDialog() {
  const context = useContext(DialogContext);
  return context === missingDialogContext ? undefined : context;
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
  const local = props;
  const rest = omit(
    props,
    "children",
    "class",
    "defaultOpen",
    "modal",
    "onOpenChange",
    "open",
    "preventScroll",
  );
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
  const local = props;
  const rest = omit(props, "as", "children", "class", "onClick");

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

type DialogCloseProps<T extends ValidComponent = "button"> = ComponentProps<"button"> & {
  as?: T;
  class?: string;
  children?: JSX.Element;
};

const DialogClose = <T extends ValidComponent = "button">(props: DialogCloseProps<T>) => {
  const dialog = useDialog();
  const local = props;
  const rest = omit(props, "as", "children", "class", "onClick", "type");

  return (
    <Dynamic
      component={local.as ?? "button"}
      type={local.as ? undefined : (local.type ?? "button")}
      class={local.class}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement }) => {
        callEventHandler(local.onClick, event);
        if (!event.defaultPrevented) dialog.close();
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
  const local = props;
  const rest = omit(props, "as", "class", "zIndex", "onClick");

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

// Keeps content mounted through its exit animation so open AND close animate.
// `present()` gates the mount; `state()` drives the enter/exit keyframes via
// the `data-state` attribute. Falls back to a timer when no animation runs
// (e.g. reduced motion) so the content always unmounts.
function createDialogPresence(open: () => boolean) {
  const initiallyOpen = untrack(open);
  const [present, setPresent] = createSignal(initiallyOpen);
  const [state, setState] = createSignal<"open" | "closed">(initiallyOpen ? "open" : "closed");
  let element: HTMLElement | undefined;

  createEffect(
    () => open(),
    (isOpen) => {
      if (isOpen) {
        setPresent(true);
        setState("open");
        return;
      }

      setState("closed");
      const node = element;
      if (!node) {
        setPresent(false);
        return;
      }

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        setPresent(false);
      };
      const handleEnd = (event: AnimationEvent) => {
        if (event.target === node) finish();
      };
      node.addEventListener("animationend", handleEnd);
      node.addEventListener("animationcancel", handleEnd);
      const timer = globalThis.setTimeout(finish, 400);

      return () => {
        node.removeEventListener("animationend", handleEnd);
        node.removeEventListener("animationcancel", handleEnd);
        globalThis.clearTimeout(timer);
      };
    },
  );

  return {
    present,
    state,
    setElement: (node: HTMLElement) => {
      element = node;
    },
  };
}

const DialogContent = <T extends ValidComponent = "div">(props: DialogContentProps<T>) => {
  const dialog = useDialog();
  const local = props;
  const rest = omit(
    props,
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
  );
  const [contentRef, setContentRef] = createSignal<HTMLElement>();
  const presence = createDialogPresence(dialog.open);
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
  const contentClass = () =>
    cn(
      "pointer-events-auto relative flex max-h-full max-w-full flex-col gap-4 overflow-hidden border border-border-subtle bg-surface-raised p-6 text-surface-raised-foreground shadow-elevation-high sm:!rounded-lg",
      local.zIndex || "z-50",
      local.class,
    );
  const contentChildren = () => (
    <>
      {local.children}
      <Show when={!local.hideCloseButton}>
        <button
          type="button"
          class="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground ring-offset-background transition-colors hover:bg-hover hover:text-hover-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          onClick={dialog.close}
        >
          <X aria-hidden="true" class="size-4" />
          <span class="sr-only">Close</span>
        </button>
      </Show>
    </>
  );
  return (
    <Show when={presence.present()}>
      <DialogPortal mount={local.mount} zIndex={local.zIndex}>
        <DialogOverlay
          data-xgx-dialog-overlay=""
          data-state={presence.state()}
          zIndex={local.zIndex}
          onClick={() => {
            if (canCloseFromOutside()) dialog.close();
          }}
        />
        <Show
          when={local.as}
          fallback={
            <div
              role="dialog"
              data-xgx-dialog-content=""
              data-state={presence.state()}
              aria-modal={dialog.modal() ? "true" : undefined}
              aria-labelledby={local["aria-labelledby"] ?? dialog.titleId}
              aria-describedby={local["aria-describedby"] ?? dialog.descriptionId}
              tabindex={-1}
              ref={(element: HTMLDivElement) => {
                setContentRef(element);
                presence.setElement(element);
                assignRef(local.ref, element);
              }}
              {...rest}
              class={contentClass()}
            >
              {contentChildren()}
            </div>
          }
        >
          {(as) => (
            <DynamicAny
              component={as()}
              role="dialog"
              data-xgx-dialog-content=""
              data-state={presence.state()}
              aria-modal={dialog.modal() ? "true" : undefined}
              aria-labelledby={local["aria-labelledby"] ?? dialog.titleId}
              aria-describedby={local["aria-describedby"] ?? dialog.descriptionId}
              tabindex={-1}
              ref={(element: HTMLElement) => {
                setContentRef(element);
                presence.setElement(element);
                assignRef(local.ref, element);
              }}
              {...rest}
              class={contentClass()}
            >
              {contentChildren()}
            </DynamicAny>
          )}
        </Show>
      </DialogPortal>
    </Show>
  );
};

type DialogTemplateProps = Omit<DialogContentProps, "title"> & {
  bodyClass?: string;
  description?: JSX.Element;
  footer?: JSX.Element;
  footerClass?: string;
  header?: JSX.Element;
  headerClass?: string;
  layoutClass?: string;
  title?: JSX.Element;
};

const DialogTemplate: Component<DialogTemplateProps> = (props) => {
  const local = props;
  const rest = omit(
    props,
    "bodyClass",
    "children",
    "class",
    "description",
    "footer",
    "footerClass",
    "header",
    "headerClass",
    "layoutClass",
    "title",
  );

  return (
    <DialogContent class={local.class} {...rest}>
      <div class={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-hidden", local.layoutClass)}>
        <Show
          when={local.header}
          fallback={
            <Show when={local.title || local.description}>
              <DialogHeader class={cn("shrink-0 pr-10", local.headerClass)}>
                <Show when={local.title}>
                  <DialogTitle>{local.title}</DialogTitle>
                </Show>
                <Show when={local.description}>
                  <DialogDescription>{local.description}</DialogDescription>
                </Show>
              </DialogHeader>
            </Show>
          }
        >
          {local.header}
        </Show>
        <DialogTemplateContext value={{ stickyFooter: true }}>
          <div class={cn("min-h-0 overflow-y-auto", local.bodyClass)}>{local.children}</div>
        </DialogTemplateContext>
        <Show when={local.footer}>
          <DialogFooter class={cn("shrink-0", local.footerClass)}>{local.footer}</DialogFooter>
        </Show>
      </div>
    </DialogContent>
  );
};

const DialogHeader: Component<ComponentProps<"div">> = (props) => {
  const local = props;
  const rest = omit(props, "class");
  return <div class={cn("flex flex-col gap-4 text-center sm:!text-left", local.class)} {...rest} />;
};

const DialogFooter: Component<ComponentProps<"div">> = (props) => {
  const template = useContext(DialogTemplateContext);
  const local = props;
  const rest = omit(props, "class");
  return (
    <div
      class={cn(
        "flex flex-col-reverse sm:!flex-row sm:!justify-end sm:!space-x-2",
        template?.stickyFooter && "sticky bottom-0 z-10 bg-surface-raised pt-4",
        local.class,
      )}
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
  const dialog = useOptionalDialog();
  const local = props;
  const rest = omit(props, "as", "class", "children", "id");
  return (
    <Dynamic
      component={local.as ?? "h2"}
      id={local.id ?? dialog?.titleId}
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
  const dialog = useOptionalDialog();
  const local = props;
  const rest = omit(props, "as", "class", "children", "id");
  return (
    <Dynamic
      component={local.as ?? "p"}
      id={local.id ?? dialog?.descriptionId}
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

export type { DialogTemplateProps };
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTemplate,
  DialogTitle,
  DialogTrigger,
};
