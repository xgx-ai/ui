/**
 * # Popover
 *
 * Anchors floating content to a trigger.
 *
 * @example
 * ```tsx
 * <Popover>
 *   <PopoverTrigger>Open filters</PopoverTrigger>
 *   <PopoverContent>Filter controls</PopoverContent>
 * </Popover>
 * ```
 */
import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import { createContext, createEffect, createSignal, omit, Show, useContext } from "solid-js";
import { cn } from "../cn";
import { assignRef, containsNode } from "./floating";
import { PopperPositioner, PopperRoot } from "./popper";
import { PortalMount } from "./portal";

const DynamicAny = Dynamic as any;

type Placement =
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "top"
  | "top-start"
  | "top-end"
  | "left"
  | "left-start"
  | "left-end"
  | "right"
  | "right-start"
  | "right-end";

type PopoverProps = Omit<ComponentProps<"div">, "onChange"> & {
  children?: JSX.Element;
  open?: boolean;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: Placement;
  gutter?: number;
  positioning?: {
    placement?: Placement;
    gutter?: number;
    offset?: { crossAxis?: number };
  };
};

type PopoverContextValue = {
  anchorRef: () => HTMLElement | undefined;
  close: () => void;
  contentRef: () => HTMLElement | undefined;
  gutter: () => number;
  open: () => boolean;
  placement: () => Placement;
  setContentRef: (element: HTMLElement) => void;
  setOpen: (open: boolean) => void;
  setTriggerRef: (element: HTMLElement) => void;
};

const PopoverContext = createContext<PopoverContextValue>();

function usePopover() {
  const context = useContext(PopoverContext);
  if (!context) throw new Error("Popover parts must be used inside Popover.");
  return context;
}

const Popover = (props: PopoverProps) => {
  const [rootRef, setRootRef] = createSignal<HTMLDivElement>();
  const [triggerRef, setTriggerRef] = createSignal<HTMLElement>();
  const [contentRef, setContentRef] = createSignal<HTMLElement>();
  const local = props;
  const others = omit(
    props,
    "children",
    "class",
    "defaultOpen",
    "gutter",
    "isOpen",
    "onOpenChange",
    "open",
    "placement",
    "positioning",
  );
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(Boolean(local.defaultOpen));
  const open = () => local.open ?? local.isOpen ?? uncontrolledOpen();
  const placement = () => local.placement ?? local.positioning?.placement ?? "bottom-start";
  const gutter = () => local.gutter ?? local.positioning?.gutter ?? 8;
  const anchorRef = () => triggerRef() ?? rootRef();
  const setOpen = (next: boolean) => {
    if (local.open === undefined && local.isOpen === undefined) {
      setUncontrolledOpen(next);
    }
    local.onOpenChange?.(next);
  };

  createEffect(open, (isOpen) => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!containsNode(rootRef(), target) && !containsNode(contentRef(), target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  return (
    <PopoverContext
      value={{
        anchorRef,
        close: () => setOpen(false),
        contentRef,
        gutter,
        open,
        placement,
        setContentRef,
        setOpen,
        setTriggerRef,
      }}
    >
      <PopperRoot
        anchorRef={anchorRef}
        contentRef={contentRef}
        gutter={gutter()}
        open={open}
        placement={placement()}
      >
        <div
          ref={setRootRef}
          data-open={open() ? "" : undefined}
          class={cn("relative inline-block", local.class)}
          {...others}
        >
          {local.children}
        </div>
      </PopperRoot>
    </PopoverContext>
  );
};

type PopoverTriggerProps<T extends ValidComponent = "button"> = ComponentProps<"button"> & {
  as?: T;
  children?: JSX.Element;
};

type PopoverAnchorProps<T extends ValidComponent = "div"> = ComponentProps<"div"> & {
  as?: T;
  children?: JSX.Element;
};

const PopoverAnchor = <T extends ValidComponent = "div">(props: PopoverAnchorProps<T>) => {
  const popover = usePopover();
  const local = props;
  const others = omit(props, "as", "children", "ref");

  if (!local.as) {
    return (
      <div
        ref={(element) => {
          popover.setTriggerRef(element);
          assignRef(local.ref, element);
        }}
        {...others}
      >
        {local.children}
      </div>
    );
  }

  return (
    <DynamicAny
      component={local.as}
      ref={(element: HTMLElement) => {
        popover.setTriggerRef(element);
        assignRef(local.ref, element);
      }}
      {...others}
    >
      {local.children}
    </DynamicAny>
  );
};

const PopoverTrigger = <T extends ValidComponent = "button">(props: PopoverTriggerProps<T>) => {
  const popover = usePopover();
  const local = props;
  const others = omit(props, "as", "children", "onClick", "ref", "type");
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) popover.setOpen(!popover.open());
  };

  if (!local.as) {
    return (
      <button
        type={local.type ?? "button"}
        aria-expanded={popover.open() ? "true" : "false"}
        data-expanded={popover.open() ? "" : undefined}
        ref={(element) => {
          popover.setTriggerRef(element);
          assignRef(local.ref, element);
        }}
        {...others}
        onClick={onClick}
      >
        {local.children}
      </button>
    );
  }

  return (
    <DynamicAny
      component={local.as}
      type={local.type}
      aria-expanded={popover.open() ? "true" : "false"}
      data-expanded={popover.open() ? "" : undefined}
      ref={(element: HTMLElement) => {
        popover.setTriggerRef(element);
        assignRef(local.ref, element);
      }}
      onClick={onClick}
      {...others}
    >
      {local.children}
    </DynamicAny>
  );
};

type PopoverContentProps<T extends ValidComponent = "div"> = ComponentProps<"div"> & {
  as?: T;
  arrow?: boolean;
  portalled?: boolean;
  children?: JSX.Element;
};

const PopoverContent = <T extends ValidComponent = "div">(props: PopoverContentProps<T>) => {
  const popover = usePopover();
  const local = props;
  const others = omit(props, "as", "arrow", "class", "children", "portalled", "ref");

  return (
    <Show when={popover.open()}>
      <PortalMount disabled={local.portalled === false}>
        <PopperPositioner>
          <Dynamic
            component={local.as ?? "div"}
            ref={(element: HTMLElement) => {
              popover.setContentRef(element);
              assignRef(local.ref, element);
            }}
            class={cn(
              "z-50 max-h-[min(28rem,var(--xgx-popper-content-available-height,calc(100vh-4rem)))] w-72 overflow-y-auto rounded-md border border-border-subtle bg-popover p-4 text-popover-foreground shadow-elevation-medium outline-hidden",
              local.class,
            )}
            {...others}
          >
            {local.arrow && <div class="absolute size-2 rotate-45 bg-popover" />}
            {local.children}
          </Dynamic>
        </PopperPositioner>
      </PortalMount>
    </Show>
  );
};

type PopoverCloseProps = ComponentProps<"button">;

const PopoverClose = (props: PopoverCloseProps) => {
  const popover = usePopover();
  const local = props;
  const others = omit(props, "onClick", "type");
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) popover.close();
  };

  return <button type={local.type ?? "button"} onClick={onClick} {...others} />;
};

const PopoverTitle = (props: ComponentProps<"div">) => <div {...props} />;
const PopoverDescription = (props: ComponentProps<"div">) => <div {...props} />;

export type {
  Placement,
  PopoverAnchorProps,
  PopoverContentProps,
  PopoverProps,
  PopoverTriggerProps,
};
export {
  Popover,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
};
