import type { ComponentProps, JSX } from "@solidjs/web";
import { createContext, createSignal, Show, useContext } from "solid-js";
import { cn } from "../cn.ts";
import { CalendarDays, ChevronLeft, ChevronRight } from "../icons.index";
import { splitProps } from "../utils/split-props";
import { buttonVariants } from "./button.tsx";

type DatePickerContextValue = {
  value: () => string;
  setValue: (value: string) => void;
  open: () => void;
  input?: HTMLInputElement;
  setInput: (input: HTMLInputElement) => void;
  disabled?: boolean;
};

const NativeDatePickerContext = createContext<DatePickerContextValue>();

function useDatePickerContext() {
  return useContext(NativeDatePickerContext);
}

export type DatePickerProps = ComponentProps<"div"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
};

const DatePicker = (props: DatePickerProps) => {
  const [local, rest] = splitProps(props, [
    "value",
    "defaultValue",
    "onValueChange",
    "disabled",
    "class",
    "children",
  ]);
  const [internalValue, setInternalValue] = createSignal(local.defaultValue ?? "");
  const value = () => local.value ?? internalValue();
  let input: HTMLInputElement | undefined;
  const context: DatePickerContextValue = {
    value,
    setValue: (next) => {
      setInternalValue(next);
      local.onValueChange?.(next);
    },
    open: () => input?.showPicker?.() ?? input?.focus(),
    get input() {
      return input;
    },
    setInput: (next) => {
      input = next;
    },
    disabled: local.disabled,
  };

  return (
    <NativeDatePickerContext value={context}>
      <div class={cn("inline-flex flex-col gap-1.5", local.class)} {...rest}>
        {local.children}
      </div>
    </NativeDatePickerContext>
  );
};

const DatePickerLabel = (props: ComponentProps<"label">) => {
  const [local, rest] = splitProps(props, ["class"]);
  return <label class={cn("text-sm font-medium leading-none", local.class)} {...rest} />;
};

const DatePickerContext = (props: {
  children: (context: DatePickerContextValue) => JSX.Element;
}) => {
  const context = useDatePickerContext();
  return context ? props.children(context) : null;
};

const DatePickerRootProvider = (props: ComponentProps<"div">) => {
  const [local, rest] = splitProps(props, ["class"]);
  return <div class={cn("inline-flex flex-col gap-1.5", local.class)} {...rest} />;
};

const DatePickerControl = (props: ComponentProps<"div">) => {
  const [local, rest] = splitProps(props, ["class"]);
  return <div class={cn("inline-flex items-center gap-1", local.class)} {...rest} />;
};

const DatePickerInput = (props: ComponentProps<"input">) => {
  const context = useDatePickerContext();
  const [local, rest] = splitProps(props, ["class", "onInput", "value"]);
  return (
    <input
      ref={(input) => context?.setInput(input)}
      type="date"
      value={(local.value as string | undefined) ?? context?.value() ?? ""}
      disabled={context?.disabled || rest.disabled}
      class={cn(
        "h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-xs transition-shadow placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-[1.5px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      onInput={(event) => {
        context?.setValue(event.currentTarget.value);
        (local.onInput as any)?.(event);
      }}
      {...rest}
    />
  );
};

const DatePickerTrigger = (props: ComponentProps<"button">) => {
  const context = useDatePickerContext();
  const [local, rest] = splitProps(props, ["class", "children", "onClick"]);
  return (
    <button
      type="button"
      class={cn(
        "flex min-h-9 min-w-9 items-center justify-center rounded-md border border-border bg-background transition-[box-shadow,background-color] hover:bg-accent/50 focus-visible:outline-hidden focus-visible:ring-[1.5px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:size-4",
        local.class,
      )}
      disabled={context?.disabled || rest.disabled}
      onClick={(event) => {
        (local.onClick as any)?.(event);
        if (!event.defaultPrevented) context?.open();
      }}
      {...rest}
    >
      <Show when={local.children} fallback={<CalendarDays aria-hidden="true" class="size-4" />}>
        {local.children}
      </Show>
    </button>
  );
};

type DatePickerContentProps = ComponentProps<"div"> & {
  disableAnimation?: boolean;
};

const DatePickerContent = (props: DatePickerContentProps) => {
  const [local, rest] = splitProps(props, ["class", "disableAnimation"]);
  return (
    <div
      class={cn(
        "z-50 rounded-md border bg-popover p-3 text-popover-foreground shadow-md outline-hidden",
        local.class,
      )}
      {...rest}
    />
  );
};

const DatePickerView = (props: ComponentProps<"div">) => {
  const [local, rest] = splitProps(props, ["class"]);
  return <div class={cn("space-y-4", local.class)} {...rest} />;
};

const DatePickerViewControl = (props: ComponentProps<"div">) => {
  const [local, rest] = splitProps(props, ["class"]);
  return <div class={cn("flex items-center justify-between gap-4", local.class)} {...rest} />;
};

const DatePickerPrevTrigger = (props: ComponentProps<"button">) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <button
      type="button"
      class={cn(
        buttonVariants({ variant: "outline" }),
        "size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        local.class,
      )}
      {...rest}
    >
      <Show when={local.children} fallback={<ChevronLeft aria-hidden="true" class="size-4" />}>
        {local.children}
      </Show>
    </button>
  );
};

const DatePickerNextTrigger = (props: ComponentProps<"button">) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <button
      type="button"
      class={cn(
        buttonVariants({ variant: "outline" }),
        "size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        local.class,
      )}
      {...rest}
    >
      <Show when={local.children} fallback={<ChevronRight aria-hidden="true" class="size-4" />}>
        {local.children}
      </Show>
    </button>
  );
};

const DatePickerViewTrigger = (props: ComponentProps<"button">) => {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <button
      type="button"
      class={cn(buttonVariants({ variant: "ghost" }), "h-7", local.class)}
      {...rest}
    />
  );
};

const DatePickerRangeText = (props: ComponentProps<"span">) => {
  const context = useDatePickerContext();
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <span class={cn("text-sm font-medium", local.class)} {...rest}>
      {local.children ?? context?.value()}
    </span>
  );
};

const passthrough =
  <T extends keyof JSX.IntrinsicElements>(tag: T, className: string) =>
  (props: JSX.IntrinsicElements[T]) => {
    const [local, rest] = splitProps(props as Record<string, unknown>, ["class"]);
    const Tag = tag as any;
    return <Tag class={cn(className, local.class as string | undefined)} {...rest} />;
  };

const DatePickerTable = passthrough("table", "w-full border-collapse space-y-1");
const DatePickerTableHead = passthrough("thead", "");
const DatePickerTableBody = passthrough("tbody", "");
const DatePickerTableRow = passthrough("tr", "mt-2 flex w-full");
const DatePickerTableHeader = passthrough(
  "th",
  "w-8 flex-1 text-[0.8rem] font-normal text-muted-foreground",
);
const DatePickerTableCell = passthrough("td", "flex-1 p-0 text-center text-sm");
const DatePickerTableCellTrigger = passthrough(
  "button",
  cn(buttonVariants({ variant: "ghost" }), "size-8 w-full p-0 font-normal"),
);
const DatePickerYearSelect = passthrough(
  "select",
  "h-8 rounded-md border border-input bg-background px-2 text-sm",
);
const DatePickerMonthSelect = passthrough(
  "select",
  "h-8 rounded-md border border-input bg-background px-2 text-sm",
);
const DatePickerPositioner = passthrough("div", "z-50");

export {
  DatePicker,
  DatePickerContent,
  DatePickerContext,
  DatePickerControl,
  DatePickerInput,
  DatePickerLabel,
  DatePickerMonthSelect,
  DatePickerNextTrigger,
  DatePickerPositioner,
  DatePickerPrevTrigger,
  DatePickerRangeText,
  DatePickerRootProvider,
  DatePickerTable,
  DatePickerTableBody,
  DatePickerTableCell,
  DatePickerTableCellTrigger,
  DatePickerTableHead,
  DatePickerTableHeader,
  DatePickerTableRow,
  DatePickerTrigger,
  DatePickerView,
  DatePickerViewControl,
  DatePickerViewTrigger,
  DatePickerYearSelect,
};
