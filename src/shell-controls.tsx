import type { JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { ParentProps } from "solid-js";
import { createContext, createSignal, Show, useContext } from "solid-js";
import { cn } from "./cn.ts";
import type { PolymorphicProps } from "./utils/polymorphic";
import { splitProps } from "./utils/split-props";

const iconButtonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:block [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        ghost:
          "bg-transparent text-control-muted-foreground hover:bg-control-hover hover:text-control-hover-foreground data-[pressed]:bg-control-active data-[pressed]:text-control-active-foreground data-[pressed]:hover:bg-control-active data-[pressed]:hover:text-control-active-foreground",
        surface:
          "border border-control-border bg-control-muted text-control-muted-foreground hover:bg-control-hover hover:text-control-hover-foreground data-[pressed]:bg-control-active data-[pressed]:text-control-active-foreground data-[pressed]:hover:bg-control-active data-[pressed]:hover:text-control-active-foreground",
        solid:
          "bg-control text-control-foreground hover:bg-control-hover hover:text-control-hover-foreground data-[pressed]:bg-control-active data-[pressed]:text-control-active-foreground data-[pressed]:hover:bg-control-active data-[pressed]:hover:text-control-active-foreground",
        danger:
          "bg-transparent text-danger hover:bg-danger hover:text-danger-foreground data-[pressed]:bg-danger data-[pressed]:text-danger-foreground data-[pressed]:hover:bg-danger data-[pressed]:hover:text-danger-foreground",
      },
      size: {
        xs: "size-7 text-xs [&_svg]:size-3.5",
        sm: "size-8 text-xs [&_svg]:size-4",
        md: "size-9 text-sm [&_svg]:size-4",
        lg: "size-10 text-sm [&_svg]:size-5",
      },
      shape: {
        rounded: "rounded-lg",
        circle: "rounded-full",
        square: "rounded-md",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "sm",
      shape: "rounded",
    },
  },
);

type IconButtonOwnProps = VariantProps<typeof iconButtonVariants> & {
  class?: string | undefined;
  children?: JSX.Element;
  loading?: boolean;
  pressed?: boolean;
  disabled?: boolean;
};

type IconButtonProps<T extends ValidComponent = "button"> = PolymorphicProps<T, IconButtonOwnProps>;

const IconButton = <T extends ValidComponent = "button">(props: IconButtonProps<T>) => {
  const [local, others] = splitProps(props as IconButtonProps, [
    "as",
    "variant",
    "size",
    "shape",
    "class",
    "children",
    "disabled",
    "loading",
    "pressed",
    "type",
  ]);
  const disabled = () => Boolean(local.disabled || local.loading);

  return (
    <Dynamic
      component={local.as ?? "button"}
      type={local.as ? local.type : (local.type ?? "button")}
      class={cn(
        iconButtonVariants({
          variant: local.variant,
          size: local.size,
          shape: local.shape,
        }),
        local.class,
      )}
      disabled={disabled()}
      data-disabled={disabled() ? "" : undefined}
      aria-disabled={disabled() ? "true" : undefined}
      aria-pressed={local.pressed === undefined ? undefined : local.pressed ? "true" : "false"}
      data-pressed={local.pressed ? "" : undefined}
      data-loading={local.loading ? "" : undefined}
      {...others}
    >
      <Show when={local.loading} fallback={local.children}>
        <span
          aria-hidden="true"
          class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      </Show>
    </Dynamic>
  );
};

type ToolbarSurfaceProps = ParentProps<
  JSX.HTMLAttributes<HTMLDivElement> & {
    class?: string | undefined;
  }
>;

const ToolbarSurface = (props: ToolbarSurfaceProps): JSX.Element => {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn(
        "inline-flex items-center gap-1 rounded-full border border-control-border bg-control px-1.5 py-1 text-control-foreground shadow-sm",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
};

type ToolbarIconButtonProps<T extends ValidComponent = "button"> = Omit<
  IconButtonProps<T>,
  "shape"
> & {
  shape?: never;
};

const ToolbarIconButton = <T extends ValidComponent = "button">(
  props: ToolbarIconButtonProps<T>,
) => {
  const [local, others] = splitProps(props as ToolbarIconButtonProps, ["variant", "size"]);

  return (
    <IconButton
      {...others}
      variant={local.variant ?? "ghost"}
      size={local.size ?? "sm"}
      shape="circle"
    />
  );
};

const toolbarToggleItemVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-full font-medium text-control-muted-foreground ring-offset-background transition-colors hover:bg-control-hover hover:text-control-hover-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-control-active data-[pressed]:text-control-active-foreground data-[pressed]:hover:bg-control-active data-[pressed]:hover:text-control-active-foreground [&_svg]:block [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      size: {
        sm: "xgx-control-text-sm h-7 px-2 has-[svg]:size-7 has-[svg]:px-0 [&_svg]:size-3.5",
        md: "xgx-control-text-sm h-8 px-2.5 has-[svg]:size-8 has-[svg]:px-0 [&_svg]:size-4",
        lg: "xgx-control-text-md h-9 px-3 has-[svg]:size-9 has-[svg]:px-0 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

type ToggleValue = string | string[] | undefined;

const ToolbarToggleGroupContext = createContext<{
  size?: VariantProps<typeof toolbarToggleItemVariants>["size"];
  disabled?: boolean;
  isPressed: (value: string) => boolean;
  toggle: (value: string) => void;
}>({
  size: "md",
  isPressed: () => false,
  toggle: () => {},
});

type ToolbarToggleGroupProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  VariantProps<typeof toolbarToggleItemVariants> & {
    class?: string | undefined;
    children?: JSX.Element;
    value?: ToggleValue;
    defaultValue?: ToggleValue;
    multiple?: boolean;
    disabled?: boolean;
    onChange?: (value: any) => void;
  }
>;

const ToolbarToggleGroup = <T extends ValidComponent = "div">(
  props: ToolbarToggleGroupProps<T>,
) => {
  const [local, others] = splitProps(props as ToolbarToggleGroupProps, [
    "as",
    "class",
    "children",
    "size",
    "value",
    "defaultValue",
    "multiple",
    "disabled",
    "onChange",
  ]);
  const [uncontrolledValue, setUncontrolledValue] = createSignal<ToggleValue>(local.defaultValue);
  const selected = () => local.value ?? uncontrolledValue();
  const isPressed = (value: string) => {
    const current = selected();
    return Array.isArray(current) ? current.includes(value) : current === value;
  };
  const setSelected = (value: ToggleValue) => {
    if (local.value === undefined) setUncontrolledValue(value);
    local.onChange?.(value);
  };
  const toggle = (value: string) => {
    if (local.disabled) return;
    if (local.multiple) {
      const current = selected();
      const next = new Set(Array.isArray(current) ? current : []);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      setSelected([...next]);
      return;
    }
    setSelected(value);
  };

  return (
    <Dynamic
      component={local.as ?? "div"}
      role="group"
      class={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-control-border bg-control p-1 text-control-foreground shadow-sm",
        local.class,
      )}
      data-disabled={local.disabled ? "" : undefined}
      {...others}
    >
      <ToolbarToggleGroupContext
        value={{
          get size() {
            return local.size;
          },
          get disabled() {
            return local.disabled;
          },
          isPressed,
          toggle,
        }}
      >
        {local.children}
      </ToolbarToggleGroupContext>
    </Dynamic>
  );
};

type ToolbarToggleItemProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  VariantProps<typeof toolbarToggleItemVariants> & {
    class?: string | undefined;
    children?: JSX.Element;
    value: string;
    disabled?: boolean;
  }
>;

const ToolbarToggleItem = <T extends ValidComponent = "button">(
  props: ToolbarToggleItemProps<T>,
) => {
  const [local, others] = splitProps(props as ToolbarToggleItemProps, [
    "as",
    "class",
    "size",
    "value",
    "disabled",
    "onClick",
    "type",
  ]);
  const context = useContext(ToolbarToggleGroupContext);
  const disabled = () => Boolean(local.disabled || context.disabled);
  const pressed = () => context.isPressed(local.value);

  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) context.toggle(local.value);
  };

  return (
    <Dynamic
      component={local.as ?? "button"}
      type={local.as ? local.type : (local.type ?? "button")}
      role="button"
      class={cn(
        toolbarToggleItemVariants({
          size: local.size ?? context.size,
        }),
        local.class,
      )}
      disabled={disabled()}
      data-pressed={pressed() ? "" : undefined}
      aria-pressed={pressed() ? "true" : "false"}
      data-disabled={disabled() ? "" : undefined}
      onClick={onClick}
      {...others}
    />
  );
};

export {
  IconButton,
  iconButtonVariants,
  ToolbarIconButton,
  ToolbarSurface,
  ToolbarToggleGroup,
  ToolbarToggleItem,
};
export type {
  IconButtonProps,
  ToolbarIconButtonProps,
  ToolbarSurfaceProps,
  ToolbarToggleGroupProps,
  ToolbarToggleItemProps,
};
