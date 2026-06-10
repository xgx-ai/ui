import type { ComponentProps, JSX } from "@solidjs/web";
import { createContext, createEffect, createSignal, Show, useContext } from "solid-js";
import { Check, ChevronRight, Circle } from "../icons.index";
import { cn } from "../cn";
import { splitProps } from "../utils/split-props";
import { PortalMount } from "../overlays/portal";
import { createMenuKeyboard, focusFirstMenuItem } from "./menu-behavior";

type Menubar = {
  close: () => void;
  contentRef: () => HTMLElement | undefined;
  open: () => boolean;
  setContentRef: (element: HTMLElement) => void;
  setOpen: (open: boolean) => void;
  setTriggerRef: (element: HTMLElement) => void;
  triggerRef: () => HTMLElement | undefined;
};

const MenubarMenuContext = createContext<Menubar>();

function useMenubarMenu() {
  const context = useContext(MenubarMenuContext);
  if (!context) throw new Error("Menubar menu parts must be used inside MenubarMenu.");
  return context;
}

type MenubarRootProps = ComponentProps<"div">;

const Menubar = (props: MenubarRootProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      role="menubar"
      class={cn(
        "flex h-10 items-center space-x-1 rounded-md border bg-background p-1",
        local.class,
      )}
      {...others}
    />
  );
};

type MenubarMenuProps = ComponentProps<"div"> & {
  children?: JSX.Element;
  gutter?: number;
};

const MenubarMenu = (props: MenubarMenuProps) => {
  let root: HTMLDivElement | undefined;
  const [local, others] = splitProps(props, ["children", "class"]);
  const [open, setOpen] = createSignal(false);
  const [contentRef, setContentRef] = createSignal<HTMLElement>();
  const [triggerRef, setTriggerRef] = createSignal<HTMLElement>();

  createEffect(open, (isOpen) => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (root && !root.contains(target) && !contentRef()?.contains(target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef()?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  return (
    <MenubarMenuContext
      value={{
        close: () => setOpen(false),
        contentRef,
        open,
        setContentRef,
        setOpen,
        setTriggerRef,
        triggerRef,
      }}
    >
      <div
        ref={(element) => {
          root = element;
        }}
        class={cn("relative", local.class)}
        {...others}
      >
        {local.children}
      </div>
    </MenubarMenuContext>
  );
};

type MenubarTriggerProps = ComponentProps<"button">;

const MenubarTrigger = (props: MenubarTriggerProps) => {
  const menu = useMenubarMenu();
  const [local, others] = splitProps(props, ["class", "onClick", "onKeyDown", "ref", "type"]);
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) menu.setOpen(!menu.open());
  };
  const onKeyDown: JSX.EventHandler<HTMLButtonElement, KeyboardEvent> = (event) => {
    const handler = local.onKeyDown as
      | JSX.EventHandler<HTMLButtonElement, KeyboardEvent>
      | undefined;
    handler?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      menu.setOpen(true);
      requestAnimationFrame(() => focusFirstMenuItem(menu.contentRef()));
    }
  };

  return (
    <button
      type={local.type ?? "button"}
      aria-expanded={menu.open() ? "true" : "false"}
      data-expanded={menu.open() ? "" : undefined}
      class={cn(
        "flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm font-medium outline-hidden focus:bg-accent focus:text-accent-foreground data-[expanded]:bg-accent data-[expanded]:text-accent-foreground",
        local.class,
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
      ref={(element) => {
        menu.setTriggerRef(element);
        const ref = local.ref;
        if (typeof ref === "function") ref(element);
      }}
      {...others}
    />
  );
};

const MenubarPortal = (props: { children?: JSX.Element }) => (
  <PortalMount>{props.children}</PortalMount>
);
const MenubarGroup = (props: ComponentProps<"div">) => <div role="group" {...props} />;
const MenubarSub = (props: ComponentProps<"div">) => <div {...props} />;
const MenubarRadioGroup = (props: ComponentProps<"div">) => <div role="group" {...props} />;

type MenubarContentProps = ComponentProps<"div">;

const MenubarContent = (props: MenubarContentProps) => {
  const menu = useMenubarMenu();
  const [local, others] = splitProps(props, ["class", "onKeyDown", "ref"]);
  const menuKeyboard = createMenuKeyboard({
    close: menu.close,
    root: menu.contentRef,
    trigger: menu.triggerRef,
  });
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
          "absolute left-0 top-full z-50 mt-1 min-w-48 overflow-hidden rounded-md border border-border-subtle bg-popover p-1 text-popover-foreground shadow-elevation-medium",
          local.class,
        )}
        onKeyDown={onKeyDown}
        {...others}
      />
    </Show>
  );
};

const MenubarSubContent = MenubarContent;

type MenubarItemProps = ComponentProps<"div"> & {
  closeOnSelect?: boolean;
  disabled?: boolean;
  inset?: boolean;
};

const MenubarItem = (props: MenubarItemProps) => {
  const menu = useMenubarMenu();
  const [local, others] = splitProps(props, [
    "class",
    "closeOnSelect",
    "disabled",
    "inset",
    "onClick",
  ]);
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
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        local.inset && "pl-8",
        local.class,
      )}
      onClick={onClick}
      {...others}
    />
  );
};

const MenubarSubTrigger = (
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

type MenubarCheckboxItemProps = Omit<ComponentProps<"div">, "onChange"> & {
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
};

const MenubarCheckboxItem = (props: MenubarCheckboxItemProps) => {
  const [local, others] = splitProps(props, [
    "checked",
    "children",
    "class",
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
    <MenubarItem
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
    </MenubarItem>
  );
};

type MenubarRadioItemProps = ComponentProps<"div"> & {
  checked?: boolean;
  disabled?: boolean;
};

const MenubarRadioItem = (props: MenubarRadioItemProps) => {
  const [local, others] = splitProps(props, ["checked", "children", "class", "disabled"]);
  return (
    <MenubarItem
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
    </MenubarItem>
  );
};

const MenubarItemLabel = (props: ComponentProps<"div"> & { inset?: boolean }) => {
  const [local, others] = splitProps(props, ["class", "inset"]);
  return (
    <div
      class={cn("px-2 py-1.5 text-sm font-semibold", local.inset && "pl-8", local.class)}
      {...others}
    />
  );
};

const MenubarGroupLabel = (props: ComponentProps<"span"> & { inset?: boolean }) => {
  const [local, others] = splitProps(props, ["class", "inset"]);
  return (
    <span
      class={cn("px-2 py-1.5 text-sm font-semibold", local.inset && "pl-8", local.class)}
      {...others}
    />
  );
};

const MenubarSeparator = (props: ComponentProps<"hr">) => {
  const [local, others] = splitProps(props, ["class"]);
  return <hr class={cn("-mx-1 my-1 h-px border-0 bg-muted", local.class)} {...others} />;
};

const MenubarShortcut = (props: ComponentProps<"span">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      class={cn("ml-auto text-xs tracking-widest text-muted-foreground", local.class)}
      {...others}
    />
  );
};

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarGroupLabel,
  MenubarItem,
  MenubarItemLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
export type {
  MenubarCheckboxItemProps,
  MenubarContentProps,
  MenubarItemProps,
  MenubarMenuProps,
  MenubarRootProps,
  MenubarTriggerProps,
};
