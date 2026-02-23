import { TextField, TextFieldInput, TextFieldLabel } from "@xgx/ui";
import type { UseTableFiltersReturn } from "../use-table-filters";

export interface FilterDateRangeProps<
  TFilters extends Record<string, unknown>,
> {
  /**
   * The label to display for the date range
   */
  label: string;
  /**
   * The key in the filters object for the "from" date
   */
  fromKey: keyof TFilters & string;
  /**
   * The key in the filters object for the "to" date
   */
  toKey: keyof TFilters & string;
  /**
   * The filter hook instance from useTableFilters
   */
  filterHook: UseTableFiltersReturn<TFilters>;
}

/**
 * A date range filter field with from/to date inputs.
 *
 * @example
 * ```tsx
 * <FilterDateRange
 *   label="Created between"
 *   fromKey="createdFrom"
 *   toKey="createdTo"
 *   filterHook={filterHook}
 * />
 * ```
 */
export function FilterDateRange<TFilters extends Record<string, unknown>>(
  props: FilterDateRangeProps<TFilters>,
) {
  const fromValue = () =>
    (props.filterHook.filters()[props.fromKey] as string) ?? "";
  const toValue = () =>
    (props.filterHook.filters()[props.toKey] as string) ?? "";

  const handleFromChange = (value: string) => {
    props.filterHook.setFilter(
      props.fromKey,
      (value || undefined) as TFilters[typeof props.fromKey],
    );
  };

  const handleToChange = (value: string) => {
    props.filterHook.setFilter(
      props.toKey,
      (value || undefined) as TFilters[typeof props.toKey],
    );
  };

  return (
    <div class="space-y-2 py-1">
      <div class="flex gap-2">
        <TextField
          value={fromValue()}
          onChange={handleFromChange}
          class="flex-1"
        >
          <TextFieldLabel class="text-xs text-gray-600">
            {props.label}
          </TextFieldLabel>
          <TextFieldInput type="date" class="h-8 px-2 py-1" />
        </TextField>
        <TextField value={toValue()} onChange={handleToChange} class="flex-1">
          <TextFieldLabel class="invisible text-xs">&nbsp;</TextFieldLabel>
          <TextFieldInput type="date" class="h-8 px-2 py-1" />
        </TextField>
      </div>
    </div>
  );
}
