import { type Accessor, createMemo } from "solid-js";

export interface UseTableFiltersOptions<
  TFilters extends Record<string, unknown>,
> {
  /**
   * Unique identifier for the table, used to namespace filters in the URL
   */
  tableId: string;
  /**
   * Navigate function from TanStack Router (Route.useNavigate())
   */
  navigate: (opts: {
    search: (prev: Record<string, unknown>) => Record<string, unknown>;
    replace?: boolean;
  }) => void;
  /**
   * Search accessor from TanStack Router (Route.useSearch())
   */
  search: Accessor<{ filters?: Record<string, Record<string, unknown>> }>;
  /**
   * Default filter values - used to determine active filter count
   */
  defaultFilters?: Partial<TFilters>;
}

export interface UseTableFiltersReturn<
  TFilters extends Record<string, unknown>,
> {
  /**
   * Get the current filter values for this table
   */
  filters: Accessor<TFilters>;
  /**
   * Set a single filter value
   */
  setFilter: <K extends keyof TFilters>(
    key: K,
    value: TFilters[K] | undefined,
  ) => void;
  /**
   * Reset all filters for this table
   */
  resetFilters: () => void;
  /**
   * Count of active filters (non-undefined, non-default values)
   */
  activeFilterCount: Accessor<number>;
  /**
   * Whether any filters are active
   */
  hasActiveFilters: Accessor<boolean>;
  /**
   * The table ID this filter hook is associated with
   */
  tableId: string;
}

/**
 * Hook for managing table filters via TanStack Router's search params.
 * Filters are namespaced by tableId to support multiple tables on the same page.
 *
 * @example
 * ```tsx
 * const filterHook = useTableFilters({
 *   tableId: "houses",
 *   navigate: Route.useNavigate(),
 *   search: Route.useSearch,
 * });
 *
 * // Set a filter
 * filterHook.setFilter("showDeleted", true);
 *
 * // Read filters
 * const { showDeleted, createdFrom } = filterHook.filters();
 * ```
 */
export function useTableFilters<TFilters extends Record<string, unknown>>(
  options: UseTableFiltersOptions<TFilters>,
): UseTableFiltersReturn<TFilters> {
  const {
    tableId,
    navigate,
    search,
    defaultFilters = {} as Partial<TFilters>,
  } = options;

  // Get current filters for this table
  const filters = createMemo(() => {
    const allFilters = search().filters ?? {};
    return (allFilters[tableId] ?? {}) as TFilters;
  });

  // Set a single filter value
  const setFilter = <K extends keyof TFilters>(
    key: K,
    value: TFilters[K] | undefined,
  ) => {
    navigate({
      search: (prev) => {
        const currentFilters =
          (prev.filters as Record<string, Record<string, unknown>>) ?? {};
        const tableFilters = { ...currentFilters[tableId] };

        if (value === undefined) {
          delete tableFilters[key as string];
        } else {
          tableFilters[key as string] = value;
        }

        // Clean up empty filter objects
        const newFilters = { ...currentFilters };
        if (Object.keys(tableFilters).length === 0) {
          delete newFilters[tableId];
        } else {
          newFilters[tableId] = tableFilters;
        }

        // Clean up empty filters object entirely
        if (Object.keys(newFilters).length === 0) {
          const { filters: _, ...rest } = prev;
          return rest;
        }

        return {
          ...prev,
          filters: newFilters,
        };
      },
      replace: true,
    });
  };

  // Reset all filters for this table
  const resetFilters = () => {
    navigate({
      search: (prev) => {
        const currentFilters =
          (prev.filters as Record<string, Record<string, unknown>>) ?? {};
        const { [tableId]: _, ...remainingFilters } = currentFilters;

        // Clean up empty filters object entirely
        if (Object.keys(remainingFilters).length === 0) {
          const { filters: __, ...rest } = prev;
          return rest;
        }

        return {
          ...prev,
          filters: remainingFilters,
        };
      },
      replace: true,
    });
  };

  // Count active filters (excluding undefined and default values)
  const activeFilterCount = createMemo(() => {
    const currentFilters = filters();
    let count = 0;

    for (const [key, value] of Object.entries(currentFilters)) {
      if (value === undefined) continue;

      const defaultValue = defaultFilters[key as keyof TFilters];

      // For date ranges, count from/to pairs as one filter
      if (key.endsWith("From") || key.endsWith("To")) {
        const baseKey = key.replace(/(?:From|To)$/, "");
        const fromKey = `${baseKey}From`;
        const toKey = `${baseKey}To`;

        // Only count once for the "From" key
        if (key.endsWith("From")) {
          const fromValue = currentFilters[fromKey as keyof TFilters];
          const toValue = currentFilters[toKey as keyof TFilters];
          if (fromValue !== undefined || toValue !== undefined) {
            count++;
          }
        }
        continue;
      }

      // Check if value differs from default
      if (value !== defaultValue) {
        count++;
      }
    }

    return count;
  });

  const hasActiveFilters = createMemo(() => activeFilterCount() > 0);

  return {
    filters,
    setFilter,
    resetFilters,
    activeFilterCount,
    hasActiveFilters,
    tableId,
  };
}
