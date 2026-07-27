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
  contentRef: () => HTMLElement | undefined;
  gutter: () => number;
  open: () => boolean;
  placement: () => Placement;
  setOpen: (open: boolean) => void;
  setContentRef: (element: HTMLElement) => void;
  setTriggerRef: (element: HTMLElement) => void;
  triggerRef: () => HTMLElement | undefined;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue>();

function useDropdownMenu() {
  const context = useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenu parts must be used inside DropdownMenu.");
  return context;
}

const DropdownMenu = (props: DropdownMenuProps) => {
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
  );
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(
    untrack(() => local.defaultOpen ?? false),
  );
  const [triggerRef, setTriggerRef] = createSignal<HTMLElement>();
  const [contentRef, setContentRef] = createSignal<HTMLElement>();
  const isOpen = () => local.open ?? uncontrolledOpen();
  const setOpen = (open: boolean) => {
    if (local.open === undefined) setUncontrolledOpen(open);
    local.onOpenChange?.(open);
  };
  const placement = () => local.placement || local.positioning?.placement || "bottom";
  const gutter = () => local.gutter ?? 4;
  let rootRef!: HTMLDivElement;

  createEffect(isOpen, (open) => {
    if (!open) return;

    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!containsNode(rootRef, target) && !containsNode(contentRef(), target)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  });

  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    if (target.closest("[data-xgx-dropdown-trigger]")) {
      setOpen(!isOpen());
      return;
    }

    const checkbox = target.closest<HTMLElement>("[data-xgx-dropdown-checkbox]");
    if (checkbox) return;

    const item = target.closest<HTMLElement>("[data-xgx-dropdown-item]");
    if (item && item.dataset.closeOnSelect !== "false") setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
      triggerRef()?.focus();
    }
  };

  return (
    <DropdownMenuContext
      value={{
        contentRef,
        gutter,
        open: isOpen,
        placement,
        setOpen,
        setContentRef,
        setTriggerRef,
        triggerRef,
      }}
    >
      <PopperRoot
        anchorRef={() => triggerRef() ?? rootRef}
        contentRef={contentRef}
        gutter={gutter()}
        open={isOpen}
        placement={placement()}
      >
        <div
          ref={rootRef}
          class={cn("relative inline-block", local.class)}
          data-xgx-dropdown-open={isOpen() ? "true" : "false"}
          data-xgx-dropdown-placement={placement()}
          onClick={onClick}
          onKeyDown={onKeyDown}
          {...rest}
        >
          {local.children}
        </div>
      </PopperRoot>
    </DropdownMenuContext>
  );
};

type DropdownMenuTriggerOwnProps = {
  children?: JSX.Element;
  class?: string | undefined;
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
  const rest = omit(props, "as", "class", "onKeyDown", "ref", "type");
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
      type={local.type ?? "button"}
      aria-expanded={menu.open() ? "true" : "false"}
      data-expanded={menu.open() ? "" : undefined}
      ref={(element: HTMLElement) => {
        menu.setTriggerRef(element);
        assignRef(local.ref, element);
      }}
      class={local.class}
      onKeyDown={onKeyDown}
      {...rest}
    />
  );
};

const DropdownMenuPortal = (props: { children?: JSX.Element }) => (
  <PortalMount>{props.children}</PortalMount>
);
const DropdownMenuSub = (props: ComponentProps<"div">) => <div {...props} />;
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
    menuKeyboard(event);
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
  const local = props;
  const rest = omit(props, "class", "closeOnSelect", "disabled", "value");

  return (
    <div
      data-close-on-select={local.closeOnSelect === false ? "false" : "true"}
      data-disabled={local.disabled ? "" : undefined}
      data-value={local.value}
      data-xgx-dropdown-item
      role="menuitem"
      tabindex={local.disabled ? undefined : -1}
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
  const local = props;
  const rest = omit(
    props,
    "checked",
    "children",
    "class",
    "closeOnSelect",
    "disabled",
    "onChange",
    "onCheckedChange",
    "value",
  );

  const onClick = () => {
    if (local.disabled) return;
    const checked = !local.checked;
    local.onCheckedChange?.(checked);
    local.onChange?.(checked);
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
  const local = props;
  const rest = omit(props, "checked", "children", "class", "disabled", "value");

  return (
    <div
      data-checked={local.checked ? "true" : "false"}
      data-disabled={local.disabled ? "" : undefined}
      data-value={local.value}
      data-xgx-dropdown-item
      role="menuitemradio"
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

const DropdownMenuSubTrigger = (props: ComponentProps<"div"> & { children?: JSX.Element }) => {
  const local = props;
  const rest = omit(props, "class", "children");
  return (
    <div
      data-xgx-dropdown-item
      role="menuitem"
      tabindex={-1}
      class={cn(
        "flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-hidden hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
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
