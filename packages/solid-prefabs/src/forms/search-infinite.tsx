import type { JSX } from "@solidjs/web";
import { keepPreviousData, useInfiniteQuery } from "@xgx/solid-query";
import {
  cn,
  ComboboxTrigger,
  Label,
  onSignal,
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
import { type Accessor, createSignal, createUniqueId, onCleanup, Show } from "solid-js";
import { Search as SearchIcon, X } from "@xgx/ui/icons";

export interface SearchInfiniteQueryConfig<T> {
  queryKey: unknown[];
  queryFn: (params: {
    search: string;
    limit: number;
    page: number;
  }) => Promise<{ data: T[]; count: number }>;
  limit?: number;
  enabled?: Accessor<boolean> | boolean;
}

type SearchInfinitePage<T> = { data: T[]; count: number };

type SearchInfiniteProps<T> = {
  queryConfig: SearchInfiniteQueryConfig<T>;
  value: T | undefined;
  optionValue: keyof T;
  optionTextValue: keyof T;
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
  const [isOpen, setIsOpen] = createSignal(false);
  let inputEl: HTMLInputElement | null = null;
  const id = props.id ?? createUniqueId();

  const [searchTerm, setSearchTerm] = createSignal("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = createSignal("");
  const debounceMs = props.debounceMs ?? 300;
  const limit = props.queryConfig.limit ?? 20;

  // Debounce search term
  let debounceTimeout: ReturnType<typeof setTimeout> | undefined;
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    props.onInputChange?.(value);
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    debounceTimeout = setTimeout(() => {
      setDebouncedSearchTerm(value);
    }, debounceMs);
  };

  onCleanup(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
  });

  // Infinite query for data loading
  const infiniteQuery = useInfiniteQuery(() => ({
    queryKey: [...props.queryConfig.queryKey, "search-infinite", debouncedSearchTerm()],

    queryFn: ({ pageParam }: { pageParam: number }) =>
      props.queryConfig.queryFn({
        search: debouncedSearchTerm(),
        limit,
        page: pageParam,
      }),
    initialPageParam: 0,
    placeholderData: keepPreviousData,
    getNextPageParam: (
      lastPage: SearchInfinitePage<T>,
      _allPages: SearchInfinitePage<T>[],
      lastPageParam: number,
    ) => {
      if (!lastPage || !lastPage.data || lastPage.data.length < limit) {
        return undefined;
      }
      return lastPageParam + 1;
    },
    get enabled() {
      const configEnabled =
        typeof props.queryConfig.enabled === "function"
          ? props.queryConfig.enabled()
          : (props.queryConfig.enabled ?? true);
      return configEnabled && isOpen();
    },
  })) as unknown as {
    isSuccess: boolean;
    data?: { pages: SearchInfinitePage<T>[] };
    isLoading: boolean;
    isFetchingNextPage: boolean;
    hasNextPage?: boolean;
    isFetching: boolean;
    fetchNextPage: () => void;
  };

  const options = () => {
    if (!infiniteQuery.isSuccess) {
      return [];
    }

    return infiniteQuery.data?.pages.flatMap((page) => page.data) ?? [];
  };

  // Load more function
  const loadMore = () => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetching) {
      infiniteQuery.fetchNextPage();
    }
  };

  // Intersection observer for infinite scroll
  let loadMoreEl: HTMLDivElement | undefined;
  let io: IntersectionObserver | undefined;

  const setupIntersectionObserver = () => {
    if (!loadMoreEl) return;

    if (io) {
      io.disconnect();
    }

    const scrollContainer = loadMoreEl.closest(
      '[style*="overflow-y-auto"], .overflow-y-auto, .max-h-64',
    ) as HTMLElement;

    io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !infiniteQuery.isFetching && infiniteQuery.hasNextPage) {
          loadMore();
        }
      },
      {
        root: scrollContainer || undefined,
        threshold: 0.1,
        rootMargin: "0px 0px 10px 0px",
      },
    );

    io.observe(loadMoreEl);
  };

  const cleanupIntersectionObserver = () => {
    if (io) {
      io.disconnect();
      io = undefined;
    }
  };

  onCleanup(cleanupIntersectionObserver);

  // Handle open/close
  onSignal(isOpen, (open) => {
    if (open) {
      setSearchTerm("");
      setDebouncedSearchTerm("");
      props.onInputChange?.("");
      if (inputEl) {
        inputEl.value = "";
      }

      // Setup observer after dropdown is mounted
      const checkAndSetup = () => {
        if (loadMoreEl) {
          setupIntersectionObserver();
        } else {
          setTimeout(checkAndSetup, 50);
        }
      };
      setTimeout(checkAndSetup, 50);
    } else {
      cleanupIntersectionObserver();
      setSearchTerm("");
      setDebouncedSearchTerm("");
      props.onInputChange?.("");
      if (inputEl) {
        inputEl.value = "";
      }
    }
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
    }
  };

  return (
    <div
      id={id}
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
          >
            <Show when={infiniteQuery.isLoading}>
              <div class="flex justify-center items-center p-4">
                <div class="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
              </div>
            </Show>
            <Show when={!infiniteQuery.isLoading}>
              <SearchListbox />
              <SearchNoResult>
                <p class="text-xs pb-2">
                  {props.noResultText ||
                    (searchTerm() ? `No results found for "${searchTerm()}"` : "No results found")}
                </p>
              </SearchNoResult>
            </Show>
            <Show when={props.extraButton}>
              <div class="p-2 border-t mt-1">{props.extraButton!(() => setIsOpen(false))}</div>
            </Show>

            {/* Infinite scroll sentinel and loading indicator */}
            <div
              ref={(el) => {
                loadMoreEl = el;
              }}
              class="w-full opacity-0"
            />
            <Show when={Boolean(infiniteQuery.hasNextPage) || infiniteQuery.isFetchingNextPage}>
              <div class="flex items-center justify-center border-t border-border-subtle bg-surface-muted p-2 text-xs text-surface-muted-foreground">
                <Show
                  when={infiniteQuery.isFetchingNextPage}
                  fallback={
                    <div class="w-full text-center py-2">
                      Scroll for more results
                      <div class="text-xs opacity-50 mt-1">({options().length} loaded)</div>
                    </div>
                  }
                >
                  <div class="w-full text-center py-2">
                    Loading more...
                    <div class="mx-auto mt-1 h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                  </div>
                </Show>
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
