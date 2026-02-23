import { type JSX, type ParentProps, Show, splitProps } from "solid-js";
import { cn } from "../cn";
import { Button } from "../forms/button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface FilterPopoverProps extends ParentProps {
  class?: string;
  /** Number of active filters (shown as badge) */
  activeCount?: number;
  /** Called when reset button is clicked */
  onReset?: () => void;
  /** Title shown in header */
  title?: string;
  /** Icon for the trigger button */
  icon?: JSX.Element;
  /** Width of popover content */
  width?: string;
}

/**
 * Filter popover with header, reset button, and scrollable content area.
 *
 * @example
 * ```tsx
 * <FilterPopover
 *   activeCount={3}
 *   onReset={resetFilters}
 *   icon={<ListFilter size={14} />}
 * >
 *   <FilterItem label="Show deleted">
 *     <Checkbox checked={filters.showDeleted} onChange={...} />
 *   </FilterItem>
 *   <FilterSelect label="Type" options={...} />
 * </FilterPopover>
 * ```
 */
export function FilterPopover(props: FilterPopoverProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "activeCount",
    "onReset",
    "title",
    "icon",
    "width",
    "children",
  ]);

  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="outline" class="text-xs relative">
          <Show when={local.icon}>
            <span class="mr-2">{local.icon}</span>
          </Show>
          Filter
          <Show when={(local.activeCount ?? 0) > 0}>
            <span class="absolute -top-1 -right-1 size-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {local.activeCount}
            </span>
          </Show>
        </Button>
      </PopoverTrigger>
      <PopoverContent class={cn(local.width ?? "w-80", local.class)} {...rest}>
        <div class="flex flex-col gap-2">
          <div class="flex justify-between items-center pb-2 border-b">
            <h3 class="text-sm font-medium">{local.title ?? "Filters"}</h3>
            <Show when={local.onReset}>
              <Button
                variant="link"
                size="sm"
                class="text-xs text-primary h-auto p-0"
                onClick={local.onReset}
              >
                Reset
              </Button>
            </Show>
          </div>
          <div class="flex flex-col gap-2 max-h-96 overflow-y-auto">
            {local.children}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface FilterItemProps extends ParentProps {
  class?: string;
  /** Label for the filter */
  label: string;
  /** Layout direction */
  direction?: "row" | "column";
}

/**
 * Individual filter item with label.
 */
export function FilterItem(props: FilterItemProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "label",
    "direction",
    "children",
  ]);

  const isRow = () => local.direction !== "column";

  return (
    <div
      class={cn(
        "py-1",
        isRow() ? "flex items-center justify-between" : "flex flex-col gap-1",
        local.class,
      )}
      {...rest}
    >
      <span class="text-xs text-muted-foreground">{local.label}</span>
      {local.children}
    </div>
  );
}

export interface FilterDateRangeProps {
  class?: string;
  /** Label for the date range */
  label: string;
  /** From date value */
  fromValue?: string;
  /** To date value */
  toValue?: string;
  /** Called when from date changes */
  onFromChange: (value: string) => void;
  /** Called when to date changes */
  onToChange: (value: string) => void;
}

/**
 * Date range filter with from/to inputs.
 */
export function FilterDateRange(props: FilterDateRangeProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "label",
    "fromValue",
    "toValue",
    "onFromChange",
    "onToChange",
  ]);

  return (
    <div class={cn("flex flex-col gap-1", local.class)} {...rest}>
      <span class="text-xs text-muted-foreground">{local.label}</span>
      <div class="flex gap-2">
        <input
          type="date"
          value={local.fromValue ?? ""}
          onInput={(e) => local.onFromChange(e.currentTarget.value)}
          placeholder="From"
          class="flex-1 h-8 text-xs border rounded-md px-2 bg-background"
        />
        <input
          type="date"
          value={local.toValue ?? ""}
          onInput={(e) => local.onToChange(e.currentTarget.value)}
          placeholder="To"
          class="flex-1 h-8 text-xs border rounded-md px-2 bg-background"
        />
      </div>
    </div>
  );
}
