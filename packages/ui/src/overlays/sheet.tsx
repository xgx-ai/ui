/**
 * # Sheet
 *
 * Opens a side panel for secondary tasks.
 *
 * @example
 * ```tsx
 * <Sheet open={open()} onOpenChange={setOpen}>
 *   <SheetContent side="right">
 *     <SheetHeader>
 *       <SheetTitle>Record details</SheetTitle>
 *     </SheetHeader>
 *   </SheetContent>
 * </Sheet>
 * ```
 */
import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import { cva, type VariantProps } from "class-variance-authority";
import type { Component } from "solid-js";
import { createContext, createSignal, createUniqueId, omit, Show, useContext } from "solid-js";
import { cn } from "../cn";
import { X } from "../icons.index";
import { assignRef } from "./floating";
import { createModalBehavior } from "./modal-behavior";
import { PortalMount } from "./portal";

type SheetContextValue = {
  close: () => void;
  descriptionId: string;
  modal: () => boolean;
  open: () => boolean;
  preventScroll: () => boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
};

const SheetContext = createContext<SheetContextValue>();

function useSheet() {
  const context = useContext(SheetContext);
  if (!context) throw new Error("Sheet parts must be used inside Sheet.");
  return context;
}

type SheetProps = Omit<ComponentProps<"div">, "onChange"> & {
  children?: JSX.Element;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  preventScroll?: boolean;
};

const Sheet: Component<SheetProps> = (props) => {
  const local = props;
  const others = omit(
    props,
    "children",
    "defaultOpen",
    "modal",
    "onOpenChange",
    "open",
    "preventScroll",
  );
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(Boolean(local.defaultOpen));
  const open = () => local.open ?? uncontrolledOpen();
  const modal = () => local.modal ?? true;
  const preventScroll = () => local.preventScroll ?? modal();
  const titleId = createUniqueId();
  const descriptionId = createUniqueId();
  const setOpen = (next: boolean) => {
    if (local.open === undefined) setUncontrolledOpen(next);
    local.onOpenChange?.(next);
  };

  return (
    <SheetContext
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
      <div data-open={open() ? "" : undefined} {...others}>
        {local.children}
      </div>
    </SheetContext>
  );
};

type SheetTriggerProps<T extends ValidComponent = "button"> = ComponentProps<"button"> & {
  as?: T;
  children?: JSX.Element;
};

const SheetTrigger = <T extends ValidComponent = "button">(props: SheetTriggerProps<T>) => {
  const sheet = useSheet();
  const local = props;
  const others = omit(props, "as", "children", "onClick", "type");
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) sheet.setOpen(true);
  };

  return (
    <Dynamic
      component={local.as ?? "button"}
      type={local.as ? local.type : (local.type ?? "button")}
      onClick={onClick}
      {...others}
    >
      {local.children}
    </Dynamic>
  );
};

type SheetCloseProps = ComponentProps<"button">;

const SheetClose = (props: SheetCloseProps) => {
  const sheet = useSheet();
  const local = props;
  const others = omit(props, "onClick", "type");
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) sheet.close();
  };

  return <button type={local.type ?? "button"} onClick={onClick} {...others} />;
};

const portalVariants = cva("fixed inset-0 z-50 flex", {
  variants: {
    position: {
      top: "items-start",
      bottom: "items-end",
      left: "justify-start",
      right: "justify-end",
    },
  },
  defaultVariants: { position: "right" },
});

type SheetPortalProps = ComponentProps<"div"> & VariantProps<typeof portalVariants>;

const SheetPortal: Component<SheetPortalProps> = (props) => {
  const local = props;
  const others = omit(props, "position", "children", "class");
  return (
    <PortalMount>
      <div class={cn(portalVariants({ position: local.position }), local.class)} {...others}>
        {local.children}
      </div>
    </PortalMount>
  );
};

type SheetOverlayProps = ComponentProps<"div">;

const SheetOverlay = (props: SheetOverlayProps) => {
  const sheet = useSheet();
  const local = props;
  const others = omit(props, "class", "onClick");
  const onClick: JSX.EventHandler<HTMLDivElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLDivElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) sheet.close();
  };

  return (
    <div
      class={cn("fixed inset-0 z-50 bg-foreground/35", local.class)}
      onClick={onClick}
      {...others}
    />
  );
};

const sheetVariants = cva(
  "fixed z-50 gap-4 border-border-subtle bg-surface-raised p-6 text-surface-raised-foreground shadow-elevation-high transition ease-in-out",
  {
    variants: {
      position: {
        top: "inset-x-0 top-0 border-b",
        bottom: "inset-x-0 bottom-0 border-t",
        left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
      },
    },
    defaultVariants: {
      position: "right",
    },
  },
);

type SheetContentProps<T extends ValidComponent = "div"> = ComponentProps<"div"> &
  VariantProps<typeof sheetVariants> & {
    as?: T;
    children?: JSX.Element;
    overlay?: boolean;
  };

const SheetContent = <T extends ValidComponent = "div">(props: SheetContentProps<T>) => {
  const sheet = useSheet();
  const local = props;
  const others = omit(
    props,
    "as",
    "position",
    "class",
    "children",
    "overlay",
    "aria-labelledby",
    "aria-describedby",
    "ref",
  );
  const showOverlay = () => local.overlay !== false;
  const [contentRef, setContentRef] = createSignal<HTMLElement>();
  createModalBehavior({
    content: contentRef,
    modal: sheet.modal,
    onClose: sheet.close,
    open: sheet.open,
    preventScroll: sheet.preventScroll,
  });

  return (
    <Show when={sheet.open()}>
      <SheetPortal position={local.position}>
        {showOverlay() && <SheetOverlay />}
        <Dynamic
          component={local.as ?? "div"}
          role="dialog"
          aria-modal={sheet.modal() ? "true" : undefined}
          aria-labelledby={local["aria-labelledby"] ?? sheet.titleId}
          aria-describedby={local["aria-describedby"] ?? sheet.descriptionId}
          tabindex={-1}
          ref={(element: HTMLElement) => {
            setContentRef(element);
            assignRef(local.ref, element);
          }}
          class={cn(
            sheetVariants({ position: local.position }),
            "max-h-screen overflow-y-auto",
            local.class,
          )}
          {...others}
        >
          {local.children}
          <SheetClose class="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-muted-foreground ring-offset-background transition-colors hover:bg-hover hover:text-hover-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
            <X aria-hidden="true" class="size-4" />
            <span class="sr-only">Close</span>
          </SheetClose>
        </Dynamic>
      </SheetPortal>
    </Show>
  );
};

const SheetHeader: Component<ComponentProps<"div">> = (props) => {
  const local = props;
  const others = omit(props, "class");
  return (
    <div class={cn("flex flex-col space-y-2 text-center sm:text-left", local.class)} {...others} />
  );
};

const SheetFooter: Component<ComponentProps<"div">> = (props) => {
  const local = props;
  const others = omit(props, "class");
  return (
    <div
      class={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", local.class)}
      {...others}
    />
  );
};

type SheetTitleProps<T extends ValidComponent = "h2"> = ComponentProps<"h2"> & {
  as?: T;
};

const SheetTitle = <T extends ValidComponent = "h2">(props: SheetTitleProps<T>) => {
  const sheet = useSheet();
  const local = props;
  const others = omit(props, "as", "class", "id");
  return (
    <Dynamic
      component={local.as ?? "h2"}
      id={local.id ?? sheet.titleId}
      class={cn("text-lg font-semibold text-foreground", local.class)}
      {...others}
    />
  );
};

type SheetDescriptionProps<T extends ValidComponent = "p"> = ComponentProps<"p"> & {
  as?: T;
};

const SheetDescription = <T extends ValidComponent = "p">(props: SheetDescriptionProps<T>) => {
  const sheet = useSheet();
  const local = props;
  const others = omit(props, "as", "class", "id");
  return (
    <Dynamic
      component={local.as ?? "p"}
      id={local.id ?? sheet.descriptionId}
      class={cn("text-sm text-muted-foreground", local.class)}
      {...others}
    />
  );
};

export type {
  SheetContentProps,
  SheetDescriptionProps,
  SheetProps,
  SheetTitleProps,
  SheetTriggerProps,
};
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
