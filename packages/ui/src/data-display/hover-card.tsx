/**
 * # HoverCard
 *
 * Reveals extra content while the trigger is hovered or focused.
 *
 * @example
 * ```tsx
 * <HoverCard>
 *   <HoverCardTrigger>Owner</HoverCardTrigger>
 *   <HoverCardContent>Assigned to Ada Lovelace</HoverCardContent>
 * </HoverCard>
 * ```
 */
import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import type { Component } from "solid-js";
import { createContext, createSignal, omit, Show, useContext } from "solid-js";
import { cn } from "../cn";

const DynamicAny = Dynamic as any;

type HoverCardContextValue = {
  close: () => void;
  open: () => boolean;
  openNow: () => void;
  setTrigger: (element: HTMLElement) => void;
  trigger: () => HTMLElement | undefined;
};

const HoverCardContext = createContext<HoverCardContextValue>();

function useHoverCard() {
  const context = useContext(HoverCardContext);
  if (!context) throw new Error("HoverCard parts must be used inside HoverCard.");
  return context;
}

type HoverCardProps = {
  children?: JSX.Element;
  defaultOpen?: boolean;
  gutter?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const HoverCard: Component<HoverCardProps> = (props) => {
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(Boolean(props.defaultOpen));
  const [trigger, setTrigger] = createSignal<HTMLElement>();
  const open = () => props.open ?? uncontrolledOpen();
  const setOpen = (next: boolean) => {
    if (props.open === undefined) setUncontrolledOpen(next);
    props.onOpenChange?.(next);
  };

  return (
    <HoverCardContext
      value={{
        close: () => setOpen(false),
        open,
        openNow: () => setOpen(true),
        setTrigger,
        trigger,
      }}
    >
      {props.children}
    </HoverCardContext>
  );
};

type HoverCardTriggerProps<T extends ValidComponent = "span"> = Omit<
  ComponentProps<"div">,
  "ref"
> & {
  as?: T;
  children?: JSX.Element;
  ref?: any;
};

const HoverCardTrigger = <T extends ValidComponent = "span">(props: HoverCardTriggerProps<T>) => {
  const hoverCard = useHoverCard();
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
    hoverCard.setTrigger(element);
    const ref = local.ref as ((element: HTMLElement) => void) | undefined;
    ref?.(element);
  };
  const onMouseEnter: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    const handler = local.onMouseEnter as JSX.EventHandler<HTMLElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) hoverCard.openNow();
  };
  const onMouseLeave: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    const handler = local.onMouseLeave as JSX.EventHandler<HTMLElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) hoverCard.close();
  };
  const onFocus: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    const handler = local.onFocus as JSX.EventHandler<HTMLElement, FocusEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) hoverCard.openNow();
  };
  const onBlur: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    const handler = local.onBlur as JSX.EventHandler<HTMLElement, FocusEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) hoverCard.close();
  };

  return (
    <DynamicAny
      component={local.as ?? "span"}
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

type HoverCardContentProps<T extends ValidComponent = "div"> = ComponentProps<"div"> & {
  as?: T;
  children?: JSX.Element;
};

const HoverCardContent = <T extends ValidComponent = "div">(props: HoverCardContentProps<T>) => {
  const hoverCard = useHoverCard();
  const local = props;
  const others = omit(props, "as", "class", "children", "onMouseEnter", "onMouseLeave");
  const style = () => {
    const rect = hoverCard.trigger()?.getBoundingClientRect();
    if (!rect) return { left: "0px", top: "0px" };
    return {
      left: `${rect.left}px`,
      top: `${rect.bottom + 8}px`,
    };
  };
  const onMouseEnter: JSX.EventHandler<HTMLDivElement, MouseEvent> = (event) => {
    const handler = local.onMouseEnter as JSX.EventHandler<HTMLDivElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) hoverCard.openNow();
  };
  const onMouseLeave: JSX.EventHandler<HTMLDivElement, MouseEvent> = (event) => {
    const handler = local.onMouseLeave as JSX.EventHandler<HTMLDivElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) hoverCard.close();
  };

  return (
    <Show when={hoverCard.open()}>
      <Dynamic
        component={local.as ?? "div"}
        class={cn(
          "fixed z-50 w-64 rounded-md border border-border-subtle bg-popover p-4 text-popover-foreground shadow-elevation-medium outline-hidden",
          local.class,
        )}
        style={style()}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        {...others}
      >
        {local.children}
      </Dynamic>
    </Show>
  );
};

export type { HoverCardContentProps, HoverCardProps, HoverCardTriggerProps };
export { HoverCard, HoverCardContent, HoverCardTrigger };
