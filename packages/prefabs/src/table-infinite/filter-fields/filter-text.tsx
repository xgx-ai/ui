import { TextField, TextFieldInput, TextFieldLabel } from "@xgx/ui";
import { createEffect, createSignal, untrack } from "solid-js";
import type { UseTableFiltersReturn } from "../use-table-filters";

export interface FilterTextProps<TFilters extends Record<string, unknown>> {
  /**
   * The label to display for the text input
   */
  label: string;
  /**
   * The key in the filters object for this text field
   */
  filterKey: keyof TFilters & string;
  /**
   * The filter hook instance from useTableFilters
   */
  filterHook: UseTableFiltersReturn<TFilters>;
  /**
   * Placeholder text when no value is entered
   */
  placeholder?: string;
  /**
   * Delay before committing text changes to the filter state.
   * @default 300
   */
  debounceMs?: number;
}

/**
 * A text filter field for free-text input.
 *
 * @example
 * ```tsx
 * <FilterText
 *   label="Local Authority"
 *   filterKey="localAuthority"
 *   filterHook={filterHook}
 *   placeholder="Enter local authority..."
 * />
 * ```
 */
export function FilterText<TFilters extends Record<string, unknown>>(
  props: FilterTextProps<TFilters>,
) {
  const value = () => (props.filterHook.filters()[props.filterKey] as string) ?? "";
  const [draft, setDraft] = createSignal(untrack(value));
  const [focused, setFocused] = createSignal(false);
  let debounceTimeout: ReturnType<typeof setTimeout> | undefined;

  const clearDebounce = () => {
    if (debounceTimeout === undefined) return;

    clearTimeout(debounceTimeout);
    debounceTimeout = undefined;
  };

  const commitValue = (newValue: string) => {
    clearDebounce();
    const trimmed = newValue.trim();
    props.filterHook.setFilter(
      props.filterKey,
      (trimmed || undefined) as TFilters[typeof props.filterKey],
    );
  };

  const scheduleCommit = (newValue: string) => {
    clearDebounce();
    debounceTimeout = setTimeout(() => {
      commitValue(newValue);
    }, props.debounceMs ?? 300);
  };

  createEffect(value, (nextValue) => {
    if (!untrack(focused)) setDraft(nextValue);
  });

  createEffect(
    () => true,
    () => {
      return () => {
        clearDebounce();
      };
    },
  );

  const handleChange = (newValue: string) => {
    setDraft(newValue);
    scheduleCommit(newValue);
  };

  const handleFocus = () => {
    setFocused(true);
  };

  const handleBlur = () => {
    setFocused(false);
    commitValue(draft());
    setDraft(draft().trim());
  };

  return (
    <div class="space-y-1.5 py-1">
      <TextField value={draft()} onChange={handleChange}>
        <TextFieldLabel class="text-xs text-muted-foreground">{props.label}</TextFieldLabel>
        <TextFieldInput
          type="text"
          class="h-8 px-2 py-1"
          placeholder={props.placeholder ?? ""}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </TextField>
    </div>
  );
}
