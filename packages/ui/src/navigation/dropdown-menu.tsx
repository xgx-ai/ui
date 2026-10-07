/**
 * # DropdownMenu
 *
 * Opens a menu of actions from a trigger.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *   <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuItem>Archive</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 * ```
 */

import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import {
  createContext,
  createEffect,
  createSignal,
  omit,
  onSettled,
  Show,
  untrack,
  useContext,
} from "solid-js";
import { cn } from "../cn";
import { Check, ChevronRight, Circle } from "../icons.index";
import { createDismissableLayer, DismissableLayerContext } from "../overlays/dismissable-layer";
import { assignRef, containsNode } from "../overlays/floating";
import { PopperPositioner, PopperRoot } from "../overlays/popper";
import { PortalMount } from "../overlays/portal";
import { callEventHandler } from "../utils/event-handler";
import type { PolymorphicProps } from "../utils/polymorphic";
import { createMenuKeyboard, focusFirstMenuItem } from "./menu-behavior";

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

type DropdownMenuProps = Omit<ComponentProps<"div">, "onChange"> & {
  children?: JSX.Element;
  defaultOpen?: boolean;
  gutter?: number;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  placement?: Placement;
  /** @deprecated Use placement directly instead */
  positioning?: { placement?: Placement };
};

/** The input that opened a menu. Only keyboard-opened submenus move focus into themselves. */
type MenuOpener = "keyboard" | "pointer";

type DropdownMenuContextValue = {
  /** The open submenu; `undefined` until one is chosen, so `defaultOpen` submenus can show. */
  activeSubmenu: () => DropdownMenuContextValue | null | undefined;
  closeAll: () => void;
  closeSubmenus: () => void;
  contentRef: () => HTMLElement | undefined;
  gutter: () => number;
  open: () => boolean;
  openedBy: () => MenuOpener;
  placement: () => Placement;
  parent?: DropdownMenuContextValue;
  setActiveSubmenu: (submenu: DropdownMenuContextValue | null) => void;
  setOpen: (open: boolean, by?: MenuOpener) => void;
  setContentRef: (element: HTMLElement) => void;
  setTriggerRef: (element: HTMLElement) => void;
  triggerRef: () => HTMLElement | undefined;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu() {
  const context = useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenu parts must be used inside DropdownMenu.");
  return context;
}

function holdsFocus(menu: DropdownMenuContextValue): boolean {
  if (containsNode(menu.contentRef(), document.activeElement)) return true;
  const submenu = menu.activeSubmenu();
  return submenu ? holdsFocus(submenu) : false;
}

const DropdownMenuRoot = (props: DropdownMenuProps & { parent?: DropdownMenuContextValue }) => {
  const local = props;
  const rest = omit(
    props,
    "children",
    "class",
    "defaultOpen",
    "gutter",
    "onOpenChange",
    "open",
    "placement",
    "positioning",
    "parent",
  );
  const parent = untrack(() => props.parent);
  // Filled in below; submenu state compares against this identity before then.
  const menu = {} as DropdownMenuContextValue;
  const defaultOpen = untrack(() => local.defaultOpen ?? false);
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(defaultOpen);
  const [openedBy, setOpenedBy] = createSignal<MenuOpener>("pointer");
  const [rootRef, setRootRef] = createSignal<HTMLDivElement>();
  const [triggerRef, setTriggerRef] = createSignal<HTMLElement>();
  const [contentRef, setContentRef] = createSignal<HTMLElement>();
  // A submenu is open while its parent is open and has chosen it, so closing any menu closes
  // every submenu below it without notifying each one.
  const requestedOpen = parent
    ? () => {
        const active = parent.activeSubmenu();
        return parent.open() && (active === menu || (active === undefined && defaultOpen));
      }
    : uncontrolledOpen;
  const isOpen = () => local.open ?? requestedOpen();
  // Each opening starts with no submenu chosen; a closed menu has none.
  const [activeSubmenu, setActiveSubmenuSignal] = createSignal<
    DropdownMenuContextValue | null | undefined
  >(() => (isOpen() ? undefined : null));
  const setActiveSubmenu = (next: DropdownMenuContextValue | null) => {
    const current = activeSubmenu();
    if (current === next) return;
    // Closing a submenu removes its content. Keep focus in the menu rather than on <body>.
    if (current && holdsFocus(current)) current.triggerRef()?.focus();
    setActiveSubmenuSignal(next);
  };
  const setOpen = (open: boolean, by: MenuOpener = "pointer") => {
    if (open && !isOpen()) setOpenedBy(by);
    if (parent) {
      if (open) parent.setActiveSubmenu(menu);
      else if (requestedOpen()) parent.setActiveSubmenu(null);
      return;
    }
    if (open === isOpen()) return;
    if (local.open === undefined) setUncontrolledOpen(open);
    local.onOpenChange?.(open);
  };
  const closeAll = () => {
    if (parent) parent.closeAll();
    else setOpen(false);
  };
  const placement = () => local.placement || local.positioning?.placement || "bottom";
  const gutter = () => local.gutter ?? 4;

  // Submenu state is derived, so report only real changes to its open state.
  if (parent) {
    createEffect(
      () => ({ onOpenChange: local.onOpenChange, open: requestedOpen() }),
      (next, previous) => {
        if (previous && next.open !== previous.open) next.onOpenChange?.(next.open);
      },
    );
  }

  const layer = createDismissableLayer({
    open: isOpen,
    elements: () => [rootRef(), contentRef()],
    // Submenus close with their parent or when another item is chosen.
    onPointerDownOutside: parent ? undefined : () => setOpen(false),
    onEscapeKeyDown: () => {
      setOpen(false);
      triggerRef()?.focus();
    },
  });

  Object.assign(menu, {
    activeSubmenu,
    closeAll,
    closeSubmenus: () => setActiveSubmenu(null),
    contentRef,
    gutter,
    open: isOpen,
    openedBy,
    placement,
    parent,
    setActiveSubmenu,
    setOpen,
    setContentRef,
    setTriggerRef,
    triggerRef,
  } satisfies DropdownMenuContextValue);

  return (
    <DismissableLayerContext value={layer}>
      <DropdownMenuContext value={menu}>
        <PopperRoot
          anchorRef={() => triggerRef() ?? rootRef()}
          contentRef={contentRef}
          gutter={gutter()}
          open={isOpen}
          placement={placement()}
        >
          <div
            ref={setRootRef}
            class={cn(parent ? "relative block" : "relative inline-block", local.class)}
            data-xgx-dropdown-open={isOpen() ? "true" : "false"}
            data-xgx-dropdown-placement={placement()}
            {...rest}
          >
            {local.children}
          </div>
        </PopperRoot>
      </DropdownMenuContext>
    </DismissableLayerContext>
  );
};

const DropdownMenu = (props: DropdownMenuProps) => <DropdownMenuRoot {...props} />;

type DropdownMenuTriggerOwnProps = {
  children?: JSX.Element;
  class?: string | undefined;
  onClick?: JSX.EventHandlerUnion<HTMLElement, MouseEvent>;
  onKeyDown?: JSX.EventHandlerUnion<HTMLElement, KeyboardEvent>;
  ref?: any;
  type?: ComponentProps<"button">["type"];
};

type DropdownMenuTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  DropdownMenuTriggerOwnProps
>;

const DropdownMenuTrigger = <T extends ValidComponent = "button">(
  props: DropdownMenuTriggerProps<T>,
) => {
  const menu = useDropdownMenu();
  const local = props;
  const rest = omit(props, "as", "class", "onClick", "onKeyDown", "ref", "type");
  const onKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(local.onKeyDown, event);
    if (event.defaultPrevented) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      // Opening focuses the first item once the content mounts.
      if (menu.open()) focusFirstMenuItem(menu.contentRef());
      else menu.setOpen(true, "keyboard");
    }
  };

  return (
    <DynamicAny
      component={local.as ?? "button"}
      data-xgx-dropdown-trigger
      aria-haspopup="menu"
      type={local.type ?? "button"}
      aria-expanded={menu.open() ? "true" : "false"}
      data-expanded={menu.open() ? "" : undefined}
      ref={(element: HTMLElement) => {
        menu.setTriggerRef(element);
        assignRef(local.ref, element);
      }}
      class={local.class}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement }) => {
        callEventHandler(local.onClick, event);
        // A keyboard activation of the button reports no clicks.
        if (!event.defaultPrevented)
          menu.setOpen(!menu.open(), event.detail === 0 ? "keyboard" : "pointer");
      }}
      onKeyDown={onKeyDown}
      {...rest}
    />
  );
};

const DropdownMenuPortal = (props: { children?: JSX.Element }) => (
  <PortalMount>{props.children}</PortalMount>
);
const DropdownMenuSub = (props: DropdownMenuProps) => {
  const parent = useDropdownMenu();
  return (
    <DropdownMenuRoot {...props} parent={parent} placement={props.placement ?? "right-start"} />
  );
};
const DropdownMenuGroup = (props: ComponentProps<"div">) => <div role="group" {...props} />;
const DropdownMenuRadioGroup = (props: ComponentProps<"div">) => <div role="group" {...props} />;

type DropdownMenuContentProps = ComponentProps<"div"> & {
  class?: string | undefined;
};

const DropdownMenuContent = (props: DropdownMenuContentProps) => {
  const menu = useDropdownMenu();
  return (
    <Show when={menu.open()}>
      <DropdownMenuPanel {...props} />
    </Show>
  );
};

/** The mounted menu content. Each opening mounts a fresh panel, which focuses once. */
const DropdownMenuPanel = (props: DropdownMenuContentProps) => {
  const menu = useDropdownMenu();
  const local = props;
  const rest = omit(props, "class", "onKeyDown", "ref");
  let element: HTMLDivElement | undefined;
  const menuKeyboard = createMenuKeyboard({
    close: () => menu.setOpen(false),
    root: menu.contentRef,
    trigger: menu.triggerRef,
  });
  const onKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    callEventHandler(local.onKeyDown, event);
    if (!event.defaultPrevented) {
      if (event.key === "Escape" && menu.activeSubmenu()?.open()) {
        // Escape closes the innermost menu first, even before focus has moved into it.
        event.preventDefault();
        menu.closeSubmenus();
      } else if (event.key === "ArrowLeft" && menu.parent) {
        event.preventDefault();
        menu.setOpen(false);
        menu.triggerRef()?.focus();
      } else menuKeyboard(event);
    }
    // Keep a handled key from reaching parent menus or the document.
    if (event.defaultPrevented) event.stopPropagation();
  };

  // A pointer-opened submenu leaves focus where the pointer user left it. The popper reveals
  // the content only after its first asynchronous position, and hidden content cannot take
  // focus, so focus waits one frame.
  onSettled(() => {
    if (menu.parent && menu.openedBy() === "pointer") return;
    const frame = requestAnimationFrame(() => focusFirstMenuItem(element));
    return () => cancelAnimationFrame(frame);
  });

  return (
    <PopperPositioner>
      <div
        data-xgx-dropdown-content
        role="menu"
        tabindex={-1}
        ref={(node) => {
          element = node;
          menu.setContentRef(node);
          assignRef(local.ref, node);
        }}
        onKeyDown={onKeyDown}
        class={cn(
          "z-50 min-w-32 origin-top overflow-hidden rounded-md border border-border-subtle bg-popover p-1 text-popover-foreground shadow-elevation-medium outline-hidden",
          local.class,
        )}
        {...rest}
      />
    </PopperPositioner>
  );
};

type DropdownMenuItemProps = ComponentProps<"div"> & {
  closeOnSelect?: boolean;
  disabled?: boolean;
  value?: string;
};

const DropdownMenuItem = (props: DropdownMenuItemProps) => {
  const menu = useDropdownMenu();
  const local = props;
  const rest = omit(
    props,
    "class",
    "closeOnSelect",
    "disabled",
    "value",
    "onClick",
    "onPointerMove",
  );

  return (
    <div
      data-close-on-select={local.closeOnSelect === false ? "false" : "true"}
      data-disabled={local.disabled ? "" : undefined}
      data-value={local.value}
      data-xgx-dropdown-item
      role="menuitem"
      aria-disabled={local.disabled ? "true" : undefined}
      tabindex={local.disabled ? undefined : -1}
      onClick={(event) => {
        if (local.disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        callEventHandler(local.onClick, event);
        if (!event.defaultPrevented && local.closeOnSelect !== false) menu.closeAll();
      }}
      onPointerMove={(event) => {
        callEventHandler(local.onPointerMove, event);
        if (!local.disabled && !event.defaultPrevented) menu.closeSubmenus();
      }}
      class={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:hidden",
        local.class,
      )}
      {...rest}
    />
  );
};

type DropdownMenuCheckboxItemProps = Omit<ComponentProps<"div">, "onChange"> & {
  checked?: boolean;
  closeOnSelect?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
  value?: string;
};

const DropdownMenuCheckboxItem = (props: DropdownMenuCheckboxItemProps) => {
  const menu = useDropdownMenu();
  const local = props;
  const rest = omit(
    props,
    "checked",
    "children",
    "class",
    "closeOnSelect",
    "disabled",
    "onChange",
    "onClick",
    "onCheckedChange",
    "value",
  );

  const onClick: JSX.EventHandler<HTMLDivElement, MouseEvent> = (event) => {
    if (local.disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    callEventHandler(local.onClick, event);
    if (event.defaultPrevented) return;
    const checked = !local.checked;
    local.onCheckedChange?.(checked);
    local.onChange?.(checked);
    if (local.closeOnSelect === true) menu.closeAll();
  };

  return (
    <div
      data-checked={local.checked ? "true" : "false"}
      data-close-on-select={local.closeOnSelect === false ? "false" : "true"}
      data-disabled={local.disabled ? "" : undefined}
      data-value={local.value}
      data-xgx-dropdown-checkbox
      data-xgx-dropdown-item
      role="menuitemcheckbox"
      aria-disabled={local.disabled ? "true" : undefined}
      aria-checked={local.checked ? "true" : "false"}
      tabindex={local.disabled ? undefined : -1}
      onClick={onClick}
      class={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        local.class,
      )}
      {...rest}
    >
      <span class="absolute left-2 flex size-3.5 items-center justify-center">
        <Show when={local.checked}>
          <Check aria-hidden="true" class="size-4" />
        </Show>
      </span>
      {local.children}
    </div>
  );
};

type DropdownMenuRadioItemProps = ComponentProps<"div"> & {
  checked?: boolean;
  disabled?: boolean;
  value?: string;
};

const DropdownMenuRadioItem = (props: DropdownMenuRadioItemProps) => {
  const menu = useDropdownMenu();
  const local = props;
  const rest = omit(props, "checked", "children", "class", "disabled", "value", "onClick");

  return (
    <div
      data-checked={local.checked ? "true" : "false"}
      data-disabled={local.disabled ? "" : undefined}
      data-value={local.value}
      data-xgx-dropdown-item
      role="menuitemradio"
      aria-disabled={local.disabled ? "true" : undefined}
      onClick={(event) => {
        if (local.disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        callEventHandler(local.onClick, event);
        if (!event.defaultPrevented) menu.closeAll();
      }}
      aria-checked={local.checked ? "true" : "false"}
      tabindex={local.disabled ? undefined : -1}
      class={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        local.class,
      )}
      {...rest}
    >
      <span class="absolute left-2 flex size-3.5 items-center justify-center">
        <Show when={local.checked}>
          <Circle aria-hidden="true" class="size-2 fill-current" />
        </Show>
      </span>
      {local.children}
    </div>
  );
};

const DropdownMenuLabel = (props: ComponentProps<"div"> & { inset?: boolean }) => {
  const local = props;
  const rest = omit(props, "class", "inset");
  return (
    <div
      class={cn("px-2 py-1.5 text-sm font-semibold", local.inset && "pl-8", local.class)}
      {...rest}
    />
  );
};

const DropdownMenuSeparator = (props: ComponentProps<"hr">) => {
  const local = props;
  const rest = omit(props, "class");

  return <hr class={cn("-mx-1 my-1 h-px bg-muted", local.class)} {...rest} />;
};

const DropdownMenuShortcut = (props: ComponentProps<"span">) => {
  const local = props;
  const rest = omit(props, "class");
  return <span class={cn("ml-auto text-xs tracking-widest opacity-60", local.class)} {...rest} />;
};

const DropdownMenuGroupLabel = (props: ComponentProps<"span">) => {
  const local = props;
  const rest = omit(props, "class");

  return <span class={cn("px-2 py-1.5 text-sm font-semibold", local.class)} {...rest} />;
};

const DropdownMenuSubTrigger = (props: ComponentProps<"div"> & { disabled?: boolean }) => {
  const menu = useDropdownMenu();
  const local = props;
  const rest = omit(
    props,
    "class",
    "children",
    "disabled",
    "onClick",
    "onKeyDown",
    "onPointerMove",
    "ref",
  );
  const open = (by: MenuOpener) => {
    if (local.disabled) return;
    // Opening by keyboard focuses the first item once the submenu mounts.
    if (by === "keyboard" && menu.open()) focusFirstMenuItem(menu.contentRef());
    else menu.setOpen(true, by);
  };
  return (
    <div
      data-xgx-dropdown-item
      data-xgx-dropdown-sub-trigger
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={menu.open() ? "true" : "false"}
      aria-disabled={local.disabled ? "true" : undefined}
      data-disabled={local.disabled ? "" : undefined}
      tabindex={local.disabled ? undefined : -1}
      ref={(element) => {
        menu.setTriggerRef(element);
        assignRef(local.ref, element);
      }}
      onClick={(event) => {
        if (local.disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        callEventHandler(local.onClick, event);
        if (event.defaultPrevented) return;
        // Opening a submenu is navigation inside the menu, not an activation for outer handlers.
        event.stopPropagation();
        open(event.detail === 0 ? "keyboard" : "pointer");
      }}
      onPointerMove={(event) => {
        callEventHandler(local.onPointerMove, event);
        if (!event.defaultPrevented && event.pointerType !== "touch") open("pointer");
      }}
      onKeyDown={(event) => {
        callEventHandler(local.onKeyDown, event);
        if (event.defaultPrevented || local.disabled) return;
        if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          open("keyboard");
        }
      }}
      class={cn(
        "flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-hidden hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        local.class,
      )}
      {...rest}
    >
      {local.children}
      <ChevronRight aria-hidden="true" class="ml-auto size-4" />
    </div>
  );
};

const DropdownMenuSubContent = DropdownMenuContent;

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
