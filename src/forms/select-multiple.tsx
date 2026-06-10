import type { JSX } from "@solidjs/web";
import { cn } from "../cn";
import {
  Combobox,
  ComboboxContent,
  ComboboxControl,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxItemLabel,
  ComboboxSection,
  ComboboxTrigger,
} from "./combobox";
import { Skeleton } from "../feedback/skeleton";
import { createMemo, For, Show, Loading as Suspense } from "solid-js";
import { useFormAttributesProvider } from "./form-attribute-context";
import { Label } from "./label";

type SelectProps<T> = {
  options: T[];
  value: T[] | undefined;
  optionValue: keyof T;
  optionTextValue?: keyof T;
  placeholder?: string;
  onChange?: (value: T[] | null) => void;
  onInput?: (value: string) => void;
  required?: boolean;
  label?: string;
  error?: string;
  class?: string;
  readOnly?: boolean;
  extraButton?: () => JSX.Element;
};

// Special type for the extra button option
type ExtraButtonOption = {
  isExtraButton: true;
  id: string; // Needs a unique identifier for the Combobox optionValue
};

function getDisplayValue<T>(item: T, optionTextValue?: keyof T): string {
  // Add check for extra button type
  if ((item as unknown as ExtraButtonOption)?.isExtraButton) {
    return ""; // Extra button doesn't have a display value in the input
  }
  if (optionTextValue && item) {
    return item[optionTextValue] as string;
  }
  return item as string;
}

export default function SelectMultiple<T>(props: SelectProps<T>) {
  const extraProps = useFormAttributesProvider();
  const isReadOnly = props.readOnly || (extraProps?.props && extraProps.props.readOnly);

  const displaySelectedValues = () => {
    if (!props.value) return props.placeholder || "";

    if (Array.isArray(props.value)) {
      return props.value.map((item) => getDisplayValue(item, props.optionTextValue)).join(", ");
    } else {
      return getDisplayValue(props.value as T, props.optionTextValue);
    }
  };

  const MultipleSelect = () => {
    // Create combined options with extra button
    const combinedOptions = createMemo(() => {
      const baseOptions = [...props.options];
      if (props.extraButton) {
        // Add the extra button option with a unique ID
        baseOptions.push({
          isExtraButton: true,
          [props.optionValue]: "extra-button-option",
        } as unknown as T);
      }
      return baseOptions;
    });

    return (
      <Combobox<T>
        multiple={true}
        // Use combined options
        options={combinedOptions()}
        // Use actualOptionValue which defaults to 'id' if needed
        optionValue={props.optionValue}
        optionTextValue={props.optionTextValue}
        value={props.value}
        placeholder={props.placeholder}
        optionLabel={props.optionTextValue}
        // Modified onChange handler
        onChange={(value: T[] | null) => {
          if (!value) {
            props.onChange?.(null);
            return;
          }
          const extraButtonOption = value.find(
            (val) => (val as unknown as ExtraButtonOption)?.isExtraButton,
          );
          if (extraButtonOption) {
            // Trigger the button action
            props.extraButton?.();
            // Filter out the extra button from the final value
            const newValue = value.filter(
              (val) => !(val as unknown as ExtraButtonOption)?.isExtraButton,
            );
            props.onChange?.(newValue.length ? newValue : null);
          } else {
            props.onChange?.(value);
          }
        }}
        // Modified itemComponent
        itemComponent={(p: any) => {
          const isExtraButton = (p.item.rawValue as unknown as ExtraButtonOption)?.isExtraButton;
          if (isExtraButton) {
            // Render the extra button directly
            return <div class="p-2 border-t">{props.extraButton!()}</div>;
          }
          // Render normal item
          return (
            <ComboboxItem item={p.item}>
              <ComboboxItemLabel>
                {props.optionTextValue
                  ? (p.item.rawValue[props.optionTextValue] as string)
                  : (p.item.rawValue as string)}
              </ComboboxItemLabel>
              <ComboboxItemIndicator />
            </ComboboxItem>
          );
        }}
        // Add filter to always show extra button
        defaultFilter={(option: T, inputValue: string) => {
          // Always show extra button
          const isExtraButton = (option as unknown as ExtraButtonOption)?.isExtraButton;
          if (isExtraButton) {
            return true;
          }
          // For regular options, use the default filtering
          const displayValue = getDisplayValue(option, props.optionTextValue);
          return displayValue.toLowerCase().includes(inputValue.toLowerCase());
        }}
        sectionComponent={(p: any) => (
          <ComboboxSection>
            {props.optionTextValue ? p.section.rawValue[props.optionTextValue] : p.section.rawValue}
          </ComboboxSection>
        )}
      >
        <ComboboxControl
          class={cn(
            props.class,
            "relative flex items-center",
            props.readOnly && "opacity-50 pointer-events-none",
          )}
        >
          <div
            class={cn("flex flex-row flex-wrap items-center pl-2 pr-8 gap-1 w-full min-h-9 py-0")}
          >
            <Show when={Array.isArray(props.value) && props.value.length > 0}>
              <For each={props.value as T[]}>
                {(item) => (
                  <span class="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {getDisplayValue(item, props.optionTextValue)}
                    <button
                      type="button"
                      class="ml-1 cursor-pointer text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (Array.isArray(props.value)) {
                          const newValue = (props.value as T[]).filter(
                            (val) => val[props.optionValue] !== item[props.optionValue],
                          );
                          props.onChange?.(newValue.length ? newValue : null);
                        }
                      }}
                    >
                      x
                    </button>
                  </span>
                )}
              </For>
            </Show>
            <ComboboxInput
              onInput={(e) => {
                if (!props.onInput) return;
                // Fix linter error by casting target
                props.onInput((e.target as HTMLInputElement).value);
              }}
              class="flex-1 min-w-[40px] h-full outline-none bg-transparent"
            />
          </div>
          <ComboboxTrigger class="absolute right-2 top-1/2 -translate-y-1/2" />
        </ComboboxControl>
        <ComboboxContent></ComboboxContent>
      </Combobox>
    );
  };

  return (
    <div class="grid w-full items-center gap-1.5">
      <Label required={props.required}>{props.label}</Label>
      <Suspense fallback={<Skeleton height={36} radius={4} />}>
        {isReadOnly ? (
          <div
            class={cn(
              "flex h-9 rounded-md border border-input bg-muted px-3 py-2 text-xs text-muted-foreground",
              props.class,
            )}
          >
            {displaySelectedValues()}
          </div>
        ) : (
          <MultipleSelect />
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
