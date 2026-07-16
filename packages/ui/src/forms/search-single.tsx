import type { JSX } from "@solidjs/web";
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  isPending,
  latest,
  Show,
  Loading as Suspense,
} from "solid-js";
import { cn } from "../cn";
import { Skeleton } from "../feedback/skeleton";
import { X } from "../icons.index";
import { ComboboxTrigger } from "./combobox";
import { Label } from "./label";
import {
  Search,
  SearchContent,
  SearchControl,
  SearchInput,
  SearchItem,
  SearchItemLabel,
  SearchListbox,
  SearchNoResult,
  SearchSection,
} from "./search";

type SearchProps<T> = {
  options: T[];
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
  debounceOptionsMillisecond?: number;
  isLoading?: boolean;
  noResultText?: string;
  clearable?: boolean;
  dataInteractive?: string;
  id?: string;
  query?: string;
  enableInfiniteScroll?: boolean;
  onLoadMore?: (searchQuery: string, offset: number) => Promise<{ data: T[]; hasMore: boolean }>;
  infiniteScrollLimit?: number;
};

type InfiniteSearchState<T> = {
  data: T[];
  hasMore: boolean;
  offset: number;
  query: string;
};

function getDisplayValue<T>(item: T | undefined, optionTextValue: keyof T): string {
  if (optionTextValue && item) {
    return item[optionTextValue] as string;
  }
  return "";
}

export default function SearchSingle<T>(props: SearchProps<T>) {
  const [isOpen, setIsOpen] = createSignal(false);
  let inputEl: HTMLInputElement | null = null;
  const generatedId = createUniqueId();
  const id = () => props.id ?? generatedId;

  const [searchQuery, setSearchQuery] = createSignal("");
  const [infiniteOffset, setInfiniteOffset] = createSignal(0);
  let loadMoreEl: HTMLDivElement | undefined;

  const emptyInfiniteState = (query = searchQuery()): InfiniteSearchState<T> => ({
    data: [],
    hasMore: false,
    offset: 0,
    query,
  });

  const infiniteState = createMemo<InfiniteSearchState<T>>((previous) => {
    const query = searchQuery();
    const offset = infiniteOffset();
    const loadMore = props.onLoadMore;

    if (!props.enableInfiniteScroll || !isOpen() || !loadMore) {
      return emptyInfiniteState(query);
    }

    if (offset > 0 && previous?.query === query && !previous.hasMore) {
      return previous;
    }

    return loadMore(query, offset)
      .then((result) => {
        const previousData = offset > 0 && previous?.query === query ? previous.data : [];
        const data = offset > 0 ? [...previousData, ...result.data] : result.data;

        return {
          data,
          hasMore: result.hasMore,
          offset: data.length,
          query,
        };
      })
      .catch((error) => {
        console.error("Failed to load more data:", error);
        return previous?.query === query
          ? { ...previous, hasMore: false }
          : emptyInfiniteState(query);
      });
  });

  const currentInfiniteState = () => latest(() => infiniteState());
  const infiniteLoading = createMemo(() => isPending(() => infiniteState()));

  const filteredOptions = () => {
    if (props.enableInfiniteScroll) {
      return currentInfiniteState().data;
    }

    const query = searchQuery().toLowerCase().trim();
    if (!query) return props.options;

    return props.options.filter((option) => {
      const displayValue = getDisplayValue(option, props.optionTextValue).toLowerCase();
      return displayValue.includes(query);
    });
  };

  // Function to find matching option based on input value
  const findMatchingOption = (inputValue: string): T | null => {
    if (!inputValue.trim()) return null;

    // First try exact match
    const exactMatch = props.options.find((option) => {
      const displayValue = getDisplayValue(option, props.optionTextValue);
      return displayValue.toLowerCase() === inputValue.toLowerCase();
    });

    if (exactMatch) return exactMatch;

    // Then try partial match (starts with)
    const partialMatch = props.options.find((option) => {
      const displayValue = getDisplayValue(option, props.optionTextValue);
      return displayValue.toLowerCase().startsWith(inputValue.toLowerCase());
    });

    return partialMatch || null;
  };

  // Handle Enter key press and change events
  const handleInputCommit = (inputValue: string) => {
    const matchingOption = findMatchingOption(inputValue);
    if (matchingOption) {
      props.onChange?.(matchingOption);
    }
  };

  const resetInfiniteSearch = () => {
    setSearchQuery("");
    setInfiniteOffset(0);
  };

  const requestNextPage = () => {
    if (!props.enableInfiniteScroll || !props.onLoadMore || infiniteLoading()) return;
    const state = currentInfiniteState();
    if (!state.hasMore) return;
    setInfiniteOffset(state.data.length);
  };

  let io: IntersectionObserver | undefined;
  let scrollContainer: HTMLElement | null = null;

  const setupIntersectionObserver = () => {
    if (!loadMoreEl) {
      return;
    }

    if (io) {
      io.disconnect();
    }

    scrollContainer = loadMoreEl.closest(
      '[style*="overflow-y-auto"], .overflow-y-auto',
    ) as HTMLElement;

    io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          requestNextPage();
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

  createEffect(
    () => ({
      enableInfiniteScroll: Boolean(props.enableInfiniteScroll),
      onInputChange: props.onInputChange,
      open: isOpen(),
    }),
    (state) => {
      if (inputEl) {
        inputEl.value = "";
      }
      resetInfiniteSearch();
      state.onInputChange?.("");

      if (!state.open || !state.enableInfiniteScroll) {
        cleanupIntersectionObserver();
        return;
      }

      let setupTimeout: ReturnType<typeof setTimeout> | undefined;
      const checkAndSetup = () => {
        if (loadMoreEl) {
          setupIntersectionObserver();
          return;
        }
        setupTimeout = setTimeout(checkAndSetup, 50);
      };
      setupTimeout = setTimeout(checkAndSetup, 50);

      return () => {
        if (setupTimeout !== undefined) clearTimeout(setupTimeout);
        cleanupIntersectionObserver();
      };
    },
  );

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    if (props.enableInfiniteScroll) {
      setInfiniteOffset(0);
    }
    props.onInputChange?.(query);
  };

  createEffect(
    () => {
      const optionTextValue = props.optionTextValue;
      return {
        id: id(),
        serialisedOptions: JSON.stringify(
          props.options.map((option) => getDisplayValue(option, optionTextValue)),
        ),
      };
    },
    (state) => {
      const element = document.getElementById(state.id);
      if (element) {
        element.setAttribute("data-options", state.serialisedOptions);
      }
    },
  );

  return (
    <div
      id={id()}
      class="grid w-full items-center gap-1.5"
      data-required={props.required}
      data-label={props.label}
    >
      <Label required={props.required}>{props.label}</Label>
      <Suspense fallback={<Skeleton height={36} radius={4} />}>
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
            options={filteredOptions()}
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
            debounceOptionsMillisecond={props.debounceOptionsMillisecond}
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
                  <span class="mr-2 text-xs">
                    {getDisplayValue(props.value, props.optionTextValue)}
                  </span>
                </Show>

                <input
                  type="text"
                  name="searchValue"
                  required={props.required}
                  value={props.value ? getDisplayValue(props.value, props.optionTextValue) : ""}
                  class="sr-only" // or your own .visually-hidden util
                />

                <Show when={props.value && !props.readOnly && props.clearable !== false}>
                  <button
                    type="button"
                    class="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-hover hover:text-hover-foreground"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      props.onChange?.(null);
                      resetInfiniteSearch();
                      if (inputEl) {
                        inputEl.value = "";
                        props.onInputChange?.("");
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
              <SearchListbox />
              <SearchNoResult>
                <p class="text-xs pb-2">
                  {props.noResultText || props.query
                    ? "No results found for " + props.query
                    : "No results found"}
                </p>
              </SearchNoResult>
              <Show when={props.extraButton}>
                <div class="p-2 border-t mt-1">{props.extraButton!(() => setIsOpen(false))}</div>
              </Show>
              <Show when={props.enableInfiniteScroll}>
                <div
                  ref={(el) => {
                    loadMoreEl = el;
                  }}
                  class="h-4 w-full opacity-0"
                  style="min-height: 1px;"
                />
                <div class="flex items-center justify-center border-t border-border-subtle bg-surface-muted p-2 text-xs text-surface-muted-foreground">
                  <Show
                    when={infiniteLoading()}
                    fallback={
                      <Show when={currentInfiniteState().hasMore}>
                        <div class="w-full text-center py-2">
                          Scroll for more results
                          <div class="text-xs opacity-50 mt-1">
                            ({currentInfiniteState().data.length} loaded)
                          </div>
                        </div>
                      </Show>
                    }
                  >
                    <div class="w-full text-center py-2">
                      Loading more...
                      <div class="mx-auto mt-1 h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground"></div>
                    </div>
                  </Show>
                </div>
              </Show>
            </SearchContent>
          </Search>
        )}
      </Suspense>
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
