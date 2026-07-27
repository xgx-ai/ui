/**
 * # Select
 *
 * Builds a select control from the native Search parts.
 *
 * @example
 * ```tsx
 * <Select options={queues} optionValue="value" optionTextValue="label">
 *   <SelectTrigger>
 *     <SelectValue />
 *   </SelectTrigger>
 *   <SelectContent />
 * </Select>
 * ```
 */
import type { ComponentProps, JSX } from "@solidjs/web";
import { omit, Show } from "solid-js";
import { cn } from "../cn";
import { Check, ChevronsUpDown } from "../icons.index";
import { assignRef } from "../overlays/floating";
import {
  SearchContent,
  SearchItem,
  SearchItemLabel,
  type SearchItemProps,
  SearchListbox,
  Search as Select,
  useSearchContext,
  useSearchItemContext,
} from "./search";

const SelectHiddenSelect = (props: ComponentProps<"select">) => (
  <select hidden aria-hidden="true" tabindex={-1} {...props} />
);

type SelectValueState<T = unknown> = {
  clear: () => void;
  remove: (item: T) => void;
  selectedOption: () => T | undefined;
  selectedOptions: () => T[];
};

type SelectValueProps<T = unknown> = Omit<ComponentProps<"span">, "children"> & {
  children?: (state: SelectValueState<T>) => JSX.Element;
};

const SelectValue = <T,>(props: SelectValueProps<T>) => {
  const context = useSearchContext();
  const local = props;
  const others = omit(props, "children");
  const selectedOption = () => context.selectedOption() as T | undefined;
  const selectedOptions = () => {
    const selected = context.selectedOption();
    return Array.isArray(selected) ? (selected as T[]) : selected ? [selected as T] : [];
  };
  const state: SelectValueState<T> = {
    clear: context.clear,
    remove: (item: T) => context.remove(item),
    selectedOption,
    selectedOptions,
  };
  return (
    <span {...others}>
      {typeof local.children === "function"
        ? local.children(state)
        : selectedOption()?.toString?.()}
    </span>
  );
};

type SelectTriggerProps = ComponentProps<"button"> & {
  children?: JSX.Element;
};

const SelectTrigger = (props: SelectTriggerProps) => {
  const context = useSearchContext();
  const local = props;
  const others = omit(props, "class", "children", "onClick", "onKeyDown", "ref", "type");
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented && !context.disabled()) {
      context.setOpen(!context.open());
    }
  };
  const onKeyDown: JSX.EventHandler<HTMLButtonElement, KeyboardEvent> = (event) => {
    const handler = local.onKeyDown as
      | JSX.EventHandler<HTMLButtonElement, KeyboardEvent>
      | undefined;
    handler?.(event);
    context.onSearchKeyDown(event);
  };
  return (
    <button
      type={local.type ?? "button"}
      aria-activedescendant={context.highlightedOptionId()}
      aria-controls={context.listboxId}
      aria-expanded={context.open() ? "true" : "false"}
      aria-haspopup="listbox"
      disabled={context.disabled()}
      class={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      ref={(element) => {
        context.setAnchorRef(element);
        assignRef(local.ref, element);
      }}
      onClick={onClick}
      onKeyDown={onKeyDown}
      {...others}
    >
      {local.children}
      <ChevronsUpDown aria-hidden="true" class="size-4 opacity-50" />
    </button>
  );
};

const SelectContent = (props: ComponentProps<"div">) => {
  const local = props;
  const others = omit(props, "children", "class");
  return (
    <SearchContent
      class={cn(
        "relative z-50 max-h-[min(var(--xgx-popper-available-height,24rem),24rem)] min-w-32 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md",
        local.class,
      )}
      {...others}
    >
      <SearchListbox class="m-0 p-1" />
      {local.children}
    </SearchContent>
  );
};

type SelectItemProps = SearchItemProps & {
  children?: JSX.Element;
};

const SelectItem = (props: SelectItemProps) => {
  const local = props;
  const others = omit(props, "class", "children", "item");
  const item = () => local.item;
  return (
    <SearchItem
      item={item()}
      class={cn(
        "relative mt-0 flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-xs outline-hidden focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        local.class,
      )}
      {...others}
    >
      <SelectItemIndicator />
      <SearchItemLabel>{local.children}</SearchItemLabel>
    </SearchItem>
  );
};

const SelectItemIndicator = () => {
  const context = useSearchContext();
  const item = useSearchItemContext();
  return (
    <span class="absolute right-2 flex size-3.5 items-center justify-center">
      <Show when={item && context.isSelected(item)}>
        <Check aria-hidden="true" class="size-4" />
      </Show>
    </span>
  );
};

export type { SelectItemProps, SelectTriggerProps, SelectValueProps, SelectValueState };
export { Select, SelectContent, SelectHiddenSelect, SelectItem, SelectTrigger, SelectValue };
