import { Button, cn, Label } from "@xgx/ui";
import { createUniqueId, For, Show } from "solid-js";
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

interface FilterDatePresetBaseProps {
  /**
   * Custom preset options. Defaults to: All Time, Created Today, Created This Week, Created This Month
   */
  presets?: DatePresetOption[];
  /**
   * Optional label shown above the presets, matching the other filter fields.
   */
  label?: string;
  /**
   * Additional classes for the button group.
   */
  class?: string;
}

export interface FilterDatePresetHookProps<TFilters extends Record<string, unknown>>
  extends FilterDatePresetBaseProps {
  /**
   * The key in the filters object for this date preset
   */
  filterKey: keyof TFilters & string;
  /**
   * The filter hook instance from useTableFilters
   */
  filterHook: UseTableFiltersReturn<TFilters>;
}

/** A preset held outside `useTableFilters`, such as local state or another search param. */
export interface FilterDatePresetControlledProps extends FilterDatePresetBaseProps {
  /** The selected preset's value. `undefined` selects the "all" preset. */
  value: string | undefined;
  /** Called with the chosen preset's value, or `undefined` for the "all" preset. */
  onChange: (value: string | undefined) => void;
}

export type FilterDatePresetProps<TFilters extends Record<string, unknown>> =
  | FilterDatePresetHookProps<TFilters>
  | FilterDatePresetControlledProps;

/**
 * A horizontal button group for selecting date range presets. The preset whose value is
 * `"all"` clears the filter.
 *
 * Bind it to `useTableFilters` with `filterHook` and `filterKey`, or control it with `value`
 * and `onChange`.
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
    ("filterHook" in props
      ? (props.filterHook.filters()[props.filterKey] as string | undefined)
      : props.value) ?? "all";
  const labelId = createUniqueId();

  const handleClick = (presetValue: string) => {
    const next = presetValue === "all" ? undefined : presetValue;
    if (!("filterHook" in props)) {
      props.onChange(next);
      return;
    }
    props.filterHook.setFilter(props.filterKey, next as TFilters[typeof props.filterKey]);
  };

  return (
    <div class={cn(props.label && "space-y-1.5 py-1")}>
      <Show when={props.label}>
        <Label id={labelId} class="block text-xs text-muted-foreground">
          {props.label}
        </Label>
      </Show>
      <div
        role="group"
        aria-labelledby={props.label ? labelId : undefined}
        class={cn("flex gap-2 overflow-x-auto", props.class)}
      >
        <For each={presets()}>
          {(preset) => (
            <Button
              variant={value() === preset.value ? "default" : "outline"}
              size="sm"
              class="whitespace-nowrap text-xs"
              aria-pressed={value() === preset.value ? "true" : "false"}
              onClick={() => handleClick(preset.value)}
            >
              {preset.label}
            </Button>
          )}
        </For>
      </div>
    </div>
  );
}
