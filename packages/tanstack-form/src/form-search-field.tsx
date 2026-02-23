import {
  cn,
  Search,
  SearchContent,
  SearchControl,
  SearchInput,
  SearchItem,
  SearchItemLabel,
  SearchListbox,
  SearchNoResult,
  Skeleton,
} from "@xgx/ui";
import { createMemo, createSignal, Show, Suspense } from "solid-js";
import { FieldLabel } from "./field-label";
import { useFieldRequired } from "./form-group";
import type { AnyFieldApi, AnyFormApi, BaseFieldProps } from "./types";

export type SearchOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export interface FormSearchFieldProps<T = SearchOption> extends BaseFieldProps {
  /** The form instance */
  form: AnyFormApi;
  /** Field name (must match a key in the form's default values) */
  name: string;
  /** Options for the search - can be a static array or accessor for reactive data */
  options: T[];
  /** Key to use as the value (defaults to "value") */
  optionValue?: keyof T;
  /** Key to use as the label (defaults to "label") */
  optionLabel?: keyof T;
  /** Key to check if option is disabled (defaults to "disabled") */
  optionDisabled?: keyof T;
  /** Whether data is loading (shows skeleton) */
  loading?: boolean;
  /** Text to show when no results found */
  noResultText?: string;
  /** Custom filter function (defaults to case-insensitive label match) */
  filterFn?: (option: T, query: string) => boolean;
  /** Open dropdown on focus (defaults to true for backward compatibility) */
  openOnFocus?: boolean;
}

/**
 * Inner search component that handles filtering.
 * This must be a separate component because it needs to manage its own
 * reactive state for filtered options, which cannot cross Suspense boundaries.
 */
function FormSearchFieldInner<T>(props: {
  options: T[];
  optionValue: keyof T;
  optionLabel: keyof T;
  optionDisabled: keyof T;
  field: AnyFieldApi;
  placeholder?: string;
  disabled?: boolean;
  hasError: boolean;
  noResultText?: string;
  filterFn?: (option: T, query: string) => boolean;
  openOnFocus?: boolean;
}) {
  const [searchQuery, setSearchQuery] = createSignal("");

  // Default filter function: case-insensitive match on the label
  const defaultFilter = (option: T, query: string): boolean => {
    const label = String(option[props.optionLabel]).toLowerCase();
    return label.includes(query.toLowerCase());
  };

  // Filtered options based on search query
  const filteredOptions = createMemo(() => {
    const query = searchQuery();
    if (!query) return props.options;

    const filterFn = props.filterFn ?? defaultFilter;
    return props.options.filter((opt) => filterFn(opt, query));
  });

  // Find selected option from full options list (not filtered)
  const selectedValue = createMemo(() =>
    props.options.find(
      (opt) => String(opt[props.optionValue]) === props.field.state.value,
    ),
  );

  return (
    <Search<T>
      options={filteredOptions()}
      onInputChange={(query) => {
        setSearchQuery(query);
      }}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          props.field.handleBlur();
          // Clear search query when closing to reset for next open
          setSearchQuery("");
        }
      }}
      optionValue={(opt) => String(opt[props.optionValue])}
      optionTextValue={(opt) => String(opt[props.optionLabel])}
      optionLabel={(opt) => String(opt[props.optionLabel])}
      optionDisabled={(opt) => Boolean(opt[props.optionDisabled])}
      placeholder={props.placeholder ?? "Search..."}
      onChange={(option: T | null) => {
        if (option) {
          props.field.handleChange(String(option[props.optionValue]));
        } else {
          props.field.handleChange("");
        }
      }}
      value={selectedValue()}
      disabled={props.disabled}
      triggerMode={props.openOnFocus === false ? "input" : "focus"}
      disallowEmptySelection={false}
      itemComponent={(itemProps) => (
        <SearchItem item={itemProps.item}>
          <SearchItemLabel>
            {String(itemProps.item.rawValue[props.optionLabel])}
          </SearchItemLabel>
        </SearchItem>
      )}
    >
      <SearchControl
        class={cn(
          props.hasError && "border-destructive",
          props.disabled && "bg-muted",
        )}
      >
        <SearchInput onBlur={() => props.field.handleBlur()} />
      </SearchControl>
      <SearchContent>
        <SearchListbox />
        <SearchNoResult>
          {props.noResultText ?? "No results found"}
        </SearchNoResult>
      </SearchContent>
    </Search>
  );
}

/**
 * A searchable select field component integrated with TanStack Form.
 * Uses form.Field for reactive field state binding with built-in loading state.
 *
 * @example
 * ```tsx
 * // With static options
 * <FormSearchField
 *   form={form}
 *   name="council"
 *   label="Council"
 *   options={[
 *     { value: "abc", label: "Council A" },
 *     { value: "def", label: "Council B" },
 *   ]}
 * />
 *
 * // With async data
 * const councilsQuery = trpc.councils.list.query();
 * <FormSearchField
 *   form={form}
 *   name="council"
 *   label="Council"
 *   options={councilsQuery.data?.data ?? []}
 *   optionValue="id"
 *   optionLabel="name"
 *   loading={councilsQuery.isLoading}
 * />
 * ```
 */
export function FormSearchField<T = SearchOption>(
  props: FormSearchFieldProps<T>,
) {
  const isRequired = useFieldRequired(
    () => props.name,
    () => props.required,
  );

  const optionValue = () => (props.optionValue ?? "value") as keyof T;
  const optionLabel = () => (props.optionLabel ?? "label") as keyof T;
  const optionDisabled = () => (props.optionDisabled ?? "disabled") as keyof T;

  return (
    <props.form.Field name={props.name}>
      {(field: () => AnyFieldApi) => {
        const errors = () => field().state.meta.errors;
        const isTouched = () => field().state.meta.isTouched;
        const hasError = () => isTouched() && errors().length > 0;
        const errorMessage = () => (hasError() ? errors()[0] : "");

        return (
          <div class={cn("grid w-full items-center gap-2", props.class)}>
            <Show when={props.label || props.description}>
              <div class="flex flex-col gap-1">
                <Show when={props.label}>
                  <FieldLabel required={isRequired()}>{props.label}</FieldLabel>
                </Show>
                <Show when={props.description}>
                  <p class="text-3xs text-gray-500">{props.description}</p>
                </Show>
              </div>
            </Show>

            <Suspense
              fallback={
                <Skeleton height={36} class="w-full" radius={4} animate />
              }
            >
              <FormSearchFieldInner<T>
                options={props.options}
                optionValue={optionValue()}
                optionLabel={optionLabel()}
                optionDisabled={optionDisabled()}
                field={field()}
                placeholder={props.placeholder ?? props.label}
                disabled={props.disabled}
                hasError={hasError()}
                noResultText={props.noResultText}
                filterFn={props.filterFn}
                openOnFocus={props.openOnFocus}
              />
            </Suspense>

            <div
              class={cn(
                "transition-all opacity-0 h-0 duration-300 ease-in-out text-xs text-destructive",
                hasError() && "opacity-100 h-4",
              )}
            >
              {errorMessage()}
            </div>
          </div>
        );
      }}
    </props.form.Field>
  );
}
