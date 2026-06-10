import type { ComponentProps, JSX } from "@solidjs/web";
import { createContext, createSignal, useContext } from "solid-js";
import { Circle } from "../icons.index";
import { cn } from "../cn";
import { splitProps } from "../utils/split-props";

type RadioGroupProps = Omit<ComponentProps<"div">, "onChange"> & {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
};

const RadioGroupContext = createContext<{
  disabled?: boolean;
  value: () => string | undefined;
  setValue: (value: string) => void;
}>({
  value: () => undefined,
  setValue: () => {},
});

const RadioGroup = (props: RadioGroupProps) => {
  const [local, others] = splitProps(props, [
    "class",
    "children",
    "value",
    "defaultValue",
    "disabled",
    "onChange",
  ]);
  const [uncontrolledValue, setUncontrolledValue] = createSignal(local.defaultValue);
  const value = () => local.value ?? uncontrolledValue();
  const setValue = (next: string) => {
    if (local.disabled) return;
    if (local.value === undefined) setUncontrolledValue(next);
    local.onChange?.(next);
  };

  return (
    <RadioGroupContext
      value={{
        get disabled() {
          return local.disabled;
        },
        value,
        setValue,
      }}
    >
      <div
        role="radiogroup"
        class={cn("grid gap-2", local.class)}
        data-disabled={local.disabled ? "" : undefined}
        {...others}
      >
        {local.children}
      </div>
    </RadioGroupContext>
  );
};

type RadioGroupItemProps = Omit<ComponentProps<"button">, "value"> & {
  value: string;
};

const RadioGroupItem = (props: RadioGroupItemProps) => {
  const [local, others] = splitProps(props, [
    "class",
    "children",
    "value",
    "disabled",
    "onClick",
    "type",
  ]);
  const context = useContext(RadioGroupContext);
  const checked = () => context.value() === local.value;
  const disabled = () => Boolean(local.disabled || context.disabled);

  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented && !disabled()) context.setValue(local.value);
  };

  return (
    <button
      type={local.type ?? "button"}
      role="radio"
      aria-checked={checked() ? "true" : "false"}
      disabled={disabled()}
      data-checked={checked() ? "" : undefined}
      class={cn(
        "flex cursor-pointer items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      onClick={onClick}
      {...others}
    >
      <span class="flex aspect-square size-4 shrink-0 items-center justify-center rounded-full border border-primary text-primary ring-offset-background focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <span class={cn("hidden", checked() && "block")}>
          <Circle class="size-2.5 fill-current text-current" aria-hidden="true" />
        </span>
      </span>
      {local.children}
    </button>
  );
};

type RadioGroupLabelProps = ComponentProps<"span">;

const RadioGroupItemLabel = (props: RadioGroupLabelProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return <span class={cn("text-sm font-medium leading-none", local.class)} {...others} />;
};

export { RadioGroup, RadioGroupItem, RadioGroupItemLabel };
export type { RadioGroupItemProps, RadioGroupLabelProps, RadioGroupProps };
