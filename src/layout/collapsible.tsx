import type { ComponentProps, JSX } from "@solidjs/web";
import { createContext, createSignal, Show, useContext } from "solid-js";
import { splitProps } from "../utils/split-props";

type CollapsibleProps = Omit<ComponentProps<"div">, "onChange"> & {
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  onChange?: (open: boolean) => void;
};

const CollapsibleContext = createContext<{
  open: () => boolean;
  toggle: () => void;
  disabled?: boolean;
}>({
  open: () => false,
  toggle: () => {},
});

const Collapsible = (props: CollapsibleProps) => {
  const [local, others] = splitProps(props, [
    "children",
    "open",
    "defaultOpen",
    "disabled",
    "onOpenChange",
    "onChange",
  ]);
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(Boolean(local.defaultOpen));
  const open = () => local.open ?? uncontrolledOpen();
  const setOpen = (next: boolean) => {
    if (local.open === undefined) setUncontrolledOpen(next);
    local.onOpenChange?.(next);
    local.onChange?.(next);
  };
  const toggle = () => {
    if (!local.disabled) setOpen(!open());
  };

  return (
    <CollapsibleContext
      value={{
        open,
        toggle,
        get disabled() {
          return local.disabled;
        },
      }}
    >
      <div data-expanded={open() ? "" : undefined} {...others}>
        {local.children}
      </div>
    </CollapsibleContext>
  );
};

type CollapsibleTriggerProps = ComponentProps<"button"> & {
  children?: JSX.Element;
};

const CollapsibleTrigger = (props: CollapsibleTriggerProps) => {
  const context = useContext(CollapsibleContext);
  const [local, others] = splitProps(props, ["children", "disabled", "onClick", "type"]);
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) context.toggle();
  };

  return (
    <button
      type={local.type ?? "button"}
      aria-expanded={context.open() ? "true" : "false"}
      disabled={local.disabled || context.disabled}
      onClick={onClick}
      {...others}
    >
      {local.children}
    </button>
  );
};

type CollapsibleContentProps = ComponentProps<"div"> & {
  children?: JSX.Element;
};

const CollapsibleContent = (props: CollapsibleContentProps) => {
  const context = useContext(CollapsibleContext);
  const [local, others] = splitProps(props, ["children"]);

  return (
    <Show when={context.open()}>
      <div data-expanded="" {...others}>
        {local.children}
      </div>
    </Show>
  );
};

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
export type { CollapsibleContentProps, CollapsibleProps, CollapsibleTriggerProps };
