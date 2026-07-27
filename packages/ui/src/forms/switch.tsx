/**
 * # Switch
 *
 * Renders a binary on/off control.
 *
 * @example
 * ```tsx
 * <Switch checked={enabled()} onChange={setEnabled}>
 *   <SwitchControl />
 *   <SwitchLabel>Email alerts</SwitchLabel>
 * </Switch>
 * ```
 */
import type { ComponentProps, JSX } from "@solidjs/web";
import { createContext, createSignal, omit, untrack, useContext } from "solid-js";

import { cn } from "../cn";

type SwitchContextValue = {
  checked: () => boolean;
  disabled: () => boolean;
};

const SwitchContext = createContext<SwitchContextValue>();

function useSwitchContextValue() {
  return useContext(SwitchContext);
}

type SwitchProps = Omit<ComponentProps<"label">, "children" | "onChange"> & {
  class?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  name?: string;
  required?: boolean;
  value?: string;
  children?: JSX.Element;
};

export const Switch = (props: SwitchProps) => {
  const local = props;
  const [internalChecked, setInternalChecked] = createSignal(
    untrack(() => local.defaultChecked === true),
  );
  const checked = () => local.checked ?? internalChecked();
  const disabled = () => local.disabled === true;
  const handleInput = (event: InputEvent & { currentTarget: HTMLInputElement }) => {
    const next = event.currentTarget.checked;
    setInternalChecked(next);
    local.onChange?.(next);
  };

  return (
    <SwitchContext value={{ checked, disabled }}>
      <label
        data-checked={checked() ? "" : undefined}
        data-disabled={disabled() ? "" : undefined}
        class={cn(
          "relative inline-flex h-7 items-center gap-2 align-middle text-sm leading-none",
          disabled() ? "cursor-not-allowed opacity-70" : "cursor-pointer",
          local.class,
        )}
      >
        <input
          type="checkbox"
          checked={checked()}
          disabled={disabled()}
          name={local.name}
          required={local.required}
          value={local.value ?? "on"}
          onInput={handleInput}
          class="peer sr-only"
        />
        {local.children}
      </label>
    </SwitchContext>
  );
};

type SwitchControlProps = ComponentProps<"span"> & {
  class?: string;
  children?: JSX.Element;
};

export const SwitchControl = (props: SwitchControlProps) => {
  const context = useSwitchContextValue();
  const local = props;
  const others = omit(props, "class", "children");

  return (
    <span
      data-checked={context?.checked() ? "" : undefined}
      data-disabled={context?.disabled() ? "" : undefined}
      class={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-muted p-0.5 transition-colors data-[checked]:bg-primary data-[disabled]:opacity-50 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </span>
  );
};

type SwitchThumbProps = ComponentProps<"span"> & {
  class?: string;
  children?: JSX.Element;
};

export const SwitchThumb = (props: SwitchThumbProps) => {
  const context = useSwitchContextValue();
  const local = props;
  const others = omit(props, "class", "children");

  return (
    <span
      data-checked={context?.checked() ? "" : undefined}
      class={cn(
        "pointer-events-none block size-5 translate-x-0 rounded-full bg-background shadow-sm ring-0 transition-transform data-[checked]:translate-x-5",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </span>
  );
};

type SwitchLabelProps = ComponentProps<"span"> & {
  class?: string;
  children?: JSX.Element;
};

export const SwitchLabel = (props: SwitchLabelProps) => {
  const context = useSwitchContextValue();
  const local = props;
  const others = omit(props, "class", "children");

  return (
    <span
      data-disabled={context?.disabled() ? "" : undefined}
      class={cn(
        "inline-flex items-center text-sm font-medium leading-none data-[disabled]:cursor-not-allowed",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </span>
  );
};

export const SwitchHiddenInput = (props: ComponentProps<"input">) => (
  <input type="checkbox" class="sr-only" {...props} />
);

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
  const local = props;
  const rest = omit(props, "class", "onChange", "label");

  return (
    <Switch
      class={local.class}
      onChange={(checked: boolean) => local.onChange?.(checked)}
      {...rest}
    >
      <SwitchControl>
        <SwitchThumb />
      </SwitchControl>
      {local.label && <SwitchLabel>{local.label}</SwitchLabel>}
    </Switch>
  );
};
