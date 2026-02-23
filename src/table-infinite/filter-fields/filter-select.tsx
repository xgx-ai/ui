import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@xgx/ui";
import type { UseTableFiltersReturn } from "../use-table-filters";

export interface FilterSelectOption {
  value: string;
  label: string;
}

export interface FilterSelectProps<TFilters extends Record<string, unknown>> {
  /**
   * The label to display for the select
   */
  label: string;
  /**
   * The key in the filters object for this select
   */
  filterKey: keyof TFilters & string;
  /**
   * The filter hook instance from useTableFilters
   */
  filterHook: UseTableFiltersReturn<TFilters>;
  /**
   * The options to display in the select
   */
  options: FilterSelectOption[];
  /**
   * Placeholder text when no option is selected
   * @default "All"
   */
  placeholder?: string;
}

/**
 * A select filter field for choosing from predefined options.
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
    (props.filterHook.filters()[props.filterKey] as string) ?? null;

  const handleChange = (selectedValue: string | null) => {
    props.filterHook.setFilter(
      props.filterKey,
      (selectedValue || undefined) as TFilters[typeof props.filterKey],
    );
  };

  return (
    <div class="space-y-1.5 py-1">
      <Label class="text-xs text-gray-600">{props.label}</Label>
      <Select
        value={value()}
        onChange={handleChange}
        options={props.options.map((opt) => opt.value)}
        placeholder={props.placeholder ?? "All"}
        itemComponent={(itemProps) => (
          <SelectItem item={itemProps.item}>
            {props.options.find((opt) => opt.value === itemProps.item.rawValue)
              ?.label ?? itemProps.item.rawValue}
          </SelectItem>
        )}
      >
        <SelectTrigger class="h-8 text-xs">
          <SelectValue<string>>
            {(state) =>
              props.options.find((opt) => opt.value === state.selectedOption())
                ?.label ?? state.selectedOption()
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </div>
  );
}
