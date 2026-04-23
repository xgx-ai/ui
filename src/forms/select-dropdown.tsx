import { cn } from "../cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Skeleton } from "../feedback/skeleton";
import { createMemo, Show, Suspense } from "solid-js";
import { Label } from "./label";

type Option = {
  value: string;
  label: string;
};

export type DropdownOption = Option;

export type DropdownProps = {
  options: Option[];
  value: Option | Option[] | undefined;
  placeholder?: string;
  onChange?: (value: Option | Option[] | null) => void;
  onInput?: (value: string) => void;
  required?: boolean;
  label?: string;
  error?: string;
  class?: string;
  controlClass?: string;
  readOnly?: boolean;
  disabled?: boolean;
  multiple?: boolean;
};

interface SelectOption {
  value: string;
  label: string;
  original: Option;
}

export function SelectDropdown(props: DropdownProps) {
  const displaySelectedValues = () => {
    if (!props.value) return props.placeholder || "";

    if (props.multiple && Array.isArray(props.value)) {
      return (props.value as Option[]).map((val) => val.label).join(", ");
    }

    return (props.value as Option).label;
  };

  // Convert options to a format the underlying Select can understand
  const selectOptions = createMemo((): SelectOption[] =>
    props.options.map((option) => ({
      value: option.value,
      label: option.label,
      original: option,
    })),
  );

  // Convert current value to format expected by the underlying Select component
  const selectValue = createMemo(() => {
    if (!props.value) return props.multiple ? [] : undefined;
    if (props.multiple && Array.isArray(props.value)) {
      return (props.value as Option[])
        .map((val) => selectOptions().find((opt) => opt.value === val.value))
        .filter((opt): opt is SelectOption => opt !== undefined);
    }

    return selectOptions().find(
      (opt) => opt.value === (props.value as Option).value,
    );
  });

  const handleChange = (
    selectedValue: SelectOption | SelectOption[] | null,
  ) => {
    if (!selectedValue) {
      props.onChange?.(null);
      return;
    }

    if (props.multiple && Array.isArray(selectedValue)) {
      const originalValues = selectedValue.map((item) => item.original);
      props.onChange?.(originalValues);
      return;
    }

    const singleValue = selectedValue as SelectOption;
    props.onChange?.(singleValue.original);
  };

  function MultipleSelect() {
    return (
      <Select<SelectOption>
        class="overflow-hidden text-xs"
        options={selectOptions()}
        optionValue="value"
        optionTextValue="label"
        value={selectValue() as SelectOption[] | undefined}
        placeholder={props.placeholder ?? props.label}
        disabled={props.disabled}
        multiple
        onChange={handleChange}
        itemComponent={(p) => (
          <SelectItem item={p.item}>{p.item.rawValue.label}</SelectItem>
        )}
      >
        <SelectTrigger class="w-full">
          <SelectValue<SelectOption>>
            {(state) => {
              const items = state.selectedOptions() || [];
              return (
                <div class="flex w-full items-center justify-between gap-2 overflow-hidden h-full relative">
                  <div class="flex flex-wrap gap-1 overflow-y-auto overflow-x-hidden pr-1">
                    {items.map((option) => (
                      <span
                        class="bg-gray-100 rounded px-2 py-0.5 text-xs flex items-center gap-1 shrink-0"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {option?.label}
                        <button
                          type="button"
                          class="text-muted-foreground hover:text-foreground ml-1"
                          onClick={() => state.remove?.(option)}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                  {items.length > 0 && (
                    <button
                      type="button"
                      class="text-muted-foreground hover:text-foreground text-xs"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => state.clear?.()}
                    >
                      Clear
                    </button>
                  )}
                </div>
              );
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    );
  }

  function SingleSelect() {
    return (
      <Select<SelectOption>
        options={selectOptions()}
        class="text-xs"
        optionValue="value"
        optionTextValue="label"
        value={selectValue() as SelectOption | undefined}
        placeholder={props.placeholder ?? props.label}
        disabled={props.disabled}
        multiple={false}
        onChange={handleChange}
        itemComponent={(p) => (
          <SelectItem item={p.item}>{p.item.rawValue.label}</SelectItem>
        )}
      >
        <SelectTrigger class="w-full">
          <SelectValue<SelectOption>>
            {(state) => state.selectedOption()?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    );
  }

  return (
    <div class={cn("grid w-full items-center gap-1.5", props.class)}>
      <Label required={props.required}>{props.label}</Label>
      <Suspense fallback={<Skeleton height={36} radius={4} />}>
        {props.readOnly ? (
          <div
            class={cn(
              "flex h-9 rounded-md border border-input bg-gray-50 px-3 py-2 text-xs",
            )}
          >
            {displaySelectedValues()}
          </div>
        ) : (
          <Show when={props.multiple} fallback={<SingleSelect />}>
            <MultipleSelect />
          </Show>
        )}
      </Suspense>
      <div
        class={cn(
          "transition-all opacity-0 h-0 duration-300 ease-in-out text-xs text-destructive",
          props.error && "opacity-100 h-4 ",
        )}
      >
        {props.error}
      </div>
    </div>
  );
}
