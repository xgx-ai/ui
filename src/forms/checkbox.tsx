import type { ComponentProps, JSX } from "@solidjs/web";
import { createSignal, Show } from "solid-js";
import { Check, Minus } from "../icons.index";
import { cn } from "../cn";
import { splitProps } from "../utils/split-props";

type CheckboxProps = Omit<ComponentProps<"button">, "onChange"> & {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "md" | "lg";
};

const Checkbox = (props: CheckboxProps) => {
  const [local, others] = splitProps(props, [
    "class",
    "checked",
    "defaultChecked",
    "indeterminate",
    "onChange",
    "onCheckedChange",
    "size",
    "disabled",
    "onClick",
    "type",
  ]);
  const [uncontrolledChecked, setUncontrolledChecked] = createSignal(Boolean(local.defaultChecked));
  const checked = () => local.checked ?? uncontrolledChecked();
  const size = () => local.size ?? "md";
  const sizeClasses = () =>
    ({
      sm: "size-3.5",
      md: "size-4",
      lg: "size-5",
    })[size()];

  const setChecked = (value: boolean) => {
    if (local.checked === undefined) setUncontrolledChecked(value);
    local.onChange?.(value);
    local.onCheckedChange?.(value);
  };

  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented && !local.disabled) setChecked(!checked());
  };

  return (
    <button
      type={local.type ?? "button"}
      role="checkbox"
      aria-checked={local.indeterminate ? "mixed" : checked() ? "true" : "false"}
      disabled={local.disabled}
      data-checked={checked() ? "" : undefined}
      data-indeterminate={local.indeterminate ? "" : undefined}
      class={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm border border-input bg-background text-primary-foreground transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:border-primary data-[checked]:bg-primary data-[indeterminate]:border-primary data-[indeterminate]:bg-primary",
        sizeClasses(),
        local.class,
      )}
      onClick={onClick}
      {...others}
    >
      <Show
        when={local.indeterminate}
        fallback={
          <Show when={checked()}>
            <Check class={sizeClasses()} aria-hidden="true" />
          </Show>
        }
      >
        <Minus class={sizeClasses()} aria-hidden="true" />
      </Show>
    </button>
  );
};

export { Checkbox };
export type { CheckboxProps };
