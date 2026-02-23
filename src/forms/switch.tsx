import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SwitchPrimitive from "@kobalte/core/switch";
import type { JSX, ParentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../cn";

type SwitchProps<T extends ValidComponent = "div"> =
  SwitchPrimitive.SwitchRootProps<T> & {
    class?: string;
    checked?: boolean;
    defaultChecked?: boolean;
    disabled?: boolean;
    onChange?: (checked: boolean) => void;
    name?: string;
    required?: boolean;
    value?: string;
  };

export const Switch = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SwitchProps<T>>,
) => {
  const [local, rest] = splitProps(props as SwitchProps, ["class", "children"]);

  return (
    <SwitchPrimitive.Root
      class={cn("flex items-center gap-2 relative", local.class)}
      {...rest}
    >
      <SwitchPrimitive.Input />
      {local.children as JSX.Element}
    </SwitchPrimitive.Root>
  );
};

type SwitchControlProps = ParentProps<{ class?: string }>;
export const SwitchControl = (props: SwitchControlProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <SwitchPrimitive.Control
      class={cn(
        "duration-300 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-muted transition-colors ui-disabled:cursor-not-allowed ui-checked:bg-primary ui-disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </SwitchPrimitive.Control>
  );
};

type SwitchThumbProps = ParentProps<{ class?: string }>;
export const SwitchThumb = (props: SwitchThumbProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <SwitchPrimitive.Thumb
      class={cn(
        "pointer-events-none block size-5 translate-x-0 rounded-full bg-background shadow-lg ring-0 transition-transform data-[checked]:translate-x-5 duration-300",
        local.class,
      )}
      {...others}
    />
  );
};

type SwitchLabelProps = ParentProps<{ class?: string }>;
/**
 * # Switch
 *
 * A toggle switch for boolean values.
 *
 * @example
 * ```
 * <div class="space-y-4">
 *   <Switch>
 *     <SwitchControl>
 *       <SwitchThumb />
 *     </SwitchControl>
 *     <SwitchLabel>Default switch</SwitchLabel>
 *   </Switch>
 *   <Switch defaultChecked>
 *     <SwitchControl>
 *       <SwitchThumb />
 *     </SwitchControl>
 *     <SwitchLabel>Checked by default</SwitchLabel>
 *   </Switch>
 *   <Switch disabled>
 *     <SwitchControl>
 *       <SwitchThumb />
 *     </SwitchControl>
 *     <SwitchLabel>Disabled</SwitchLabel>
 *   </Switch>
 * </div>
 * ```
 */
export const SwitchLabel = (props: SwitchLabelProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <SwitchPrimitive.Label
      class={cn(
        "text-xs font-medium leading-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </SwitchPrimitive.Label>
  );
};

export const SwitchHiddenInput = SwitchPrimitive.Input;

/** Preset switch with control and thumb included */
type SwitchPresetProps = {
  class?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  name?: string;
  required?: boolean;
  value?: string;
  label?: string;
};

export const SwitchPreset = (props: SwitchPresetProps) => {
  const [local, rest] = splitProps(props, ["class", "onChange", "label"]);

  return (
    <Switch
      class={local.class}
      onChange={(checked) => local.onChange?.(checked)}
      {...rest}
    >
      <SwitchControl>
        <SwitchThumb />
      </SwitchControl>
      {local.label && <SwitchLabel>{local.label}</SwitchLabel>}
    </Switch>
  );
};
