import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as ProgressPrimitive from "@kobalte/core/progress";
import type { Component, JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { Label } from "../forms/label.tsx";

type ProgressRootProps<T extends ValidComponent = "div"> =
  ProgressPrimitive.ProgressRootProps<T> & { children?: JSX.Element };

const Progress = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ProgressRootProps<T>>,
) => {
  const [local, others] = splitProps(props as ProgressRootProps, ["children"]);
  return (
    <ProgressPrimitive.Root {...others}>
      {local.children}
      <ProgressPrimitive.Track class="relative h-1 w-full overflow-hidden rounded-full bg-muted">
        <ProgressPrimitive.Fill class="h-full w-[var(--kb-progress-fill-width)] flex-1 bg-primary transition-all" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
};

const ProgressLabel: Component<ProgressPrimitive.ProgressLabelProps> = (
  props,
) => {
  return <ProgressPrimitive.Label as={Label} {...props} />;
};

const ProgressValueLabel: Component<
  ProgressPrimitive.ProgressValueLabelProps
> = (props) => {
  return <ProgressPrimitive.ValueLabel as={Label} {...props} />;
};

/**
 * # Progress
 *
 * Progress bar with label and value display.
 *
 * @example
 * ```
 * <div class="space-y-6 max-w-sm">
 *   <Progress value={30}>
 *     <div class="flex justify-between mb-2">
 *       <ProgressLabel>Loading...</ProgressLabel>
 *       <ProgressValueLabel />
 *     </div>
 *   </Progress>
 *   <Progress value={60}>
 *     <div class="flex justify-between mb-2">
 *       <ProgressLabel>Uploading</ProgressLabel>
 *       <ProgressValueLabel />
 *     </div>
 *   </Progress>
 *   <Progress value={100}>
 *     <div class="flex justify-between mb-2">
 *       <ProgressLabel>Complete</ProgressLabel>
 *       <ProgressValueLabel />
 *     </div>
 *   </Progress>
 * </div>
 * ```
 */
export { Progress, ProgressLabel, ProgressValueLabel };
