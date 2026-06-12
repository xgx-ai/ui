/**
 * # ToggleGroup
 *
 * Groups toggle buttons for single or multiple selection.
 *
 * @example
 * ```tsx
 * <ToggleGroup value={view()} onChange={setView}>
 *   <ToggleGroupItem value="list">List</ToggleGroupItem>
 * </ToggleGroup>
 * ```
 */
import type { JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import type { VariantProps } from "class-variance-authority";
import { createContext, createSignal, useContext } from "solid-js";
import { cn } from "../cn";
import type { PolymorphicProps } from "../utils/polymorphic";
import { splitProps } from "../utils/split-props";
import { toggleVariants } from "./toggle";

type ToggleValue = string | string[] | undefined;

const ToggleGroupContext = createContext<{
  size?: VariantProps<typeof toggleVariants>["size"];
  variant?: VariantProps<typeof toggleVariants>["variant"];
  disabled?: boolean;
  isPressed: (value: string) => boolean;
  toggle: (value: string) => void;
}>({
  size: "default",
  variant: "default",
  isPressed: () => false,
  toggle: () => {},
});

type ToggleGroupOwnProps = VariantProps<typeof toggleVariants> & {
  class?: string | undefined;
  children?: JSX.Element;
  value?: ToggleValue;
  defaultValue?: ToggleValue;
  multiple?: boolean;
  disabled?: boolean;
  onChange?: (value: any) => void;
};

type ToggleGroupProps<T extends ValidComponent = "div"> = PolymorphicProps<T, ToggleGroupOwnProps>;

const ToggleGroup = <T extends ValidComponent = "div">(props: ToggleGroupProps<T>) => {
  const [local, others] = splitProps(props as ToggleGroupProps, [
    "as",
    "class",
    "children",
    "size",
    "variant",
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
  const setSelected = (next: ToggleValue) => {
    if (local.value === undefined) setUncontrolledValue(next);
    local.onChange?.(next);
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
      class={cn("flex items-center justify-center gap-1", local.class)}
      data-disabled={local.disabled ? "" : undefined}
      {...others}
    >
      <ToggleGroupContext
        value={{
          get size() {
            return local.size;
          },
          get variant() {
            return local.variant;
          },
          get disabled() {
            return local.disabled;
          },
          isPressed,
          toggle,
        }}
      >
        {local.children}
      </ToggleGroupContext>
    </Dynamic>
  );
};

type ToggleGroupItemOwnProps = VariantProps<typeof toggleVariants> & {
  class?: string | undefined;
  value: string;
  disabled?: boolean;
};

type ToggleGroupItemProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  ToggleGroupItemOwnProps
>;

const ToggleGroupItem = <T extends ValidComponent = "button">(props: ToggleGroupItemProps<T>) => {
  const [local, others] = splitProps(props as ToggleGroupItemProps, [
    "as",
    "class",
    "size",
    "variant",
    "value",
    "disabled",
    "onClick",
    "type",
  ]);
  const context = useContext(ToggleGroupContext);
  const pressed = () => context.isPressed(local.value);
  const disabled = () => Boolean(local.disabled || context.disabled);
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented && !disabled()) context.toggle(local.value);
  };

  return (
    <Dynamic
      component={local.as ?? "button"}
      type={local.as ? local.type : (local.type ?? "button")}
      aria-pressed={pressed() ? "true" : "false"}
      data-pressed={pressed() ? "" : undefined}
      disabled={disabled()}
      class={cn(
        toggleVariants({
          size: local.size ?? context.size,
          variant: local.variant ?? context.variant,
        }),
        "cursor-pointer transition-colors duration-200",
        local.class,
      )}
      onClick={onClick}
      {...others}
    />
  );
};

export { ToggleGroup, ToggleGroupItem };
export type { ToggleGroupItemProps, ToggleGroupProps };
