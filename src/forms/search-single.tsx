import { cn } from "../cn";
import { ComboboxTrigger } from "./combobox";
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
import { Skeleton } from "../feedback/skeleton";
import {
  createSignal,
  createUniqueId,
  type JSXElement,
  Show,
  Suspense,
} from "solid-js";

import { onSignal } from "../utils/on-signal";
import { Label } from "./label";

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
  extraButton?: (close?: () => void) => JSXElement;
  debounceOptionsMillisecond?: number;
  isLoading?: boolean;
  noResultText?: string;
  clearable?: boolean;
  dataInteractive?: string;
  id?: string;
  query?: string;
  enableInfiniteScroll?: boolean;
  onLoadMore?: (
    searchQuery: string,
    offset: number,
  ) => Promise<{ data: T[]; hasMore: boolean }>;
  infiniteScrollLimit?: number;
};

function getDisplayValue<T>(
  item: T | undefined,
  optionTextValue: keyof T,
): string {
  if (optionTextValue && item) {
    return item[optionTextValue] as string;
  }
  return "";
}

export default function SearchSingle<T>(props: SearchProps<T>) {
  const [isOpen, setIsOpen] = createSignal(false);
  let inputEl: HTMLInputElement | null = null;
  const id = props.id ?? createUniqueId();

  const [infiniteData, setInfiniteData] = createSignal<T[]>([]);
  const [infiniteLoading, setInfiniteLoading] = createSignal(false);
  const [infiniteEnd, setInfiniteEnd] = createSignal(false);
  const [currentSearchQuery, setCurrentSearchQuery] = createSignal("");
  const [searchQuery, setSearchQuery] = createSignal("");
  const limit = props.infiniteScrollLimit ?? 20;
  let loadMoreEl: HTMLDivElement | undefined;

  const filteredOptions = () => {
    if (props.enableInfiniteScroll) {
      return infiniteData();
    }

    const query = searchQuery().toLowerCase().trim();
    if (!query) return props.options;

    return props.options.filter((option) => {
      const displayValue = getDisplayValue(
        option,
        props.optionTextValue,
      ).toLowerCase();
      return displayValue.includes(query);
    });
  };

  let selectionMade = false;
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

  const loadMoreData = async (
    searchQuery: string = "",
    append: boolean = false,
  ) => {
    if (!props.onLoadMore || infiniteLoading() || infiniteEnd()) {
      return;
    }

    setInfiniteLoading(true);
    try {
      const offset = append ? infiniteData().length : 0;
      const result = await props.onLoadMore(searchQuery, offset);

      if (append) {
        setInfiniteData((prev) => [...prev, ...result.data]);
      } else {
        setInfiniteData(result.data);
      }

      setInfiniteEnd(!result.hasMore);
    } catch (error) {
      console.error("Failed to load more data:", error);
      setInfiniteEnd(true);
    } finally {
      setInfiniteLoading(false);
    }
  };

  const resetInfiniteData = () => {
    setInfiniteData([]);
    setInfiniteEnd(false);
  };

  let io: IntersectionObserver | undefined;
  let scrollContainer: HTMLElement | null = null;

  const setupIntersectionObserver = () => {
    if (!loadMoreEl || !props.enableInfiniteScroll) {
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
        if (
          entries[0]?.isIntersecting &&
          !infiniteLoading() &&
          !infiniteEnd()
        ) {
          loadMoreData(currentSearchQuery(), true);
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

  onSignal(isOpen, (open) => {
    if (open) {
      selectionMade = false;

      if (inputEl) {
        inputEl.value = "";
      }
      setCurrentSearchQuery("");
      setSearchQuery("");

      if (props.enableInfiniteScroll) {
        resetInfiniteData();
        loadMoreData("", false);

        const checkAndSetup = () => {
          if (loadMoreEl) {
            setupIntersectionObserver();
          } else {
            setTimeout(checkAndSetup, 50);
          }
        };
        setTimeout(checkAndSetup, 50);
      }

      props.onInputChange?.("");
    } else if (!open) {
      cleanupIntersectionObserver();

      if (inputEl) {
        inputEl.value = "";
      }
      setCurrentSearchQuery("");
      setSearchQuery("");
      if (props.enableInfiniteScroll) {
        resetInfiniteData();
      }
      props.onInputChange?.("");
    }
  });

  const handleSearchChange = (query: string) => {
    selectionMade = false;
    setSearchQuery(query);

    if (props.enableInfiniteScroll) {
      setCurrentSearchQuery(query);
      resetInfiniteData();
      loadMoreData(query, false);
    }
    props.onInputChange?.(query);
  };

  onSignal(
    () => props.options,
    (options) => {
      //get element by id
      const element = document.getElementById(id);
      if (element) {
        element.setAttribute(
          "data-options",
          JSON.stringify(
            options.map((option) =>
              getDisplayValue(option, props.optionTextValue),
            ),
          ),
        );
      }
    },
  );

  return (
    <div
      id={id}
      class="grid w-full items-center gap-1.5"
      data-required={props.required}
      data-label={props.label}
    >
      <Label required={props.required}>{props.label}</Label>
      <Suspense fallback={<Skeleton height={36} radius={4} />}>
        {props.readOnly ? (
          <div
            class={cn(
              "flex h-9 rounded-md border border-input text-gray-400 bg-gray-50 px-3 py-2 text-xs",
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
                selectionMade = true;
                props.onChange?.(e);
                setIsOpen(false);
              }
            }}
            onInputChange={handleSearchChange}
            debounceOptionsMillisecond={props.debounceOptionsMillisecond}
            class="w-full"
            itemComponent={(p) => {
              return (
                <SearchItem item={p.item}>
                  <SearchItemLabel>
                    {p.item.rawValue[props.optionTextValue] as string}
                  </SearchItemLabel>
                </SearchItem>
              );
            }}
            sectionComponent={(p) => (
              <SearchSection>
                {p.section.rawValue[props.optionTextValue]}
              </SearchSection>
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
                            const inputValue = (e.target as HTMLInputElement)
                              .value;
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
                  value={
                    props.value
                      ? getDisplayValue(props.value, props.optionTextValue)
                      : ""
                  }
                  class="sr-only" // or your own .visually-hidden util
                />

                <Show
                  when={
                    props.value && !props.readOnly && props.clearable !== false
                  }
                >
                  <button
                    type="button"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      props.onChange?.(null);
                      if (inputEl) {
                        inputEl.value = "";
                        props.onInputChange?.("");
                      }
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="text-gray-500"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
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
                <div class="p-2 border-t mt-1">
                  {props.extraButton!(() => setIsOpen(false))}
                </div>
              </Show>
              <Show when={props.enableInfiniteScroll}>
                <div
                  ref={(el) => {
                    loadMoreEl = el;
                  }}
                  class="h-4 w-full opacity-0"
                  style="min-height: 1px;"
                />
                <div class="flex justify-center items-center p-2 text-xs text-muted-foreground border-t bg-gray-50">
                  <Show
                    when={infiniteLoading()}
                    fallback={
                      <Show when={!infiniteEnd()}>
                        <div class="w-full text-center py-2">
                          Scroll for more results
                          <div class="text-xs opacity-50 mt-1">
                            ({infiniteData().length} loaded)
                          </div>
                        </div>
                      </Show>
                    }
                  >
                    <div class="w-full text-center py-2">
                      Loading more...
                      <div class="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mt-1"></div>
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
          "transition-all opacity-0 h-0 duration-300 ease-in-out text-xs text-destructive",
          props.error && "opacity-100 h-4 ",
        )}
      >
        {props.error}
      </div>
    </div>
  );
}
