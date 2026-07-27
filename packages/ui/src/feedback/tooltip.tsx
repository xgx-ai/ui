/**
 * # Tooltip
 *
 * Shows concise help text for a trigger.
 *
 * @example
 * ```tsx
 * <Tooltip>
 *   <TooltipTrigger>Archive</TooltipTrigger>
 *   <TooltipContent>Move this item to the archive.</TooltipContent>
 * </Tooltip>
 * ```
 */
import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import {
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  omit,
  Show,
  useContext,
} from "solid-js";
import { cn } from "../cn";
import { assignRef } from "../overlays/floating";
import { PortalMount } from "../overlays/portal";

const DynamicAny = Dynamic as any;

type TooltipContextValue = {
  close: () => void;
  contentId: string;
  gutter: () => number;
  open: () => boolean;
  openNow: () => void;
  placement: () => TooltipPlacement;
  setTrigger: (element: HTMLElement) => void;
  trigger: () => HTMLElement | undefined;
};

const TooltipContext = createContext<TooltipContextValue>();

function useTooltip() {
  const context = useContext(TooltipContext);
  if (!context) throw new Error("Tooltip parts must be used inside Tooltip.");
  return context;
}

type TooltipProps = {
  children?: JSX.Element;
  defaultOpen?: boolean;
  gutter?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: TooltipPlacement;
};

type TooltipPlacement = "top" | "right" | "bottom" | "left";

const Tooltip = (props: TooltipProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(Boolean(props.defaultOpen));
  const [trigger, setTrigger] = createSignal<HTMLElement>();
  const contentId = createUniqueId();
  const open = () => props.open ?? uncontrolledOpen();
  const setOpen = (next: boolean) => {
    if (props.open === undefined) setUncontrolledOpen(next);
    props.onOpenChange?.(next);
  };

  createEffect(open, (isOpen) => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  return (
    <TooltipContext
      value={{
        close: () => setOpen(false),
        contentId,
        gutter: () => props.gutter ?? 6,
        open,
        openNow: () => setOpen(true),
        placement: () => props.placement ?? "bottom",
        setTrigger,
        trigger,
      }}
    >
      {props.children}
    </TooltipContext>
  );
};

type TooltipTriggerProps<T extends ValidComponent = "span"> = Omit<ComponentProps<"div">, "ref"> & {
  as?: T;
  children?: JSX.Element;
  ref?: any;
};

const TooltipTrigger = <T extends ValidComponent = "span">(props: TooltipTriggerProps<T>) => {
  const tooltip = useTooltip();
  const local = props;
  const others = omit(
    props,
    "as",
    "children",
    "onBlur",
    "onFocus",
    "onMouseEnter",
    "onMouseLeave",
    "ref",
  );
  const setRef = (element: HTMLElement) => {
    tooltip.setTrigger(element);
    assignRef(local.ref, element);
  };
  const onMouseEnter: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    const handler = local.onMouseEnter as JSX.EventHandler<HTMLElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) tooltip.openNow();
  };
  const onMouseLeave: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    const handler = local.onMouseLeave as JSX.EventHandler<HTMLElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) tooltip.close();
  };
  const onFocus: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    const handler = local.onFocus as JSX.EventHandler<HTMLElement, FocusEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) tooltip.openNow();
  };
  const onBlur: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    const handler = local.onBlur as JSX.EventHandler<HTMLElement, FocusEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) tooltip.close();
  };

  return (
    <DynamicAny
      component={local.as ?? "span"}
      aria-describedby={tooltip.open() ? tooltip.contentId : undefined}
      ref={setRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      {...others}
    >
      {local.children}
    </DynamicAny>
  );
};

type TooltipContentProps<T extends ValidComponent = "div"> = ComponentProps<"div"> & {
  as?: T;
  children?: JSX.Element;
};

const TooltipContent = <T extends ValidComponent = "div">(props: TooltipContentProps<T>) => {
  const tooltip = useTooltip();
  const local = props;
  const others = omit(props, "as", "class", "children");
  const style = () => {
    const rect = tooltip.trigger()?.getBoundingClientRect();
    if (!rect) return { left: "0px", top: "0px" };
    const gutter = tooltip.gutter();

    switch (tooltip.placement()) {
      case "top":
        return {
          left: `${rect.left + rect.width / 2}px`,
          top: `${rect.top - gutter}px`,
          transform: "translate(-50%, -100%)",
        };
      case "right":
        return {
          left: `${rect.right + gutter}px`,
          top: `${rect.top + rect.height / 2}px`,
          transform: "translateY(-50%)",
        };
      case "left":
        return {
          left: `${rect.left - gutter}px`,
          top: `${rect.top + rect.height / 2}px`,
          transform: "translate(-100%, -50%)",
        };
      default:
        return {
          left: `${rect.left + rect.width / 2}px`,
          top: `${rect.bottom + gutter}px`,
          transform: "translateX(-50%)",
        };
    }
  };

  return (
    <Show when={tooltip.open()}>
      <PortalMount>
        <Dynamic
          component={local.as ?? "div"}
          id={tooltip.contentId}
          role="tooltip"
          class={cn(
            "fixed z-50 max-w-xs overflow-hidden rounded-md border border-border-subtle bg-popover px-3 py-1.5 text-2xs font-medium text-popover-foreground shadow-elevation-medium",
            local.class,
          )}
          style={style()}
          {...others}
        >
          {local.children}
        </Dynamic>
      </PortalMount>
    </Show>
  );
};

export type { TooltipContentProps, TooltipProps, TooltipTriggerProps };
export { Tooltip, TooltipContent, TooltipTrigger };
