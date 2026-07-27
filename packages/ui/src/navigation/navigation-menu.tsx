/**
 * # NavigationMenu
 *
 * Renders grouped application navigation.
 *
 * @example
 * ```tsx
 * <NavigationMenu>
 *   <NavigationMenuList>
 *     <NavigationMenuItem>
 *       <NavigationMenuTrigger>Products</NavigationMenuTrigger>
 *     </NavigationMenuItem>
 *   </NavigationMenuList>
 * </NavigationMenu>
 * ```
 */
import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import { createContext, createSignal, omit, Show, useContext } from "solid-js";
import { cn } from "../cn";
import { ChevronDown } from "../icons.index";

type NavigationMenuItemContextValue = {
  open: () => boolean;
  setOpen: (open: boolean) => void;
};

const NavigationMenuItemContext = createContext<NavigationMenuItemContextValue>();

function useNavigationMenuItem() {
  const context = useContext(NavigationMenuItemContext);
  if (!context) {
    throw new Error("NavigationMenu item parts must be used inside NavigationMenuItem.");
  }
  return context;
}

type NavigationMenuProps = ComponentProps<"ul"> & {
  children?: JSX.Element;
};

const NavigationMenu = (props: NavigationMenuProps) => {
  const local = props;
  const others = omit(props, "class", "children");
  return (
    <ul
      class={cn(
        "group/menu flex w-max flex-1 list-none items-center justify-center [&>li]:w-full",
        local.class,
      )}
      {...others}
    >
      {local.children}
      <NavigationMenuViewport />
    </ul>
  );
};

type NavigationMenuItemProps = ComponentProps<"li"> & {
  children?: JSX.Element;
};

const NavigationMenuItem = (props: NavigationMenuItemProps) => {
  const local = props;
  const others = omit(props, "class", "children");
  const [open, setOpen] = createSignal(false);
  return (
    <NavigationMenuItemContext value={{ open, setOpen }}>
      <li class={cn("relative", local.class)} onMouseLeave={() => setOpen(false)} {...others}>
        {local.children}
      </li>
    </NavigationMenuItemContext>
  );
};

type NavigationMenuTriggerProps<T extends ValidComponent = "button"> = ComponentProps<"button"> & {
  as?: T;
  children?: JSX.Element;
};

const NavigationMenuTrigger = <T extends ValidComponent = "button">(
  props: NavigationMenuTriggerProps<T>,
) => {
  const item = useNavigationMenuItem();
  const local = props;
  const others = omit(props, "as", "class", "children", "onClick", "onMouseEnter", "type");
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) item.setOpen(!item.open());
  };
  const onMouseEnter: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onMouseEnter as
      | JSX.EventHandler<HTMLButtonElement, MouseEvent>
      | undefined;
    handler?.(event);
    if (!event.defaultPrevented) item.setOpen(true);
  };

  return (
    <Dynamic
      component={local.as ?? "button"}
      type={local.as ? local.type : (local.type ?? "button")}
      aria-expanded={item.open() ? "true" : "false"}
      data-expanded={item.open() ? "" : undefined}
      class={cn(
        "group/trigger inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-[expanded]:bg-accent/50",
        local.class,
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      {...others}
    >
      {local.children}
    </Dynamic>
  );
};

const NavigationMenuIcon = () => (
  <ChevronDown
    aria-hidden="true"
    class="relative top-px ml-1 size-3 transition duration-200 group-data-[expanded]/trigger:rotate-180"
  />
);

type NavigationMenuViewportProps = ComponentProps<"li">;

const NavigationMenuViewport = (props: NavigationMenuViewportProps) => {
  const local = props;
  const others = omit(props, "class");
  return (
    <li
      aria-hidden="true"
      class={cn("pointer-events-none absolute size-0 overflow-hidden", local.class)}
      {...others}
    />
  );
};

type NavigationMenuContentProps<T extends ValidComponent = "ul"> = ComponentProps<"ul"> & {
  as?: T;
};

const NavigationMenuContent = <T extends ValidComponent = "ul">(
  props: NavigationMenuContentProps<T>,
) => {
  const item = useNavigationMenuItem();
  const local = props;
  const others = omit(props, "as", "class");
  return (
    <Show when={item.open()}>
      <Dynamic
        component={local.as ?? "ul"}
        class={cn(
          "absolute left-0 top-full z-50 mt-1 box-border rounded-md border border-border-subtle bg-popover p-4 text-popover-foreground shadow-elevation-medium focus:outline-hidden",
          local.class,
        )}
        {...others}
      />
    </Show>
  );
};

type NavigationMenuLinkProps<T extends ValidComponent = "a"> = ComponentProps<"a"> & {
  as?: T;
};

const NavigationMenuLink = <T extends ValidComponent = "a">(props: NavigationMenuLinkProps<T>) => {
  const local = props;
  const others = omit(props, "as", "class");
  return (
    <Dynamic
      component={local.as ?? "a"}
      class={cn(
        "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        local.class,
      )}
      {...others}
    />
  );
};

const NavigationMenuLabel = (props: ComponentProps<"div">) => {
  const local = props;
  const others = omit(props, "class");
  return <div class={cn("text-sm font-medium leading-none", local.class)} {...others} />;
};

const NavigationMenuDescription = (props: ComponentProps<"div">) => {
  const local = props;
  const others = omit(props, "class");
  return <div class={cn("text-sm leading-snug text-muted-foreground", local.class)} {...others} />;
};

export type {
  NavigationMenuContentProps,
  NavigationMenuItemProps,
  NavigationMenuLinkProps,
  NavigationMenuProps,
  NavigationMenuTriggerProps,
};
export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuDescription,
  NavigationMenuIcon,
  NavigationMenuItem,
  NavigationMenuLabel,
  NavigationMenuLink,
  NavigationMenuTrigger,
  NavigationMenuViewport,
};
