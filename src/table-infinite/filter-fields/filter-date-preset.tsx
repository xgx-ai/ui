import { Button } from "@xgx/ui";
import { For } from "solid-js";
import type { UseTableFiltersReturn } from "../use-table-filters";

export interface DatePresetOption {
  value: string;
  label: string;
}

export const defaultDatePresets: DatePresetOption[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Created Today" },
  { value: "week", label: "Created This Week" },
  { value: "month", label: "Created This Month" },
];

export interface FilterDatePresetProps<
  TFilters extends Record<string, unknown>,
> {
  /**
   * The key in the filters object for this date preset
   */
  filterKey: keyof TFilters & string;
  /**
   * The filter hook instance from useTableFilters
   */
  filterHook: UseTableFiltersReturn<TFilters>;
  /**
   * Custom preset options. Defaults to: All Time, Created Today, Created This Week, Created This Month
   */
  presets?: DatePresetOption[];
}

/**
 * A horizontal button group for selecting date range presets.
 *
 * @example
 * ```tsx
 * <FilterDatePreset
 *   filterKey="dateFilter"
 *   filterHook={filterHook}
 * />
 * ```
 */
export function FilterDatePreset<TFilters extends Record<string, unknown>>(
  props: FilterDatePresetProps<TFilters>,
) {
  const presets = () => props.presets ?? defaultDatePresets;
  const value = () =>
    (props.filterHook.filters()[props.filterKey] as string) ?? "all";

  const handleClick = (presetValue: string) => {
    props.filterHook.setFilter(
      props.filterKey,
      (presetValue === "all"
        ? undefined
        : presetValue) as TFilters[typeof props.filterKey],
    );
  };

  return (
    <div class="flex gap-2 overflow-x-auto">
      <For each={presets()}>
        {(preset) => (
          <Button
            variant={
              value() === preset.value ||
              (value() === undefined && preset.value === "all")
                ? "default"
                : "outline"
            }
            size="sm"
            class="whitespace-nowrap text-xs"
            onClick={() => handleClick(preset.value)}
          >
            {preset.label}
          </Button>
        )}
      </For>
    </div>
  );
}
