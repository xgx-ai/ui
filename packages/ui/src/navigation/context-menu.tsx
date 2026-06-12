/**
 * # ContextMenu
 *
 * Opens command options from a contextual trigger.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *   <ContextMenuTrigger>Right click</ContextMenuTrigger>
 *   <ContextMenuContent>
 *     <ContextMenuItem>Rename</ContextMenuItem>
 *   </ContextMenuContent>
 * </ContextMenu>
 * ```
 */
import type { ComponentProps, JSX } from "@solidjs/web";
import { createContext, createEffect, createSignal, Show, useContext } from "solid-js";
import { Check, ChevronRight, Circle } from "../icons.index";
import { cn } from "../cn";
import { splitProps } from "../utils/split-props";
import { PortalMount } from "../overlays/portal";
import { createMenuKeyboard, focusFirstMenuItem } from "./menu-behavior";

type ContextMenuContextValue = {
  close: () => void;
  contentRef: () => HTMLElement | undefined;
  open: () => boolean;
  position: () => { x: number; y: number };
  setContentRef: (element: HTMLElement) => void;
  showAt: (x: number, y: number) => void;
};

const ContextMenuContext = createContext<ContextMenuContextValue>();

function useContextMenu() {
  const context = useContext(ContextMenuContext);
  if (!context) throw new Error("ContextMenu parts must be used inside ContextMenu.");
  return context;
}

type ContextMenuRootProps = ComponentProps<"div"> & {
  children?: JSX.Element;
  defaultOpen?: boolean;
  gutter?: number;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

const ContextMenu = (props: ContextMenuRootProps) => {
  const [local, others] = splitProps(props, ["children", "defaultOpen", "onOpenChange", "open"]);
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(Boolean(local.defaultOpen));
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [contentRef, setContentRef] = createSignal<HTMLElement>();
  const open = () => local.open ?? uncontrolledOpen();
  const setOpen = (next: boolean) => {
    if (local.open === undefined) setUncontrolledOpen(next);
    local.onOpenChange?.(next);
  };
  const showAt = (x: number, y: number) => {
    setPosition({ x, y });
    setOpen(true);
  };

  createEffect(open, (isOpen) => {
    if (!isOpen) return;
    const onPointerDown = () => setOpen(false);
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
    <ContextMenuContext
      value={{
        close: () => setOpen(false),
        contentRef,
        open,
        position,
        setContentRef,
        showAt,
      }}
    >
      <div {...others}>{local.children}</div>
    </ContextMenuContext>
  );
};

const ContextMenuTrigger = (props: ComponentProps<"div">) => {
  const menu = useContextMenu();
  const [local, others] = splitProps(props, ["onContextMenu"]);
  const onContextMenu: JSX.EventHandler<HTMLDivElement, MouseEvent> = (event) => {
    const handler = local.onContextMenu as JSX.EventHandler<HTMLDivElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) {
      event.preventDefault();
      menu.showAt(event.clientX, event.clientY);
    }
  };

  return <div onContextMenu={onContextMenu} {...others} />;
};

const ContextMenuPortal = (props: { children?: JSX.Element }) => (
  <PortalMount>{props.children}</PortalMount>
);
const ContextMenuSub = (props: ComponentProps<"div">) => <div {...props} />;
const ContextMenuGroup = (props: ComponentProps<"div">) => <div role="group" {...props} />;
const ContextMenuRadioGroup = (props: ComponentProps<"div">) => <div role="group" {...props} />;

type ContextMenuContentProps = ComponentProps<"div">;

const ContextMenuContent = (props: ContextMenuContentProps) => {
  const menu = useContextMenu();
  const [local, others] = splitProps(props, ["class", "onKeyDown", "onPointerDown", "ref"]);
  const menuKeyboard = createMenuKeyboard({
    close: menu.close,
    root: menu.contentRef,
  });
  const onPointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    event.stopPropagation();
    const handler = local.onPointerDown as
      | JSX.EventHandler<HTMLDivElement, PointerEvent>
      | undefined;
    handler?.(event);
  };
  const onKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    const handler = local.onKeyDown as JSX.EventHandler<HTMLDivElement, KeyboardEvent> | undefined;
    handler?.(event);
    menuKeyboard(event);
  };

  createEffect(menu.open, (open) => {
    if (open) requestAnimationFrame(() => focusFirstMenuItem(menu.contentRef()));
  });

  return (
    <Show when={menu.open()}>
      <div
        role="menu"
        tabindex={-1}
        ref={(element) => {
          menu.setContentRef(element);
          const ref = local.ref;
          if (typeof ref === "function") ref(element);
          requestAnimationFrame(() => focusFirstMenuItem(element));
        }}
        class={cn(
          "fixed z-50 min-w-32 overflow-hidden rounded-md border border-border-subtle bg-popover p-1 text-popover-foreground shadow-elevation-medium",
          local.class,
        )}
        style={{
          left: `${menu.position().x}px`,
          top: `${menu.position().y}px`,
        }}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        {...others}
      />
    </Show>
  );
};

type ContextMenuItemProps = ComponentProps<"div"> & {
  closeOnSelect?: boolean;
  disabled?: boolean;
};

const ContextMenuItem = (props: ContextMenuItemProps) => {
  const menu = useContextMenu();
  const [local, others] = splitProps(props, ["class", "closeOnSelect", "disabled", "onClick"]);
  const onClick: JSX.EventHandler<HTMLDivElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLDivElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented && !local.disabled && local.closeOnSelect !== false) {
      menu.close();
    }
  };

  return (
    <div
      data-disabled={local.disabled ? "" : undefined}
      role="menuitem"
      tabindex={local.disabled ? undefined : -1}
      class={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        local.class,
      )}
      onClick={onClick}
      {...others}
    />
  );
};

const ContextMenuShortcut = (props: ComponentProps<"span">) => {
  const [local, others] = splitProps(props, ["class"]);
  return <span class={cn("ml-auto text-xs tracking-widest opacity-60", local.class)} {...others} />;
};

const ContextMenuSeparator = (props: ComponentProps<"hr">) => {
  const [local, others] = splitProps(props, ["class"]);
  return <hr class={cn("-mx-1 my-1 h-px border-0 bg-muted", local.class)} {...others} />;
};

const ContextMenuSubTrigger = (
  props: ComponentProps<"div"> & { children?: JSX.Element; inset?: boolean },
) => {
  const [local, others] = splitProps(props, ["class", "children", "inset"]);
  return (
    <div
      role="menuitem"
      tabindex={-1}
      class={cn(
        "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        local.inset && "pl-8",
        local.class,
      )}
      {...others}
    >
      {local.children}
      <ChevronRight aria-hidden="true" class="ml-auto size-4" />
    </div>
  );
};

const ContextMenuSubContent = ContextMenuContent;

type ContextMenuCheckboxItemProps = Omit<ComponentProps<"div">, "onChange"> & {
  checked?: boolean;
  closeOnSelect?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
};

const ContextMenuCheckboxItem = (props: ContextMenuCheckboxItemProps) => {
  const [local, others] = splitProps(props, [
    "checked",
    "children",
    "class",
    "closeOnSelect",
    "disabled",
    "onChange",
    "onCheckedChange",
  ]);
  const onClick = () => {
    if (local.disabled) return;
    const checked = !local.checked;
    local.onChange?.(checked);
    local.onCheckedChange?.(checked);
  };

  return (
    <ContextMenuItem
      closeOnSelect={local.closeOnSelect}
      data-checked={local.checked ? "true" : "false"}
      role="menuitemcheckbox"
      aria-checked={local.checked ? "true" : "false"}
      disabled={local.disabled}
      class={cn("pl-8", local.class)}
      onClick={onClick}
      {...others}
    >
      <span class="absolute left-2 flex size-3.5 items-center justify-center">
        <Show when={local.checked}>
          <Check aria-hidden="true" class="size-4" />
        </Show>
      </span>
      {local.children}
    </ContextMenuItem>
  );
};

const ContextMenuGroupLabel = (props: ComponentProps<"span">) => {
  const [local, others] = splitProps(props, ["class"]);
  return <span class={cn("px-2 py-1.5 text-sm font-semibold", local.class)} {...others} />;
};

type ContextMenuRadioItemProps = ComponentProps<"div"> & {
  checked?: boolean;
  disabled?: boolean;
};

const ContextMenuRadioItem = (props: ContextMenuRadioItemProps) => {
  const [local, others] = splitProps(props, ["checked", "children", "class", "disabled"]);

  return (
    <ContextMenuItem
      data-checked={local.checked ? "true" : "false"}
      role="menuitemradio"
      aria-checked={local.checked ? "true" : "false"}
      disabled={local.disabled}
      class={cn("pl-8", local.class)}
      {...others}
    >
      <span class="absolute left-2 flex size-3.5 items-center justify-center">
        <Show when={local.checked}>
          <Circle aria-hidden="true" class="size-2 fill-current" />
        </Show>
      </span>
      {local.children}
    </ContextMenuItem>
  );
};

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuGroupLabel,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
export type {
  ContextMenuCheckboxItemProps,
  ContextMenuContentProps,
  ContextMenuItemProps,
  ContextMenuRootProps,
};
