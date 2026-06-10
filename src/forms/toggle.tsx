import type { JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { createSignal } from "solid-js";
import { cn } from "../cn";
import type { PolymorphicProps } from "../utils/polymorphic";
import { splitProps } from "../utils/split-props";

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium text-control-muted-foreground ring-offset-background transition-colors hover:bg-control-hover hover:text-control-hover-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-control-active data-[pressed]:text-control-active-foreground data-[pressed]:hover:bg-control-active data-[pressed]:hover:text-control-active-foreground",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-control-border bg-control-muted shadow-xs",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-8 px-2",
        lg: "h-10 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ToggleOwnProps = VariantProps<typeof toggleVariants> & {
  class?: string | undefined;
  pressed?: boolean;
  defaultPressed?: boolean;
  disabled?: boolean;
  onChange?: (pressed: boolean) => void;
  onPressedChange?: (pressed: boolean) => void;
};

type ToggleProps<T extends ValidComponent = "button"> = PolymorphicProps<T, ToggleOwnProps>;

const Toggle = <T extends ValidComponent = "button">(props: ToggleProps<T>) => {
  const [local, others] = splitProps(props as ToggleProps, [
    "as",
    "class",
    "variant",
    "size",
    "pressed",
    "defaultPressed",
    "disabled",
    "onChange",
    "onPressedChange",
    "onClick",
    "type",
  ]);
  const [uncontrolledPressed, setUncontrolledPressed] = createSignal(Boolean(local.defaultPressed));
  const pressed = () => local.pressed ?? uncontrolledPressed();
  const setPressed = (next: boolean) => {
    if (local.pressed === undefined) setUncontrolledPressed(next);
    local.onChange?.(next);
    local.onPressedChange?.(next);
  };
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented && !local.disabled) setPressed(!pressed());
  };

  return (
    <Dynamic
      component={local.as ?? "button"}
      type={local.as ? local.type : (local.type ?? "button")}
      aria-pressed={pressed() ? "true" : "false"}
      data-pressed={pressed() ? "" : undefined}
      disabled={local.disabled}
      class={cn(toggleVariants({ variant: local.variant, size: local.size }), local.class)}
      onClick={onClick}
      {...others}
    />
  );
};

export { Toggle, toggleVariants };
export type { ToggleProps };
