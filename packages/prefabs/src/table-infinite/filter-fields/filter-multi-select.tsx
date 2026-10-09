import {
  cn,
  Label,
  Search,
  SearchContent,
  SearchControl,
  SearchInput,
  SearchItem,
  SearchItemLabel,
  SearchListbox,
  SearchNoResult,
} from "@xgx/ui";
import { Check, ChevronDown } from "@xgx/ui/icons";
import { createMemo, createSignal, For, Show } from "solid-js";
import type { UseTableFiltersReturn } from "../use-table-filters";

export interface FilterMultiSelectOption {
  value: string;
  label: string;
}

export interface FilterMultiSelectProps<TFilters extends Record<string, unknown>> {
  /**
   * The label to display for the filter
   */
  label: string;
  /**
   * The key in the filters object for this multi-select
   */
  filterKey: keyof TFilters & string;
  /**
   * The filter hook instance from useTableFilters
   */
  filterHook: UseTableFiltersReturn<TFilters>;
  /**
   * The options to display in the multi-select
   */
  options: FilterMultiSelectOption[];
  /**
   * Placeholder text when no options are selected
   * @default "Search and select..."
   */
  placeholder?: string;
  /**
   * Text shown when no search results are found
   * @default "No results found"
   */
  noResultText?: string;
  /**
   * Caps the control's width. `"full"` fills the container.
   * @default "full"
   */
  maxWidth?: "full" | "2xl";
  /**
   * Keeps the control one row high, to sit beside compact toolbar controls such as report
   * filters. Selected values that do not fit are clipped rather than wrapped.
   */
  compact?: boolean;
}

/**
 * Adds the option the user has just picked to the current selection.
 *
 * `Search` reports the whole selection (the existing values plus the new pick) in whatever
 * order it holds them, so the new pick is the one that is not already selected — not
 * necessarily the first. Returns `undefined` when nothing new was picked.
 */
export function addFilterMultiSelectValue(
  currentValues: readonly string[],
  selected: readonly FilterMultiSelectOption[] | null,
): string[] | undefined {
  const picked = selected?.find((option) => !currentValues.includes(option.value));
  return picked ? [...currentValues, picked.value] : undefined;
}

/**
 * A multi-select filter field with search functionality.
 * Selected values are stored as comma-separated strings in the filter.
 *
 * @example
 * ```tsx
 * <FilterMultiSelect
 *   label="Local Authority"
 *   filterKey="localAuthorities"
 *   filterHook={filterHook}
 *   options={[
 *     { value: "council-1", label: "Council 1" },
 *     { value: "council-2", label: "Council 2" },
 *   ]}
 * />
 * ```
 */
export function FilterMultiSelect<TFilters extends Record<string, unknown>>(
  props: FilterMultiSelectProps<TFilters>,
) {
  const [searchQuery, setSearchQuery] = createSignal("");
  const [open, setOpen] = createSignal(false);
  let inputRef: HTMLInputElement | undefined;

  // Parse the comma-separated filter value into an array of selected options
  const selectedValues = createMemo(() => {
    const filterValue = props.filterHook.filters()[props.filterKey] as string | undefined;
    if (!filterValue) return [];
    return filterValue.split(",").filter(Boolean);
  });

  // Get the full option objects for selected values
  const selectedOptions = createMemo(() => {
    const values = selectedValues();
    return props.options.filter((opt) => values.includes(opt.value));
  });

  // Filter options based on search query
  const filteredOptions = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return props.options;
    return props.options.filter((opt) => opt.label.toLowerCase().includes(query));
  });

  const handleSelect = (selected: FilterMultiSelectOption[] | null) => {
    const updatedValues = addFilterMultiSelectValue(selectedValues(), selected);
    if (!updatedValues) return;

    props.filterHook.setFilter(
      props.filterKey,
      updatedValues.join(",") as TFilters[typeof props.filterKey],
    );

    // Clear input after selection
    if (inputRef) {
      inputRef.value = "";
      setSearchQuery("");
    }
  };

  const handleRemove = (option: FilterMultiSelectOption) => {
    const currentValues = selectedValues();
    const updatedValues = currentValues.filter((v) => v !== option.value);
    const newFilterValue = updatedValues.length > 0 ? updatedValues.join(",") : undefined;

    props.filterHook.setFilter(props.filterKey, newFilterValue as TFilters[typeof props.filterKey]);
  };

  return (
    <div
      class={cn(
        props.compact ? "grid gap-1" : "space-y-1.5 py-1",
        props.maxWidth === "2xl" && "max-w-2xl",
      )}
    >
      <Label class={cn("text-xs text-muted-foreground", props.compact && "block h-4 font-medium")}>
        {props.label}
      </Label>
      <Search<FilterMultiSelectOption>
        triggerMode="focus"
        multiple={true}
        open={open()}
        onOpenChange={setOpen}
        options={filteredOptions()}
        optionValue="value"
        optionTextValue="label"
        optionLabel="label"
        value={selectedOptions()}
        placeholder={props.placeholder ?? "Search and select..."}
        onChange={handleSelect}
        onInputChange={setSearchQuery}
        itemComponent={(itemProps) => (
          <SearchItem item={itemProps.item}>
            <SearchItemLabel>{itemProps.item.rawValue.label}</SearchItemLabel>
            <Show when={selectedValues().includes(itemProps.item.rawValue.value)}>
              <Check aria-hidden="true" size={14} strokeWidth={2.5} />
            </Show>
          </SearchItem>
        )}
      >
        {/* SearchControl is a fixed-height, clipped row by default; let it grow as chips wrap. */}
        <SearchControl
          class={cn(
            "relative flex items-center gap-1 pr-8",
            props.compact
              ? "h-8 min-h-8 flex-nowrap overflow-hidden py-0"
              : "h-auto min-h-10 flex-wrap overflow-visible py-1",
          )}
        >
          <Show when={selectedOptions().length > 0}>
            <For each={selectedOptions()}>
              {(option) => (
                <span class="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {option.label}
                  <button
                    type="button"
                    class="ml-0.5 cursor-pointer text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${option.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(option);
                    }}
                  >
                    ×
                  </button>
                </span>
              )}
            </For>
          </Show>
          <SearchInput
            ref={inputRef}
            class={cn(
              "min-w-[60px] flex-1 bg-transparent text-xs outline-none",
              props.compact ? "h-7 py-0" : "py-1",
            )}
          />
          <ChevronDown
            class="absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            onClick={() => {
              setOpen(true);
              inputRef?.focus();
            }}
          />
        </SearchControl>

        <SearchContent onCloseAutoFocus={(e) => e.preventDefault()}>
          <SearchListbox />
          <SearchNoResult>{props.noResultText ?? "No results found"}</SearchNoResult>
        </SearchContent>
      </Search>
    </div>
  );
}
