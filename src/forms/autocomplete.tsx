import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SearchPrimitive from "@kobalte/core/search";
import type { JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "../cn";

/**
 * # Autocomplete
 *
 * Text-input-style search with async autocomplete suggestions.
 * Wraps Kobalte's Search primitive (with built-in debounce)
 * but styled like a standard text field rather than a search pill.
 *
 * @example
 * ```
 * <Autocomplete
 *   options={contacts()}
 *   optionValue={(c) => c.id}
 *   optionTextValue={(c) => c.name}
 *   optionLabel={(c) => c.name}
 *   onInputChange={setSearch}
 *   debounceOptionsMillisecond={300}
 *   placeholder="Search contacts..."
 *   itemComponent={(props) => (
 *     <AutocompleteItem item={props.item}>
 *       <AutocompleteItemLabel>{props.item.rawValue.name}</AutocompleteItemLabel>
 *     </AutocompleteItem>
 *   )}
 * >
 *   <AutocompleteControl>
 *     <AutocompleteInput />
 *   </AutocompleteControl>
 *   <AutocompleteContent>
 *     <AutocompleteListbox />
 *     <AutocompleteNoResult />
 *   </AutocompleteContent>
 * </Autocomplete>
 * ```
 */
const Autocomplete = SearchPrimitive.Root;
const AutocompleteItemLabel = SearchPrimitive.ItemLabel;

type AutocompleteControlProps<
  _T,
  U extends ValidComponent = "div",
> = SearchPrimitive.SearchControlProps<U> & {
  class?: string | undefined;
};

const AutocompleteControl = <T, U extends ValidComponent = "div">(
  props: PolymorphicProps<U, AutocompleteControlProps<T>>,
) => {
  const [local, others] = splitProps(props as AutocompleteControlProps<T>, [
    "class",
  ]);
  return (
    <SearchPrimitive.Control
      class={cn("flex h-9 items-center rounded-md border px-3", local.class)}
      {...others}
    />
  );
};

type AutocompleteInputProps<T extends ValidComponent = "input"> =
  SearchPrimitive.SearchInputProps<T> & { class?: string | undefined };

const AutocompleteInput = <T extends ValidComponent = "input">(
  props: PolymorphicProps<T, AutocompleteInputProps<T>>,
) => {
  const [local, others] = splitProps(props as AutocompleteInputProps, [
    "class",
  ]);
  return (
    <SearchPrimitive.Input
      class={cn(
        "flex size-full rounded-md bg-transparent text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

type AutocompleteContentProps<T extends ValidComponent = "div"> =
  SearchPrimitive.SearchContentProps<T> & { class?: string | undefined };

const AutocompleteContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<
    T,
    AutocompleteContentProps<T> & { children?: JSX.Element }
  >,
) => {
  const [local, others] = splitProps(
    props as AutocompleteContentProps & { children?: JSX.Element },
    ["class", "children"],
  );
  return (
    <SearchPrimitive.Portal>
      <SearchPrimitive.Content
        style={{
          "max-height": "var(--kb-popper-content-available-height)",
        }}
        class={cn(
          "relative z-50 min-w-32 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80",
          local.class,
        )}
        {...others}
      >
        {local.children}
      </SearchPrimitive.Content>
    </SearchPrimitive.Portal>
  );
};

type AutocompleteListboxProps<T extends ValidComponent = "ul"> =
  SearchPrimitive.SearchListboxProps<T> & { class?: string | undefined };

const AutocompleteListbox = <T extends ValidComponent = "ul">(
  props: PolymorphicProps<T, AutocompleteListboxProps<T>>,
) => {
  const [local, others] = splitProps(props as AutocompleteListboxProps, [
    "class",
  ]);
  return (
    <SearchPrimitive.Listbox class={cn("m-0 p-1", local.class)} {...others} />
  );
};

type AutocompleteItemProps<T extends ValidComponent = "li"> =
  SearchPrimitive.SearchItemProps<T> & {
    class?: string | undefined;
  };

const AutocompleteItem = <T extends ValidComponent = "li">(
  props: PolymorphicProps<T, AutocompleteItemProps<T>>,
) => {
  const [local, others] = splitProps(props as AutocompleteItemProps, ["class"]);
  return (
    <SearchPrimitive.Item
      class={cn(
        "relative flex cursor-default select-none items-center justify-between rounded-sm px-2 py-1.5 text-xs outline-hidden data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

type AutocompleteNoResultProps = {
  class?: string | undefined;
  children?: JSX.Element;
};

const AutocompleteNoResult = (props: AutocompleteNoResultProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <SearchPrimitive.NoResult
      class={cn("px-2 py-1.5 text-sm text-muted-foreground", local.class)}
      {...others}
    />
  );
};

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
