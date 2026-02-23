import { Button, cn, Popover, PopoverContent, PopoverTrigger } from "@xgx/ui";
import { ListFilter } from "lucide-solid";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import type { UseTableFiltersReturn } from "./use-table-filters";

export interface TableFilterProps<TFilters extends Record<string, unknown>> {
  /**
   * The filter hook instance from useTableFilters
   */
  filterHook: UseTableFiltersReturn<TFilters>;
  /**
   * Additional CSS classes for the trigger button
   */
  class?: string;
  /**
   * Filter field components to render inside the popover
   */
  children: JSX.Element;
}

/**
 * A reusable filter popover component for tables.
 * Displays a filter button with an active filter count badge,
 * and a popover with filter fields.
 *
 * @example
 * ```tsx
 * <TableFilter filterHook={filterHook}>
 *   <FilterSwitch
 *     label="Show deleted"
 *     filterKey="showDeleted"
 *     filterHook={filterHook}
 *   />
 *   <FilterDateRange
 *     label="Created between"
 *     fromKey="createdFrom"
 *     toKey="createdTo"
 *     filterHook={filterHook}
 *   />
 * </TableFilter>
 * ```
 */
export function TableFilter<TFilters extends Record<string, unknown>>(
  props: TableFilterProps<TFilters>,
) {
  const handleReset = () => {
    props.filterHook.resetFilters();
  };

  return (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="outline"
          class={cn("text-xs rounded-full text-gray-500 relative", props.class)}
        >
          <div class="mr-2">
            <ListFilter size={14} />
          </div>
          Filter
          <Show when={props.filterHook.activeFilterCount() > 0}>
            <span class="absolute -top-1 -right-1 size-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {props.filterHook.activeFilterCount()}
            </span>
          </Show>
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-80">
        <div class="w-full flex flex-col gap-2">
          <div class="font-semibold pb-2 border-b w-full flex justify-between items-center">
            <div class="flex space-x-1 items-baseline">
              <h1 class="text-sm font-medium">Filtering</h1>
            </div>
            <Button
              class="text-primary text-[11px] hover:text-primary/80"
              size="sm"
              variant="link"
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>

          <div class="flex flex-col gap-2 max-h-96 overflow-y-auto">
            {props.children}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
