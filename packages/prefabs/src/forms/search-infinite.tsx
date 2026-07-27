import type { JSX } from "@solidjs/web";
import { createIntersectionLoader } from "@xgx/query";
import {
  ComboboxTrigger,
  cn,
  Label,
  Search,
  SearchContent,
  SearchControl,
  SearchIndicator,
  SearchInput,
  SearchItem,
  SearchItemLabel,
  SearchListbox,
  SearchNoResult,
  SearchSection,
  Spinner,
} from "@xgx/ui";
import { Search as SearchIcon, X } from "@xgx/ui/icons";
import { type Accessor, createMemo, createSignal, createUniqueId, Show } from "solid-js";
import { createSearchInfinite, type SearchInfiniteQueryConfig } from "./use-search-infinite.ts";

export type { SearchInfinitePage, SearchInfiniteQueryConfig } from "./use-search-infinite.ts";

type SearchInfiniteQueryConfigInput<T> =
  | SearchInfiniteQueryConfig<T>
  | Accessor<SearchInfiniteQueryConfig<T>>;

type SearchInfiniteProps<T> = {
  queryConfig: SearchInfiniteQueryConfigInput<T>;
  value: T | undefined;
  optionValue: keyof T;
  optionTextValue: keyof T;
  /** Hides matching fetched options from the listbox, e.g. already-selected rows. */
  filterOption?: (item: T) => boolean;
  placeholder?: string;
  onChange?: (value: T | null) => void;
  onInputChange?: (value: string) => void;
  required?: boolean;
  label?: string;
  error?: string;
  class?: string;
  readOnly?: boolean;
  extraButton?: (close?: () => void) => JSX.Element;
  debounceMs?: number;
  noResultText?: string;
  clearable?: boolean;
  dataInteractive?: string;
  id?: string;
};

function getDisplayValue<T>(item: T | undefined, optionTextValue: keyof T): string {
  if (optionTextValue && item) {
    return item[optionTextValue] as string;
  }
  return "";
}

export default function SearchInfinite<T>(props: SearchInfiniteProps<T>) {
  const [isOpen, setIsOpenSignal] = createSignal(false);
  let inputEl: HTMLInputElement | null = null;
  const fallbackId = createUniqueId();

  const queryConfig = () =>
    typeof props.queryConfig === "function" ? props.queryConfig() : props.queryConfig;

  const search = createSearchInfinite<T>({
    queryConfig,
    active: isOpen,
    debounceMs: () => props.debounceMs,
  });

  const clearSearchInput = () => {
    search.clearSearch();
    props.onInputChange?.("");
    if (inputEl) {
      inputEl.value = "";
    }
  };

  const setIsOpen = (open: boolean) => {
    setIsOpenSignal(open);
    if (!open) clearSearchInput();
  };

  const handleSearchChange = (value: string) => {
    search.setSearch(value);
    props.onInputChange?.(value);
  };

  const options = createMemo(() => {
    const filter = props.filterOption;
    return filter ? search.options().filter(filter) : search.options();
  });

  const [contentEl, setContentEl] = createSignal<HTMLElement | null>(null);
  const sentinel = createIntersectionLoader({
    canLoad: () => search.hasMore() && !search.isLoading() && !search.isFetchingMore(),
    enabled: isOpen,
    load: search.loadMore,
    root: contentEl,
    rootMargin: "0px 0px 48px 0px",
  });

  // Function to find matching option based on input value
  const findMatchingOption = (inputValue: string): T | null => {
    if (!inputValue.trim()) return null;

    const exactMatch = options().find((option) => {
      const displayValue = getDisplayValue(option, props.optionTextValue);
      return displayValue.toLowerCase() === inputValue.toLowerCase();
    });

    if (exactMatch) return exactMatch;

    const partialMatch = options().find((option) => {
      const displayValue = getDisplayValue(option, props.optionTextValue);
      return displayValue.toLowerCase().startsWith(inputValue.toLowerCase());
    });

    return partialMatch || null;
  };

  const handleInputCommit = (inputValue: string) => {
    const matchingOption = findMatchingOption(inputValue);
    if (matchingOption) {
      props.onChange?.(matchingOption);
      setIsOpen(false);
    }
  };

  return (
    <div
      id={props.id ?? fallbackId}
      class="grid w-full items-center gap-1.5"
      data-required={props.required}
      data-label={props.label}
    >
      <Label required={props.required}>{props.label}</Label>
      {props.readOnly ? (
        <div
          class={cn(
            "flex h-9 rounded-md border border-input bg-muted px-3 py-2 text-xs text-muted-foreground",
            props.class,
          )}
        >
          {getDisplayValue(props.value, props.optionTextValue)}
        </div>
      ) : (
        <Search<T>
          triggerMode="focus"
          multiple={false}
          open={isOpen()}
          onOpenChange={setIsOpen}
          options={options()}
          defaultFilter={() => true}
          optionValue={props.optionValue}
          optionTextValue={props.optionTextValue}
          value={props.value}
          placeholder={props.placeholder}
          optionLabel={props.optionTextValue}
          onChange={(e) => {
            if (e) {
              props.onChange?.(e);
              setIsOpen(false);
            }
          }}
          onInputChange={handleSearchChange}
          class="w-full"
          itemComponent={(p: any) => {
            return (
              <SearchItem item={p.item}>
                <SearchItemLabel>
                  {p.item.rawValue[props.optionTextValue] as string}
                </SearchItemLabel>
              </SearchItem>
            );
          }}
          sectionComponent={(p: any) => (
            <SearchSection>{p.section.rawValue[props.optionTextValue]}</SearchSection>
          )}
        >
          <SearchControl
            class={cn(
              props.class,
              "relative flex items-center h-9",
              props.readOnly && "opacity-50 pointer-events-none",
            )}
          >
            <SearchIndicator class="pl-2" loadingComponent={<Spinner class="size-3.5" />}>
              <SearchIcon class="size-3.5 text-muted-foreground" />
            </SearchIndicator>
            <div class={cn("flex flex-row items-center px-3 w-full")}>
              <Show
                when={props.value && props.clearable !== false}
                fallback={
                  <>
                    <SearchInput
                      class="flex-1 h-full outline-none bg-transparent py-2 text-xs px-0"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const inputValue = (e.target as HTMLInputElement).value;
                          handleInputCommit(inputValue);
                        }
                      }}
                      ref={(el) => (inputEl = el)}
                    />
                    <ComboboxTrigger class="absolute right-2 top-1/2 -translate-y-1/2" />
                  </>
                }
              >
                {/* When value is selected: show clickable value when closed, SearchInput when open */}
                <Show
                  when={!isOpen()}
                  fallback={
                    <SearchInput
                      class="flex-1 h-full outline-none bg-transparent py-2 text-xs px-0"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const inputValue = (e.target as HTMLInputElement).value;
                          handleInputCommit(inputValue);
                        }
                      }}
                      ref={(el) => (inputEl = el)}
                    />
                  }
                >
                  <span class="flex-1 text-xs cursor-pointer py-2" onClick={() => setIsOpen(true)}>
                    {getDisplayValue(props.value, props.optionTextValue)}
                  </span>
                </Show>
              </Show>
              <input
                type="text"
                name="searchValue"
                required={props.required}
                value={props.value ? getDisplayValue(props.value, props.optionTextValue) : ""}
                class="sr-only"
              />
              <Show when={props.value && !props.readOnly && props.clearable !== false}>
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-hover hover:text-hover-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    props.onChange?.(null);
                    if (inputEl) {
                      inputEl.value = "";
                    }
                  }}
                >
                  <X class="size-3.5" />
                </button>
              </Show>
            </div>
          </SearchControl>

          <SearchContent
            onCloseAutoFocus={(e) => e.preventDefault()}
            class="max-h-64 overflow-y-auto"
            style="scroll-behavior: smooth; position: relative;"
            ref={setContentEl}
          >
            <Show when={search.isLoading() && options().length === 0}>
              <div class="flex justify-center items-center p-4">
                <Spinner class="size-4" />
              </div>
            </Show>
            <Show when={!search.isLoading() || options().length > 0}>
              <SearchListbox />
              <SearchNoResult>
                <p class="text-xs pb-2">
                  {props.noResultText ||
                    (search.searchTerm()
                      ? `No results found for "${search.searchTerm()}"`
                      : "No results found")}
                </p>
              </SearchNoResult>
            </Show>
            {/* Infinite scroll sentinel */}
            <div ref={sentinel.ref} class="w-full opacity-0" />
            <Show when={search.isFetchingMore()}>
              <div class="flex items-center justify-center border-t border-border-subtle bg-surface-muted p-2 text-xs text-surface-muted-foreground">
                <div class="flex w-full items-center justify-center gap-2 py-2">
                  Loading more...
                  <Spinner class="size-4" />
                </div>
              </div>
            </Show>
            <Show when={props.extraButton}>
              <div class="sticky bottom-0 z-10 mt-1 border-t bg-popover p-2">
                {props.extraButton!(() => setIsOpen(false))}
              </div>
            </Show>
          </SearchContent>
        </Search>
      )}
      <div
        class={cn(
          "transition-all opacity-0 h-0 duration-300 ease-in-out text-xs text-error",
          props.error && "opacity-100 h-4 ",
        )}
      >
        {props.error}
      </div>
    </div>
  );
}
