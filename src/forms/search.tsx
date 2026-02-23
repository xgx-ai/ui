import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SearchPrimitive from "@kobalte/core/search";
import type { JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "../cn";

/**
 * # Search
 *
 * Search input with autocomplete suggestions.
 *
 * @example
 * ```
 * <Search
 *   options={["Apple", "Banana", "Cherry", "Date"]}
 *   placeholder="Search fruits..."
 *   itemComponent={(props) => (
 *     <SearchItem item={props.item}>
 *       <SearchItemLabel>{props.item.rawValue}</SearchItemLabel>
 *     </SearchItem>
 *   )}
 * >
 *   <SearchControl>
 *     <SearchInput />
 *   </SearchControl>
 *   <SearchContent>
 *     <SearchListbox />
 *   </SearchContent>
 * </Search>
 * ```
 */
const Search = SearchPrimitive.Root;
const SearchItemLabel = SearchPrimitive.ItemLabel;
const SearchDescription = SearchPrimitive.Description;

type SearchItemProps<T extends ValidComponent = "li"> =
  SearchPrimitive.SearchItemProps<T> & {
    // Changed
    class?: string | undefined;
  };

const SearchItem = <T extends ValidComponent = "li">(
  // Renamed
  props: PolymorphicProps<T, SearchItemProps<T>>,
) => {
  const [local, others] = splitProps(props as SearchItemProps, ["class"]);
  return (
    <SearchPrimitive.Item // Changed
      class={cn(
        "relative flex cursor-default select-none items-center justify-between rounded-sm px-2 py-1.5 text-xs outline-hidden data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

type SearchSectionProps<T extends ValidComponent = "li"> =
  SearchPrimitive.SearchSectionProps<T> & { class?: string | undefined }; // Changed

const SearchSection = <T extends ValidComponent = "li">(
  // Renamed
  props: PolymorphicProps<T, SearchSectionProps<T>>,
) => {
  const [local, others] = splitProps(props as SearchSectionProps, ["class"]);
  return (
    <SearchPrimitive.Section // Changed
      class={cn(
        "overflow-hidden p-1 px-2 py-1.5 text-xs font-medium text-muted-foreground ",
        local.class,
      )}
      {...others}
    />
  );
};

// NEW: Search.Indicator
type SearchIndicatorProps<T extends ValidComponent = "div"> =
  SearchPrimitive.SearchIndicatorProps<T> & {
    class?: string | undefined;
    loadingComponent?: JSX.Element; // As per docs
    children?: JSX.Element; // Add children prop for default icon
  };

const SearchIndicator = <T extends ValidComponent = "div">(
  // Renamed
  props: PolymorphicProps<T, SearchIndicatorProps<T>>,
) => {
  // Split out loadingComponent and children
  const [local, others] = splitProps(props as SearchIndicatorProps, [
    "class",
    "loadingComponent",
    "children",
  ]);

  return (
    <SearchPrimitive.Indicator // Changed
      class={cn("flex items-center justify-center", local.class)}
      // Pass loadingComponent prop to the primitive
      loadingComponent={local.loadingComponent}
      {...others}
    >
      {/* Default children (e.g., search icon) are passed here */}
      {local.children}
    </SearchPrimitive.Indicator>
  );
};

// NEW: Search.Icon
type SearchIconProps<T extends ValidComponent = "span"> =
  SearchPrimitive.SearchIconProps<T> & { class?: string | undefined };

const SearchIcon = <T extends ValidComponent = "span">(
  // Renamed
  props: PolymorphicProps<T, SearchIconProps<T>>,
) => {
  const [local, others] = splitProps(props as SearchIconProps, ["class"]);
  return (
    <SearchPrimitive.Icon // Changed
      class={cn("size-4", local.class)}
      {...others}
    />
  );
};

type SearchControlProps<
  _T, // Search doesn't seem to use generics like ComboboxControl for render props in the docs provided
  U extends ValidComponent = "div",
> = SearchPrimitive.SearchControlProps<U> & {
  // Changed primitive type
  class?: string | undefined;
};

const SearchControl = <T, U extends ValidComponent = "div">(
  // Renamed
  props: PolymorphicProps<U, SearchControlProps<T>>,
) => {
  const [local, others] = splitProps(props as SearchControlProps<T>, ["class"]);
  // Removed render props logic specific to Combobox
  return (
    <SearchPrimitive.Control // Changed
      class={cn(
        "flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden",
        local.class,
      )}
      {...others}
    />
  );
};

type SearchInputProps<T extends ValidComponent = "input"> =
  SearchPrimitive.SearchInputProps<T> & { class?: string | undefined }; // Changed

const SearchInput = <T extends ValidComponent = "input">(
  // Renamed
  props: PolymorphicProps<T, SearchInputProps<T>>,
) => {
  const [local, others] = splitProps(props as SearchInputProps, ["class"]);
  return (
    <SearchPrimitive.Input // Changed
      class={cn(
        "w-full px-3 py-2 outline-none bg-transparent text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

// REMOVED ComboboxTrigger as Search uses Control/Input directly

// NEW: Search.Portal
const SearchPortal = SearchPrimitive.Portal;

// NEW: Search.Content
type SearchContentProps<T extends ValidComponent = "div"> =
  SearchPrimitive.SearchContentProps<T> & { class?: string | undefined }; // Changed

const SearchContent = <T extends ValidComponent = "div">(
  // Renamed
  props: PolymorphicProps<
    T,
    SearchContentProps<T> & { children?: JSX.Element }
  >,
) => {
  const [local, others] = splitProps(
    props as SearchContentProps & { children?: JSX.Element },
    ["class", "children"],
  );

  return (
    // Using Portal directly here, as SearchContent doesn't automatically portal
    <SearchPrimitive.Portal>
      <SearchPrimitive.Content // Changed
        style={{
          "max-height": "var(--kb-popper-content-available-height)", // Keep popper styles
        }}
        class={cn(
          "relative z-50 min-w-32 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80", // Base styles from ComboboxContent
          local.class,
        )}
        {...others}
      >
        {/* Search Listbox should be direct child as per anatomy */}
        {local.children}
      </SearchPrimitive.Content>
    </SearchPrimitive.Portal>
  );
};

// NEW: Search.Listbox
type SearchListboxProps<T extends ValidComponent = "ul"> =
  SearchPrimitive.SearchListboxProps<T> & { class?: string | undefined };

const SearchListbox = <T extends ValidComponent = "ul">(
  props: PolymorphicProps<T, SearchListboxProps<T>>,
) => {
  const [local, others] = splitProps(props as SearchListboxProps, ["class"]);
  return (
    <SearchPrimitive.Listbox
      class={cn("m-0 p-1", local.class)} // Styles from Combobox Listbox
      {...others}
    />
  );
};

// NEW: Search.NoResult
type SearchNoResultProps = {
  class?: string | undefined;
  children?: JSX.Element;
};

const SearchNoResult = (props: SearchNoResultProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <SearchPrimitive.NoResult
      class={cn("px-2 py-1.5 text-sm text-muted-foreground", local.class)}
      {...others}
    >
      {local.children}
    </SearchPrimitive.NoResult>
  );
};

export {
  Search,
  SearchContent,
  SearchControl,
  SearchDescription,
  SearchIcon,
  SearchIndicator,
  SearchInput,
  SearchItem,
  SearchItemLabel,
  SearchListbox,
  SearchNoResult,
  SearchPortal,
  SearchSection,
};
