import { Checkbox, Label } from "@xgx/ui";
import type { UseTableFiltersReturn } from "../use-table-filters";

export interface FilterSwitchProps<TFilters extends Record<string, unknown>> {
  /**
   * The label to display for the checkbox
   */
  label: string;
  /**
   * The key in the filters object for this checkbox
   */
  filterKey: keyof TFilters & string;
  /**
   * The filter hook instance from useTableFilters
   */
  filterHook: UseTableFiltersReturn<TFilters>;
}

/**
 * A checkbox filter field for boolean values.
 *
 * @example
 * ```tsx
 * <FilterSwitch
 *   label="Show deleted"
 *   filterKey="showDeleted"
 *   filterHook={filterHook}
 * />
 * ```
 */
export function FilterSwitch<TFilters extends Record<string, unknown>>(
  props: FilterSwitchProps<TFilters>,
) {
  const checked = () =>
    (props.filterHook.filters()[props.filterKey] as boolean) ?? false;

  const handleChange = (isChecked: boolean) => {
    // Set to undefined when false to keep URL clean
    props.filterHook.setFilter(
      props.filterKey,
      isChecked ? (true as TFilters[typeof props.filterKey]) : undefined,
    );
  };

  return (
    <div class="flex items-center justify-between py-1">
      <Label class="text-xs text-gray-600">{props.label}</Label>
      <Checkbox checked={checked()} onChange={handleChange} size="sm" />
    </div>
  );
}
