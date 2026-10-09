import { TextField, TextFieldInput, TextFieldLabel } from "@xgx/ui";
import type { UseTableFiltersReturn } from "../use-table-filters";

interface FilterDateRangeBaseProps {
  /**
   * The label to display for the date range. It sits above the "from" input.
   */
  label: string;
  /**
   * A label for the "to" input, shown above it. Without one the "to" input sits under a blank
   * spacer.
   */
  toLabel?: string;
}

export interface FilterDateRangeHookProps<TFilters extends Record<string, unknown>>
  extends FilterDateRangeBaseProps {
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

/** A date range held outside `useTableFilters`, such as local state or another search param. */
export interface FilterDateRangeControlledProps extends FilterDateRangeBaseProps {
  /** The "from" date as `YYYY-MM-DD`, or empty. */
  fromValue?: string;
  /** The "to" date as `YYYY-MM-DD`, or empty. */
  toValue?: string;
  /** Called with the new "from" date, or an empty string when it is cleared. */
  onFromChange: (value: string) => void;
  /** Called with the new "to" date, or an empty string when it is cleared. */
  onToChange: (value: string) => void;
}

export type FilterDateRangeProps<TFilters extends Record<string, unknown>> =
  | FilterDateRangeHookProps<TFilters>
  | FilterDateRangeControlledProps;

/**
 * A date range filter field with from/to date inputs.
 *
 * Bind it to `useTableFilters` with `filterHook`, `fromKey` and `toKey`, or control it with
 * `fromValue`, `toValue`, `onFromChange` and `onToChange`.
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
    "filterHook" in props
      ? ((props.filterHook.filters()[props.fromKey] as string) ?? "")
      : (props.fromValue ?? "");
  const toValue = () =>
    "filterHook" in props
      ? ((props.filterHook.filters()[props.toKey] as string) ?? "")
      : (props.toValue ?? "");

  const handleFromChange = (value: string) => {
    if (!("filterHook" in props)) {
      props.onFromChange(value);
      return;
    }
    props.filterHook.setFilter(
      props.fromKey,
      (value || undefined) as TFilters[typeof props.fromKey],
    );
  };

  const handleToChange = (value: string) => {
    if (!("filterHook" in props)) {
      props.onToChange(value);
      return;
    }
    props.filterHook.setFilter(props.toKey, (value || undefined) as TFilters[typeof props.toKey]);
  };

  return (
    <div class="space-y-2 py-1">
      <div class="flex gap-2">
        <TextField value={fromValue()} onChange={handleFromChange} class="flex-1">
          <TextFieldLabel class="text-xs text-muted-foreground">{props.label}</TextFieldLabel>
          <TextFieldInput type="date" class="h-8 px-2 py-1" />
        </TextField>
        <TextField value={toValue()} onChange={handleToChange} class="flex-1">
          <TextFieldLabel
            class={props.toLabel ? "text-xs text-muted-foreground" : "invisible text-xs"}
          >
            {props.toLabel ?? "\u00a0"}
          </TextFieldLabel>
          <TextFieldInput type="date" class="h-8 px-2 py-1" />
        </TextField>
      </div>
    </div>
  );
}
