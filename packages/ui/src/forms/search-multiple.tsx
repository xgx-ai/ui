import type { JSX } from "@solidjs/web";
import { cn } from "../cn";
import { ComboboxTrigger } from "./combobox";
import {
  Search,
  SearchContent,
  SearchControl,
  SearchInput,
  SearchItem,
  SearchItemLabel,
  SearchListbox,
  SearchNoResult,
  SearchSection,
} from "./search";
import { Skeleton } from "../feedback/skeleton";
import { For, Show, Loading as Suspense } from "solid-js";
import { Label } from "./label";

type SearchProps<T> = {
  options: T[];
  value: T[] | undefined;
  optionValue: keyof T;
  optionTextValue: keyof T;
  placeholder?: string;
  onChange?: (value: T[] | null) => void;
  onInputChange?: (value: string) => void;
  inputValue?: string;
  required?: boolean;
  label?: string;
  error?: string;
  class?: string;
  readOnly?: boolean;
  extraButton?: () => JSX.Element;
  debounceOptionsMillisecond?: number;
  isLoading?: boolean;
  noResultText?: string;
  onAdd?: (value: T[]) => void;
  onRemove?: (value: T) => void;
  removeOnBackspace?: boolean;
};

function getDisplayValue<T>(item: T, optionTextValue: keyof T): string {
  if (optionTextValue && item) {
    return item[optionTextValue] as string;
  }
  return String(item) || "";
}

export default function SearchMultiple<T>(props: SearchProps<T>) {
  const displaySelectedValues = () => {
    if (!props.value) return props.placeholder || "";

    if (Array.isArray(props.value)) {
      return props.value.map((item) => getDisplayValue(item, props.optionTextValue)).join(", ");
    } else {
      return getDisplayValue(props.value as T, props.optionTextValue);
    }
  };

  let inputEl: HTMLInputElement | null = null;

  return (
    <div class="grid  items-center gap-1.5">
      <Label required={props.required}>{props.label}</Label>
      <Suspense fallback={<Skeleton height={36} radius={4} />}>
        {props.readOnly ? (
          <div
            class={cn(
              "flex h-9 rounded-md border border-input bg-muted px-3 py-2 text-xs text-muted-foreground",
              props.class,
            )}
          >
            {displaySelectedValues()}
          </div>
        ) : (
          <Search<T>
            triggerMode="focus"
            multiple={true}
            removeOnBackspace={props.removeOnBackspace}
            options={props.options}
            optionValue={props.optionValue}
            optionTextValue={props.optionTextValue}
            value={props.value}
            placeholder={props.placeholder}
            optionLabel={props.optionTextValue}
            onChange={(e) => {
              props.onChange?.(e);
              if (e) {
                props.onAdd?.(e);
                if (inputEl) {
                  inputEl.value = "";
                  props.onInputChange?.("");
                }
              }
            }}
            onInputChange={props.onInputChange}
            debounceOptionsMillisecond={props.debounceOptionsMillisecond}
            itemComponent={(p: any) => {
              return (
                <SearchItem item={p.item}>
                  <SearchItemLabel>
                    {p.item.rawValue[props.optionTextValue] as string}
                  </SearchItemLabel>
                </SearchItem>
              );
            }}
            sectionComponent={(p: any) => (
              <SearchSection>{p.section.rawValue[props.optionTextValue]}</SearchSection>
            )}
          >
            <SearchControl
              class={cn(
                "relative flex min-h-8.5 flex-wrap items-center border-border-subtle bg-background text-[11px]",
                props.class,
                props.readOnly && "opacity-50 pointer-events-none",
              )}
            >
              <div class={cn("flex flex-row flex-wrap items-center pr-10 gap-1 w-full")}>
                <Show when={Array.isArray(props.value) && props.value.length > 0}>
                  <For each={props.value as T[]}>
                    {(item) => (
                      <span class="flex items-center gap-1 whitespace-nowrap rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {getDisplayValue(item, props.optionTextValue)}
                        <button
                          type="button"
                          class="ml-1 cursor-pointer text-muted-foreground hover:text-foreground focus:outline-none"
                          onClick={() => {
                            props.onRemove?.(item);
                          }}
                        >
                          x
                        </button>
                      </span>
                    )}
                  </For>
                </Show>

                <SearchInput
                  class="flex-1 min-w-[60px] h-full outline-none bg-transparent py-2 text-[11px]"
                  ref={(el) => (inputEl = el)}
                />
                <ComboboxTrigger class="absolute right-2 top-1/2 -translate-y-1/2" />
              </div>
            </SearchControl>

            <SearchContent onCloseAutoFocus={(e) => e.preventDefault()}>
              <SearchListbox />
              <SearchNoResult>{props.noResultText || "No results found."}</SearchNoResult>
              <Show when={props.extraButton}>
                <div class="p-2 border-t mt-1">{props.extraButton!()}</div>
              </Show>
            </SearchContent>
          </Search>
        )}
      </Suspense>
      <div
        class={cn(
          "transition-all opacity-0 h-0 duration-300 ease-in-out text-xs text-error",
          props.error && "opacity-100 h-4 ",
        )}
      >
        {props.error}
      </div>
    </div>
  );
}
