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
import { Loading as Suspense } from "solid-js";
import { useFormAttributesProvider } from "./form-attribute-context";
import { Label } from "./label";
import { ChevronsUpDown } from "../icons.index";

type SelectProps<T> = {
  options: T[];
  value: T | undefined;
  optionValue?: keyof T;
  optionTextValue?: keyof T;
  placeholder?: string;
  onChange?: (value: T | null) => void;
  onInput?: (value: string) => void;
  required?: boolean;
  label?: string;
  error?: string;
  class?: string;
  controlClass?: string;
  readOnly?: boolean;
  disabled?: boolean;
  extraButton?: () => JSX.Element;
  native?: boolean;
};

// Special type for the extra button option
type ExtraButtonOption = {
  isExtraButton: true;
  id: string;
};

function getDisplayValue<T>(item: T, optionTextValue?: keyof T): string {
  if (optionTextValue && item) {
    return item[optionTextValue] as string;
  }
  return item as string;
}

export function SelectWrapper<T>(props: SelectProps<T>) {
  const extraProps = useFormAttributesProvider();
  const isReadOnly = props.readOnly || (extraProps?.props && extraProps.props.readOnly);

  const displaySelectedValues = () => {
    if (!props.value) return props.placeholder || "";
    return getDisplayValue(props.value as T, props.optionTextValue);
  };

  // Create combined options with extra button
  const combinedOptions = () => {
    const baseOptions = [...props.options];
    if (props.extraButton) {
      baseOptions.push({
        isExtraButton: true,
        id: "extra-button",
      } as unknown as T);
    }
    return baseOptions;
  };

  return (
    <div class={cn("grid w-full items-center gap-1.5", props.class)}>
      <Label required={props.required}>{props.label}</Label>
      <Suspense fallback={<Skeleton height={36} radius={4} />}>
        {isReadOnly ? (
          <div
            class={cn(
              "flex h-9 rounded-md border border-input bg-muted px-3 py-2 text-xs text-muted-foreground",
            )}
          >
            {displaySelectedValues()}
          </div>
        ) : props.native ? (
          <div class={cn("relative", props.controlClass)}>
            <select
              class={cn(
                "flex h-9 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                props.readOnly && "opacity-50 pointer-events-none",
              )}
              disabled={props.disabled}
              value={
                props.value
                  ? props.optionValue
                    ? (props.value as any)[props.optionValue]
                    : (props.value as unknown as string)
                  : ""
              }
              onChange={(e: Event) => {
                const target = e.currentTarget as HTMLSelectElement;
                const selected = target?.value ?? "";
                if (!selected) {
                  props.onChange?.(null);
                  return;
                }
                const found = props.options.find((opt) => {
                  const ov = props.optionValue
                    ? ((opt as Record<string, unknown>)[
                        props.optionValue as string
                      ] as unknown as string)
                    : (opt as unknown as string);
                  return String(ov) === selected;
                });
                props.onChange?.(found ?? null);
              }}
            >
              {props.placeholder && (
                <option value="" hidden disabled>
                  {props.placeholder}
                </option>
              )}
              {props.options.map((opt) => {
                const value = props.optionValue
                  ? ((opt as Record<string, unknown>)[
                      props.optionValue as string
                    ] as unknown as string)
                  : (opt as unknown as string);
                const label = props.optionTextValue
                  ? ((opt as Record<string, unknown>)[
                      props.optionTextValue as string
                    ] as unknown as string)
                  : (opt as unknown as string);
                return <option value={String(value)}>{String(label)}</option>;
              })}
            </select>
            <div class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              <ChevronsUpDown class="size-4" />
            </div>
          </div>
        ) : (
          <Combobox<T>
            options={combinedOptions()}
            optionValue={props.optionValue}
            optionTextValue={props.optionTextValue}
            value={props.value}
            placeholder={props.placeholder ?? props.label}
            optionLabel={props.optionTextValue}
            disabled={props.disabled}
            onChange={(value: T | null) => {
              if ((value as unknown as ExtraButtonOption)?.isExtraButton) {
                props.extraButton?.();
                return;
              }
              props.onChange?.(value);
            }}
            defaultFilter={(option: T, inputValue: string) => {
              // Always show extra button
              if ((option as unknown as ExtraButtonOption)?.isExtraButton) {
                return true;
              }
              // For regular options, use the default filtering
              const displayValue = getDisplayValue<T>(option as T, props.optionTextValue);
              return displayValue.toLowerCase().includes(inputValue.toLowerCase());
            }}
            itemComponent={(p: any) => {
              const isExtraButton = (p.item.rawValue as unknown as ExtraButtonOption)
                ?.isExtraButton;
              if (isExtraButton) {
                return <div class="flex flex-col gap-2 border-t">{props.extraButton!()}</div>;
              }
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
            sectionComponent={(p: any) => (
              <ComboboxSection>
                {props.optionTextValue
                  ? p.section.rawValue[props.optionTextValue]
                  : p.section.rawValue}
              </ComboboxSection>
            )}
          >
            <ComboboxControl
              class={cn(
                props.controlClass,
                "relative flex items-center",
                props.readOnly && "opacity-50 pointer-events-none",
              )}
            >
              <div class={cn("flex flex-row flex-wrap items-center py-1 pl-2 pr-8 gap-1 w-full")}>
                <ComboboxInput
                  onInput={(e) => {
                    if (!props.onInput) return;
                    props.onInput((e.target as HTMLInputElement).value);
                  }}
                  class="flex-1 min-w-[40px] h-full outline-none bg-transparent"
                />
              </div>
              <ComboboxTrigger class="absolute right-2 top-1/2 -translate-y-1/2" />
            </ComboboxControl>
            <ComboboxContent class="w-full max-h-40 overflow-y-auto" />
          </Combobox>
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
