import {
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
import { ChevronDown } from "lucide-solid";
import { createMemo, createSignal, For, Show } from "solid-js";
import type { UseTableFiltersReturn } from "../use-table-filters";

export interface FilterMultiSelectOption {
  value: string;
  label: string;
}

export interface FilterMultiSelectProps<
  TFilters extends Record<string, unknown>,
> {
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
  let inputRef: HTMLInputElement | undefined;

  // Parse the comma-separated filter value into an array of selected options
  const selectedValues = createMemo(() => {
    const filterValue = props.filterHook.filters()[props.filterKey] as
      | string
      | undefined;
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
    return props.options.filter((opt) =>
      opt.label.toLowerCase().includes(query),
    );
  });

  const handleSelect = (selected: FilterMultiSelectOption[] | null) => {
    if (!selected || selected.length === 0) return;

    const newItem = selected[0];
    const currentValues = selectedValues();

    // Don't add if already selected
    if (currentValues.includes(newItem.value)) return;

    const updatedValues = [...currentValues, newItem.value];
    const newFilterValue = updatedValues.join(",");

    props.filterHook.setFilter(
      props.filterKey,
      newFilterValue as TFilters[typeof props.filterKey],
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
    const newFilterValue =
      updatedValues.length > 0 ? updatedValues.join(",") : undefined;

    props.filterHook.setFilter(
      props.filterKey,
      newFilterValue as TFilters[typeof props.filterKey],
    );
  };

  return (
    <div class="space-y-1.5 py-1">
      <Label class="text-xs text-gray-600">{props.label}</Label>
      <Search<FilterMultiSelectOption>
        triggerMode="focus"
        multiple={true}
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
          </SearchItem>
        )}
      >
        <SearchControl class="relative flex flex-wrap items-center min-h-8 gap-1 pr-8">
          <Show when={selectedOptions().length > 0}>
            <For each={selectedOptions()}>
              {(option) => (
                <span class="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs">
                  {option.label}
                  <button
                    type="button"
                    class="ml-0.5 cursor-pointer text-gray-500 hover:text-gray-700"
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
            class="min-w-[60px] flex-1 bg-transparent py-1 text-xs outline-none"
          />
          <ChevronDown class="absolute right-2 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        </SearchControl>

        <SearchContent onCloseAutoFocus={(e) => e.preventDefault()}>
          <SearchListbox />
          <SearchNoResult>
            {props.noResultText ?? "No results found"}
          </SearchNoResult>
        </SearchContent>
      </Search>
    </div>
  );
}
