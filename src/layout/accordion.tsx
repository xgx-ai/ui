import type { ComponentProps, JSX } from "@solidjs/web";
import { createContext, createSignal, Show, useContext } from "solid-js";
import { ChevronDown } from "../icons.index";
import { cn } from "../cn";
import { splitProps } from "../utils/split-props";

type AccordionValue = string | string[] | undefined;

type AccordionProps = Omit<ComponentProps<"div">, "onChange"> & {
  value?: AccordionValue;
  defaultValue?: AccordionValue;
  multiple?: boolean;
  collapsible?: boolean;
  onChange?: (value: any) => void;
};

const AccordionContext = createContext<{
  isExpanded: (value: string) => boolean;
  toggle: (value: string) => void;
}>({
  isExpanded: () => false,
  toggle: () => {},
});

const AccordionItemContext = createContext<{ value: string }>({ value: "" });

const Accordion = (props: AccordionProps) => {
  const [local, others] = splitProps(props, [
    "class",
    "children",
    "value",
    "defaultValue",
    "multiple",
    "collapsible",
    "onChange",
  ]);
  const [uncontrolledValue, setUncontrolledValue] = createSignal<AccordionValue>(
    local.defaultValue,
  );
  const selected = () => local.value ?? uncontrolledValue();
  const isExpanded = (value: string) => {
    const current = selected();
    return Array.isArray(current) ? current.includes(value) : current === value;
  };
  const setSelected = (next: AccordionValue) => {
    if (local.value === undefined) setUncontrolledValue(next);
    local.onChange?.(next);
  };
  const toggle = (value: string) => {
    if (local.multiple) {
      const current = selected();
      const next = new Set(Array.isArray(current) ? current : []);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      setSelected([...next]);
      return;
    }
    setSelected(isExpanded(value) && local.collapsible ? undefined : value);
  };

  return (
    <AccordionContext value={{ isExpanded, toggle }}>
      <div class={local.class} {...others}>
        {local.children}
      </div>
    </AccordionContext>
  );
};

type AccordionItemProps = ComponentProps<"div"> & {
  value: string;
};

const AccordionItem = (props: AccordionItemProps) => {
  const [local, others] = splitProps(props, ["class", "children", "value"]);
  return (
    <AccordionItemContext
      value={{
        get value() {
          return local.value;
        },
      }}
    >
      <div class={cn("border-b", local.class)} {...others}>
        {local.children}
      </div>
    </AccordionItemContext>
  );
};

type AccordionTriggerProps = ComponentProps<"button"> & {
  children?: JSX.Element;
};

const AccordionTrigger = (props: AccordionTriggerProps) => {
  const accordion = useContext(AccordionContext);
  const item = useContext(AccordionItemContext);
  const [local, others] = splitProps(props, ["class", "children", "disabled", "onClick", "type"]);
  const expanded = () => accordion.isExpanded(item.value);
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented && !local.disabled) accordion.toggle(item.value);
  };

  return (
    <div class="flex">
      <button
        type={local.type ?? "button"}
        aria-expanded={expanded() ? "true" : "false"}
        data-expanded={expanded() ? "" : undefined}
        disabled={local.disabled}
        class={cn(
          "flex flex-1 cursor-pointer items-center justify-between py-4 font-medium transition-all hover:underline [&[data-expanded]>svg]:rotate-180",
          local.class,
        )}
        onClick={onClick}
        {...others}
      >
        {local.children}
        <ChevronDown aria-hidden="true" class="size-4 shrink-0 transition-transform duration-200" />
      </button>
    </div>
  );
};

type AccordionContentProps = ComponentProps<"div"> & {
  children?: JSX.Element;
};

const AccordionContent = (props: AccordionContentProps) => {
  const accordion = useContext(AccordionContext);
  const item = useContext(AccordionItemContext);
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <Show when={accordion.isExpanded(item.value)}>
      <div
        data-expanded=""
        class={cn("overflow-hidden text-sm transition-all", local.class)}
        {...others}
      >
        <div class="pb-4 pt-0">{local.children}</div>
      </div>
    </Show>
  );
};

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
export type { AccordionContentProps, AccordionItemProps, AccordionProps, AccordionTriggerProps };
