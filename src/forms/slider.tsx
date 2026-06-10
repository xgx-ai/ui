import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import { createContext, createSignal, useContext } from "solid-js";

import { cn } from "../cn";
import { splitProps } from "../utils/split-props";

type SliderContextValue = {
  disabled: () => boolean;
  max: () => number;
  min: () => number;
  percent: () => number;
  setValue: (value: number) => void;
  step: () => number;
  value: () => number;
};

const SliderContext = createContext<SliderContextValue>();

function useSliderContextValue() {
  const context = useContext(SliderContext);
  if (!context) {
    throw new Error("Slider parts must be used inside Slider.");
  }
  return context;
}

type SliderRootProps<T extends ValidComponent = "div"> = Omit<
  ComponentProps<"div">,
  "children" | "defaultValue" | "onChange"
> & {
  as?: T;
  class?: string | undefined;
  children?: JSX.Element;
  defaultValue?: number | number[];
  disabled?: boolean;
  maxValue?: number;
  minValue?: number;
  onChange?: (value: number[]) => void;
  step?: number;
  value?: number | number[];
};

const firstValue = (value: number | number[] | undefined, fallback: number) =>
  Array.isArray(value) ? (value[0] ?? fallback) : (value ?? fallback);

const Slider = <T extends ValidComponent = "div">(props: SliderRootProps<T>) => {
  const [local, others] = splitProps(props, [
    "as",
    "class",
    "children",
    "defaultValue",
    "disabled",
    "maxValue",
    "minValue",
    "onChange",
    "step",
    "value",
  ]);
  const min = () => local.minValue ?? 0;
  const max = () => local.maxValue ?? 100;
  const step = () => local.step ?? 1;
  const [internalValue, setInternalValue] = createSignal(firstValue(local.defaultValue, min()));
  const value = () => firstValue(local.value, internalValue());
  const setValue = (next: number) => {
    const clamped = Math.min(max(), Math.max(min(), next));
    setInternalValue(clamped);
    local.onChange?.([clamped]);
  };
  const percent = () => {
    const range = max() - min();
    if (range <= 0) return 0;
    return ((value() - min()) / range) * 100;
  };

  return (
    <SliderContext
      value={{
        disabled: () => local.disabled === true,
        max,
        min,
        percent,
        setValue,
        step,
        value,
      }}
    >
      <Dynamic
        component={local.as ?? "div"}
        data-disabled={local.disabled ? "" : undefined}
        class={cn("relative flex w-full touch-none select-none flex-col", local.class)}
        {...others}
      >
        {local.children}
      </Dynamic>
    </SliderContext>
  );
};

type SliderTrackProps<T extends ValidComponent = "div"> = ComponentProps<"div"> & {
  as?: T;
  class?: string | undefined;
  children?: JSX.Element;
};

const SliderTrack = <T extends ValidComponent = "div">(props: SliderTrackProps<T>) => {
  const [local, others] = splitProps(props, ["as", "class", "children"]);
  return (
    <Dynamic
      component={local.as ?? "div"}
      class={cn("relative h-2 w-full rounded-full bg-muted", local.class)}
      {...others}
    >
      {local.children}
    </Dynamic>
  );
};

type SliderFillProps<T extends ValidComponent = "div"> = ComponentProps<"div"> & {
  as?: T;
  class?: string | undefined;
};

const SliderFill = <T extends ValidComponent = "div">(props: SliderFillProps<T>) => {
  const context = useSliderContextValue();
  const [local, others] = splitProps(props, ["as", "class", "style"]);
  return (
    <Dynamic
      component={local.as ?? "div"}
      class={cn("absolute h-full rounded-full bg-primary", local.class)}
      style={{
        width: `${context.percent()}%`,
        ...(typeof local.style === "object" ? local.style : undefined),
      }}
      {...others}
    />
  );
};

type SliderThumbProps<T extends ValidComponent = "span"> = ComponentProps<"span"> & {
  as?: T;
  class?: string | undefined;
  children?: JSX.Element;
};

const SliderThumb = <T extends ValidComponent = "span">(props: SliderThumbProps<T>) => {
  const context = useSliderContextValue();
  const [local, others] = splitProps(props, [
    "aria-label",
    "aria-labelledby",
    "as",
    "class",
    "children",
  ]);

  return (
    <>
      <input
        type="range"
        aria-label={local["aria-label"] ?? "Slider value"}
        aria-labelledby={local["aria-labelledby"]}
        min={context.min()}
        max={context.max()}
        step={context.step()}
        value={context.value()}
        disabled={context.disabled()}
        onInput={(event) => context.setValue(Number(event.currentTarget.value))}
        class="absolute inset-x-0 top-1/2 z-20 h-8 w-full -translate-y-1/2 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <Dynamic
        component={local.as ?? "span"}
        class={cn(
          "absolute top-1/2 z-10 block size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          local.class,
        )}
        style={{ left: `${context.percent()}%` }}
        {...others}
      >
        {local.children}
      </Dynamic>
    </>
  );
};

const SliderLabel = <T extends ValidComponent = "label">(
  props: ComponentProps<"label"> & { as?: T; class?: string },
) => {
  const [local, others] = splitProps(props, ["as", "class", "children"]);
  return (
    <Dynamic
      component={local.as ?? "label"}
      class={cn(
        "text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </Dynamic>
  );
};

const SliderValueLabel = <T extends ValidComponent = "label">(
  props: ComponentProps<"label"> & { as?: T; class?: string },
) => {
  const context = useSliderContextValue();
  const [local, others] = splitProps(props, ["as", "class", "children"]);
  return (
    <Dynamic
      component={local.as ?? "label"}
      class={cn(
        "text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        local.class,
      )}
      {...others}
    >
      {local.children ?? context.value()}
    </Dynamic>
  );
};

export { Slider, SliderFill, SliderLabel, SliderThumb, SliderTrack, SliderValueLabel };
