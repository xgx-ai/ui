/**
 * # Combobox
 *
 * Renders a trigger and listbox pattern for searchable choices.
 *
 * @example
 * ```tsx
 * <ComboboxTrigger aria-label="Open options" />
 * ```
 */
import type { ComponentProps, JSX } from "@solidjs/web";
import { omit, Show } from "solid-js";
import { cn } from "../cn";
import { Check, ChevronsUpDown } from "../icons.index";
import {
  Search as Combobox,
  SearchItemLabel as ComboboxItemLabel,
  SearchSection as ComboboxSection,
  SearchContent,
  SearchControl,
  SearchInput,
  SearchItem,
  type SearchItemProps,
  SearchListbox,
  useSearchContext,
  useSearchItemContext,
} from "./search";

const ComboboxHiddenSelect = (props: ComponentProps<"select">) => (
  <select hidden aria-hidden="true" tabindex={-1} {...props} />
);

type ComboboxItemProps = SearchItemProps;

const ComboboxItem = (props: ComboboxItemProps) => <SearchItem {...props} />;

type ComboboxItemIndicatorProps = ComponentProps<"span"> & {
  children?: JSX.Element;
};

const ComboboxItemIndicator = (props: ComboboxItemIndicatorProps) => {
  const item = useSearchItemContext();
  const context = useSearchContext();
  const local = props;
  const others = omit(props, "children");
  return (
    <Show when={item && context.isSelected(item)}>
      <span {...others}>{local.children ?? <Check aria-hidden="true" class="size-4" />}</span>
    </Show>
  );
};

const ComboboxControl = <_T,>(props: ComponentProps<"div">) => {
  const local = props;
  const others = omit(props, "class");
  return (
    <SearchControl
      class={cn("flex h-10 items-center rounded-md border px-3", local.class)}
      {...others}
    />
  );
};

const ComboboxInput = (props: ComponentProps<"input">) => {
  const local = props;
  const others = omit(props, "class");
  return (
    <SearchInput
      class={cn(
        "flex size-full rounded-md bg-transparent py-3 text-xs outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

const ComboboxTrigger = (props: ComponentProps<"button">) => {
  const context = useSearchContext();
  const local = props;
  const others = omit(props, "class", "children", "onClick", "type");
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) context.setOpen(!context.open());
  };
  return (
    <button
      type={local.type ?? "button"}
      class={cn("size-4 opacity-50", local.class)}
      onClick={onClick}
      {...others}
    >
      {local.children ?? <ChevronsUpDown aria-hidden="true" class="size-4" />}
    </button>
  );
};

const ComboboxContent = (props: ComponentProps<"div">) => {
  const local = props;
  const others = omit(props, "children", "class");
  return (
    <SearchContent
      class={cn(
        "max-h-[min(var(--xgx-popper-available-height,24rem),24rem)] min-w-32 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md",
        local.class,
      )}
      {...others}
    >
      <SearchListbox />
      {local.children}
    </SearchContent>
  );
};

export type { ComboboxItemProps };
export {
  Combobox,
  ComboboxContent,
  ComboboxControl,
  ComboboxHiddenSelect,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxItemLabel,
  ComboboxSection,
  ComboboxTrigger,
};
