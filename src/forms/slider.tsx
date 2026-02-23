import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SliderPrimitive from "@kobalte/core/slider";
import type { JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../cn";
import { Label } from "./label";

type SliderRootProps<T extends ValidComponent = "div"> =
  SliderPrimitive.SliderRootProps<T> & {
    class?: string | undefined;
  };

const Slider = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SliderRootProps<T>>,
) => {
  const [local, others] = splitProps(props as SliderRootProps, ["class"]);
  return (
    <SliderPrimitive.Root
      class={cn(
        "relative flex w-full touch-none select-none flex-col items-center",
        local.class,
      )}
      {...others}
    />
  );
};

type SliderTrackProps<T extends ValidComponent = "div"> =
  SliderPrimitive.SliderTrackProps<T> & {
    class?: string | undefined;
  };

const SliderTrack = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SliderTrackProps<T>>,
) => {
  const [local, others] = splitProps(props as SliderTrackProps, ["class"]);
  return (
    <SliderPrimitive.Track
      class={cn("relative h-2 w-full grow rounded-full bg-muted", local.class)}
      {...others}
    />
  );
};

type SliderFillProps<T extends ValidComponent = "div"> =
  SliderPrimitive.SliderFillProps<T> & {
    class?: string | undefined;
  };

const SliderFill = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SliderFillProps<T>>,
) => {
  const [local, others] = splitProps(props as SliderFillProps, ["class"]);
  return (
    <SliderPrimitive.Fill
      class={cn("absolute h-full rounded-full bg-primary", local.class)}
      {...others}
    />
  );
};

type SliderThumbProps<T extends ValidComponent = "span"> =
  SliderPrimitive.SliderThumbProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const SliderThumb = <T extends ValidComponent = "span">(
  props: PolymorphicProps<T, SliderThumbProps<T>>,
) => {
  const [local, others] = splitProps(props as SliderThumbProps, [
    "class",
    "children",
  ]);
  return (
    <SliderPrimitive.Thumb
      class={cn(
        "top-[-6px] block size-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        local.class,
      )}
      {...others}
    >
      <SliderPrimitive.Input />
    </SliderPrimitive.Thumb>
  );
};

const SliderLabel = <T extends ValidComponent = "label">(
  props: PolymorphicProps<T, SliderPrimitive.SliderLabelProps<T>>,
) => {
  return <SliderPrimitive.Label as={Label} {...props} />;
};

const SliderValueLabel = <T extends ValidComponent = "label">(
  props: PolymorphicProps<T, SliderPrimitive.SliderValueLabelProps<T>>,
) => {
  return <SliderPrimitive.ValueLabel as={Label} {...props} />;
};

/**
 * # Slider
 *
 * A range slider for selecting numeric values.
 *
 * @example
 * ```
 * <div class="space-y-6 max-w-sm">
 *   <Slider defaultValue={[50]} class="w-full">
 *     <div class="flex justify-between mb-2">
 *       <SliderLabel>Volume</SliderLabel>
 *       <SliderValueLabel />
 *     </div>
 *     <SliderTrack>
 *       <SliderFill />
 *       <SliderThumb />
 *     </SliderTrack>
 *   </Slider>
 *   <Slider defaultValue={[25, 75]} class="w-full">
 *     <div class="flex justify-between mb-2">
 *       <SliderLabel>Price Range</SliderLabel>
 *       <SliderValueLabel />
 *     </div>
 *     <SliderTrack>
 *       <SliderFill />
 *       <SliderThumb />
 *       <SliderThumb />
 *     </SliderTrack>
 *   </Slider>
 * </div>
 * ```
 */
export {
  Slider,
  SliderFill,
  SliderLabel,
  SliderThumb,
  SliderTrack,
  SliderValueLabel,
};
