import { cn, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@xgx/ui";
import { createUniqueId } from "solid-js";
import type { UseTableFiltersReturn } from "../use-table-filters";

export interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectBaseProps {
  /**
   * The label to display for the select
   */
  label: string;
  /**
   * The options to display in the select
   */
  options: FilterSelectOption[];
  /**
   * Placeholder text when no option is selected
   * @default "All"
   */
  placeholder?: string;
  /**
   * Additional classes for the field wrapper, for example a width when the field sits in a
   * toolbar rather than a filter popover.
   */
  class?: string;
}

export interface FilterSelectHookProps<TFilters extends Record<string, unknown>>
  extends FilterSelectBaseProps {
  /**
   * The key in the filters object for this select
   */
  filterKey: keyof TFilters & string;
  /**
   * The filter hook instance from useTableFilters
   */
  filterHook: UseTableFiltersReturn<TFilters>;
}

/** A select held outside `useTableFilters`, such as local state or another search param. */
export interface FilterSelectControlledProps extends FilterSelectBaseProps {
  /** The selected option's value. Nullish shows the placeholder. */
  value: string | null | undefined;
  /** Called with the chosen option's value, or `undefined` when the selection is cleared. */
  onChange: (value: string | undefined) => void;
}

export type FilterSelectProps<TFilters extends Record<string, unknown>> =
  | FilterSelectHookProps<TFilters>
  | FilterSelectControlledProps;

/**
 * A select filter field for choosing from predefined options.
 *
 * Bind it to `useTableFilters` with `filterHook` and `filterKey`, or control it with `value`
 * and `onChange`.
 *
 * @example
 * ```tsx
 * <FilterSelect
 *   label="Priority"
 *   filterKey="priority"
 *   filterHook={filterHook}
 *   options={[
 *     { value: "high", label: "High" },
 *     { value: "medium", label: "Medium" },
 *     { value: "low", label: "Low" },
 *   ]}
 * />
 * ```
 */
export function FilterSelect<TFilters extends Record<string, unknown>>(
  props: FilterSelectProps<TFilters>,
) {
  const value = () =>
    "filterHook" in props
      ? ((props.filterHook.filters()[props.filterKey] as string) ?? null)
      : (props.value ?? null);

  // Name the trigger "<label> <selected value>", as a native labelled select reads.
  const labelId = createUniqueId();
  const triggerId = createUniqueId();

  const handleChange = (selectedValue: string | null) => {
    if (!("filterHook" in props)) {
      props.onChange(selectedValue || undefined);
      return;
    }
    props.filterHook.setFilter(
      props.filterKey,
      (selectedValue || undefined) as TFilters[typeof props.filterKey],
    );
  };

  return (
    <div class={cn("space-y-1.5 py-1", props.class)}>
      <Label id={labelId} class="text-xs text-muted-foreground">
        {props.label}
      </Label>
      <Select
        value={value()}
        onChange={handleChange}
        options={props.options.map((opt) => opt.value)}
        placeholder={props.placeholder ?? "All"}
        itemComponent={(itemProps: any) => (
          <SelectItem item={itemProps.item}>
            {props.options.find((opt) => opt.value === itemProps.item.rawValue)?.label ??
              itemProps.item.rawValue}
          </SelectItem>
        )}
      >
        <SelectTrigger
          id={triggerId}
          class="h-8 text-xs"
          aria-labelledby={`${labelId} ${triggerId}`}
        >
          <SelectValue<string> class={value() ? undefined : "text-border-strong"}>
            {(state) => {
              const selectedOption = state.selectedOption();
              return selectedOption
                ? (props.options.find((opt) => opt.value === selectedOption)?.label ??
                    selectedOption)
                : (props.placeholder ?? "All");
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </div>
  );
}
