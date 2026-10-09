import type { JSX } from "@solidjs/web";
import { FilterPopover } from "@xgx/ui";
import { ListFilter } from "@xgx/ui/icons";
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
   * Title shown at the top of the popover
   * @default "Filters"
   */
  title?: string;
  /**
   * Filter field components to render inside the popover
   */
  children: JSX.Element;
}

/**
 * The shared `FilterPopover` bound to a `useTableFilters` hook: the trigger shows the hook's
 * active filter count, and Reset clears the table's filters.
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
  return (
    <FilterPopover
      icon={<ListFilter size={14} />}
      activeCount={props.filterHook.activeFilterCount()}
      onReset={props.filterHook.resetFilters}
      triggerClass={props.class}
      title={props.title}
    >
      {props.children}
    </FilterPopover>
  );
}
