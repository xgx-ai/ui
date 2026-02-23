import { TextField, TextFieldInput, TextFieldLabel } from "@xgx/ui";
import type { UseTableFiltersReturn } from "../use-table-filters";

export interface FilterTextProps<TFilters extends Record<string, unknown>> {
  /**
   * The label to display for the text input
   */
  label: string;
  /**
   * The key in the filters object for this text field
   */
  filterKey: keyof TFilters & string;
  /**
   * The filter hook instance from useTableFilters
   */
  filterHook: UseTableFiltersReturn<TFilters>;
  /**
   * Placeholder text when no value is entered
   */
  placeholder?: string;
}

/**
 * A text filter field for free-text input.
 *
 * @example
 * ```tsx
 * <FilterText
 *   label="Local Authority"
 *   filterKey="localAuthority"
 *   filterHook={filterHook}
 *   placeholder="Enter local authority..."
 * />
 * ```
 */
export function FilterText<TFilters extends Record<string, unknown>>(
  props: FilterTextProps<TFilters>,
) {
  const value = () =>
    (props.filterHook.filters()[props.filterKey] as string) ?? "";

  const handleChange = (newValue: string) => {
    props.filterHook.setFilter(
      props.filterKey,
      (newValue || undefined) as TFilters[typeof props.filterKey],
    );
  };

  return (
    <div class="space-y-1.5 py-1">
      <TextField value={value()} onChange={handleChange}>
        <TextFieldLabel class="text-xs text-gray-600">
          {props.label}
        </TextFieldLabel>
        <TextFieldInput
          type="text"
          class="h-8 px-2 py-1"
          placeholder={props.placeholder ?? ""}
        />
      </TextField>
    </div>
  );
}
