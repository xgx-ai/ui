import { Checkbox, Label } from "@xgx/ui";
import { For } from "solid-js";
import type { UseTableFiltersReturn } from "../use-table-filters";

export interface FilterSwitchGroupOption<
  TFilters extends Record<string, unknown>,
> {
  /**
   * The label to display for the checkbox
   */
  label: string;
  /**
   * The key in the filters object for this checkbox
   */
  filterKey: keyof TFilters & string;
}

export interface FilterSwitchGroupProps<
  TFilters extends Record<string, unknown>,
> {
  /**
   * The group label to display above the checkboxes
   */
  label: string;
  /**
   * The options (checkboxes) to display
   */
  options: FilterSwitchGroupOption<TFilters>[];
  /**
   * The filter hook instance from useTableFilters
   */
  filterHook: UseTableFiltersReturn<TFilters>;
}

/**
 * A group of checkbox filter fields displayed side by side.
 *
 * @example
 * ```tsx
 * <FilterSwitchGroup
 *   label="Family composition"
 *   options={[
 *     { label: "Has children", filterKey: "hasChildren" },
 *     { label: "Has parents", filterKey: "hasParents" },
 *   ]}
 *   filterHook={filterHook}
 * />
 * ```
 */
export function FilterSwitchGroup<TFilters extends Record<string, unknown>>(
  props: FilterSwitchGroupProps<TFilters>,
) {
  const isChecked = (key: keyof TFilters & string) =>
    (props.filterHook.filters()[key] as boolean) ?? false;

  const handleChange = (key: keyof TFilters & string, checked: boolean) => {
    // Set to undefined when false to keep URL clean
    props.filterHook.setFilter(
      key,
      checked ? (true as TFilters[typeof key]) : undefined,
    );
  };

  return (
    <div class="space-y-2 py-1">
      <Label class="text-xs text-gray-600">{props.label}</Label>
      <div class="flex items-center gap-4">
        <For each={props.options}>
          {(option) => (
            <div class="flex items-center gap-2">
              <Checkbox
                checked={isChecked(option.filterKey)}
                onChange={(checked) => handleChange(option.filterKey, checked)}
                size="sm"
              />
              <span class="text-xs text-gray-700">{option.label}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
