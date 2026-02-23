import { TextField, TextFieldInput, TextFieldLabel } from "@xgx/ui";
import type { UseTableFiltersReturn } from "../use-table-filters";

export interface FilterNumberRangeProps<
  TFilters extends Record<string, unknown>,
> {
  /**
   * The label to display for the number range
   */
  label: string;
  /**
   * The key in the filters object for the "min" value
   */
  minKey: keyof TFilters & string;
  /**
   * The key in the filters object for the "max" value
   */
  maxKey: keyof TFilters & string;
  /**
   * The filter hook instance from useTableFilters
   */
  filterHook: UseTableFiltersReturn<TFilters>;
  /**
   * Placeholder for min input
   */
  minPlaceholder?: string;
  /**
   * Placeholder for max input
   */
  maxPlaceholder?: string;
  /**
   * Step value for the number input (default: 1 for integers, use 0.01 for currency)
   */
  step?: number | "any";
  /**
   * Whether to allow decimal input (default: true)
   */
  allowDecimals?: boolean;
}

/**
 * A number range filter field with min/max number inputs.
 *
 * @example
 * ```tsx
 * <FilterNumberRange
 *   label="Family size"
 *   minKey="minMembers"
 *   maxKey="maxMembers"
 *   filterHook={filterHook}
 *   minPlaceholder="Min"
 *   maxPlaceholder="Max"
 * />
 * ```
 */
export function FilterNumberRange<TFilters extends Record<string, unknown>>(
  props: FilterNumberRangeProps<TFilters>,
) {
  const minValue = () =>
    (props.filterHook.filters()[props.minKey] as string) ?? "";
  const maxValue = () =>
    (props.filterHook.filters()[props.maxKey] as string) ?? "";

  const sanitiseValue = (value: string) => {
    if (props.allowDecimals === false) {
      return value.replace(/[^0-9]/g, "");
    }
    return value;
  };

  const handleMinChange = (value: string) => {
    const sanitised = sanitiseValue(value);
    props.filterHook.setFilter(
      props.minKey,
      (sanitised || undefined) as TFilters[typeof props.minKey],
    );
  };

  const handleMaxChange = (value: string) => {
    const sanitised = sanitiseValue(value);
    props.filterHook.setFilter(
      props.maxKey,
      (sanitised || undefined) as TFilters[typeof props.maxKey],
    );
  };

  const inputMode = () =>
    props.allowDecimals === false ? "numeric" : "decimal";

  return (
    <div class="space-y-2 py-1">
      <div class="flex gap-2">
        <TextField value={minValue()} onChange={handleMinChange} class="flex-1">
          <TextFieldLabel class="text-xs text-gray-600">
            {props.label}
          </TextFieldLabel>
          <TextFieldInput
            type="text"
            inputMode={inputMode()}
            class="h-8 px-2 py-1"
            placeholder={props.minPlaceholder ?? "Min"}
          />
        </TextField>
        <TextField value={maxValue()} onChange={handleMaxChange} class="flex-1">
          <TextFieldLabel class="invisible text-xs">&nbsp;</TextFieldLabel>
          <TextFieldInput
            type="text"
            inputMode={inputMode()}
            class="h-8 px-2 py-1"
            placeholder={props.maxPlaceholder ?? "Max"}
          />
        </TextField>
      </div>
    </div>
  );
}
