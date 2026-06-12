/**
 * # Autocomplete
 *
 * Combines a text field with suggestions for fast selection.
 *
 * @example
 * ```tsx
 * <Autocomplete options={["Design", "Engineering"]} placeholder="Team" />
 * ```
 */
import type { ComponentProps } from "@solidjs/web";
import { cn } from "../cn";
import { splitProps } from "../utils/split-props";
import {
  Search as Autocomplete,
  SearchContent,
  SearchControl,
  SearchInput,
  SearchItem,
  SearchItemLabel as AutocompleteItemLabel,
  SearchListbox,
  SearchNoResult,
  type SearchItemProps,
} from "./search";

const AutocompleteControl = <_T,>(props: ComponentProps<"div">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <SearchControl
      class={cn("flex h-9 items-center rounded-md border px-3", local.class)}
      {...others}
    />
  );
};

const AutocompleteInput = (props: ComponentProps<"input">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <SearchInput
      class={cn(
        "flex size-full rounded-md bg-transparent text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

const AutocompleteContent = (props: ComponentProps<"div">) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <SearchContent
      class={cn(
        "relative z-50 max-h-[min(var(--xgx-popper-available-height,24rem),24rem)] min-w-32 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </SearchContent>
  );
};

const AutocompleteListbox = (props: ComponentProps<"ul">) => {
  const [local, others] = splitProps(props, ["class"]);
  return <SearchListbox class={cn("m-0 p-1", local.class)} {...others} />;
};

type AutocompleteItemProps = SearchItemProps;

const AutocompleteItem = (props: AutocompleteItemProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <SearchItem
      class={cn(
        "relative flex cursor-default select-none items-center justify-between rounded-sm px-2 py-1.5 text-xs outline-hidden data-[disabled]:pointer-events-none hover:bg-accent hover:text-accent-foreground data-[disabled]:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

const AutocompleteNoResult = SearchNoResult;

export {
  Autocomplete,
  AutocompleteContent,
  AutocompleteControl,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteItemLabel,
  AutocompleteListbox,
  AutocompleteNoResult,
};
export type { AutocompleteItemProps };
