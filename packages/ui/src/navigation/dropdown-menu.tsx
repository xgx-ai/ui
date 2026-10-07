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
  onCleanup,
  Show,
  untrack,
  useContext,
} from "solid-js";
import { cn } from "../cn";
import { Check, ChevronRight, Circle } from "../icons.index";
import { assignRef, containsNode } from "../overlays/floating";
import { PopperPositioner, PopperRoot } from "../overlays/popper";
import { PortalMount } from "../overlays/portal";
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

type DropdownMenuContextValue = {
  closeAll: () => void;
  closeChildren: () => void;
  children: Set<DropdownMenuContextValue>;
  elements: Set<HTMLElement>;
  contentRef: () => HTMLElement | undefined;
  gutter: () => number;
  open: () => boolean;
  placement: () => Placement;
  parent?: DropdownMenuContextValue;
  setOpen: (open: boolean) => void;
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
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(
    untrack(() => local.defaultOpen ?? false),
  );
  const [triggerRef, setTriggerRef] = createSignal<HTMLElement>();
  const [contentRef, setContentRef] = createSignal<HTMLElement>();
  const parent = untrack(() => props.parent);
  const elements = parent?.elements ?? new Set<HTMLElement>();
  const children = new Set<DropdownMenuContextValue>();
  const isOpen = () => local.open ?? uncontrolledOpen();
  const closeChildren = () => {
    for (const child of children) child.setOpen(false);
  };
  const setOpen = (open: boolean) => {
    if (!open) closeChildren();
    if (open && parent) {
      for (const sibling of parent.children) {
        if (sibling !== menu) sibling.setOpen(false);
      }
    }
    if (local.open === undefined) setUncontrolledOpen(open);
    local.onOpenChange?.(open);
  };
  const closeAll = () => {
    if (parent) parent.closeAll();
    else setOpen(false);
  };
  const placement = () => local.placement || local.positioning?.placement || "bottom";
  const gutter = () => local.gutter ?? 4;
  let rootRef!: HTMLDivElement;

  createEffect(isOpen, (open) => {
    if (!open) return;

    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !containsNode(rootRef, target) &&
        ![...elements].some((element) => containsNode(element, target))
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  });

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && !event.defaultPrevented) {
      event.stopPropagation();
      setOpen(false);
      triggerRef()?.focus();
    }
  };

  const menu: DropdownMenuContextValue = {
    closeAll,
    closeChildren,
    children,
    elements,
    contentRef,
    gutter,
    open: isOpen,
    placement,
    parent,
    setOpen,
    setContentRef: (element) => {
      const previous = untrack(contentRef);
      if (previous) elements.delete(previous);
      elements.add(element);
      setContentRef(element);
    },
    setTriggerRef,
    triggerRef,
  };
  parent?.children.add(menu);
  onCleanup(() => {
    parent?.children.delete(menu);
    const content = untrack(contentRef);
    if (content) elements.delete(content);
  });

  return (
    <DropdownMenuContext value={menu}>
      <PopperRoot
        anchorRef={() => triggerRef() ?? rootRef}
        contentRef={contentRef}
        gutter={gutter()}
        open={isOpen}
        placement={placement()}
      >
        <div
          ref={rootRef}
          class={cn(parent ? "relative block" : "relative inline-block", local.class)}
          data-xgx-dropdown-open={isOpen() ? "true" : "false"}
          data-xgx-dropdown-placement={placement()}
          onKeyDown={onKeyDown}
          {...rest}
        >
          {local.children}
        </div>
      </PopperRoot>
    </DropdownMenuContext>
  );
};

const DropdownMenu = (props: DropdownMenuProps) => <DropdownMenuRoot {...props} />;

function callMenuHandler<TElement, TEvent>(
  handler: unknown,
  event: TEvent & { currentTarget: TElement },
) {
  if (typeof handler === "function") handler(event);
  else if (Array.isArray(handler) && typeof handler[0] === "function")
    handler[0](handler[1], event);
}

type DropdownMenuTriggerOwnProps = {
  children?: JSX.Element;
  class?: string | undefined;
  onClick?: JSX.EventHandlerUnion<HTMLElement, MouseEvent>;
  onKeyDown?: JSX.EventHandler<HTMLElement, KeyboardEvent>;
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
    const handler = local.onKeyDown as JSX.EventHandler<HTMLElement, KeyboardEvent> | undefined;
    handler?.(event);
    if (event.defaultPrevented) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      menu.setOpen(true);
      requestAnimationFrame(() => focusFirstMenuItem(menu.contentRef()));
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
        callMenuHandler(local.onClick, event);
        if (!event.defaultPrevented) menu.setOpen(!menu.open());
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
  const local = props;
  const rest = omit(props, "class", "onKeyDown", "ref");
  const menuKeyboard = createMenuKeyboard({
    close: () => menu.setOpen(false),
    root: menu.contentRef,
    trigger: menu.triggerRef,
  });
  const onKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    const handler = local.onKeyDown as JSX.EventHandler<HTMLDivElement, KeyboardEvent> | undefined;
    handler?.(event);
    if (event.key === "ArrowLeft" && menu.parent) {
      event.preventDefault();
      menu.setOpen(false);
      menu.triggerRef()?.focus();
    } else menuKeyboard(event);
    if (event.defaultPrevented) event.stopPropagation();
  };

  createEffect(menu.open, (open) => {
    if (open) queueMicrotask(() => focusFirstMenuItem(menu.contentRef()));
  });

  return (
    <Show when={menu.open()}>
      <PopperPositioner>
        <div
          data-xgx-dropdown-content
          role="menu"
          tabindex={-1}
          ref={(element) => {
            menu.setContentRef(element);
            assignRef(local.ref, element);
            requestAnimationFrame(() => focusFirstMenuItem(element));
          }}
          onKeyDown={onKeyDown}
          class={cn(
            "z-50 min-w-32 origin-top overflow-hidden rounded-md border border-border-subtle bg-popover p-1 text-popover-foreground shadow-elevation-medium outline-hidden",
            local.class,
          )}
          {...rest}
        />
      </PopperPositioner>
    </Show>
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
        callMenuHandler(local.onClick, event);
        if (!event.defaultPrevented && local.closeOnSelect !== false) menu.closeAll();
      }}
      onPointerMove={(event) => {
        callMenuHandler(local.onPointerMove, event);
        if (!local.disabled && !event.defaultPrevented) menu.closeChildren();
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
    callMenuHandler(local.onClick, event);
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
        callMenuHandler(local.onClick, event);
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
  const open = (focus: boolean) => {
    if (local.disabled) return;
    menu.setOpen(true);
    if (focus) requestAnimationFrame(() => focusFirstMenuItem(menu.contentRef()));
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
        event.stopPropagation();
        if (local.disabled) {
          event.preventDefault();
          return;
        }
        callMenuHandler(local.onClick, event);
        if (!event.defaultPrevented) open(true);
      }}
      onPointerMove={(event) => {
        callMenuHandler(local.onPointerMove, event);
        if (!event.defaultPrevented && event.pointerType !== "touch") open(false);
      }}
      onKeyDown={(event) => {
        callMenuHandler(local.onKeyDown, event);
        if (event.defaultPrevented || local.disabled) return;
        if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          open(true);
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
