/**
 * # Progress
 *
 * Shows determinate task progress.
 *
 * @example
 * ```tsx
 * <Progress value={72} />
 * ```
 */
import type { ComponentProps, JSX } from "@solidjs/web";
import { createContext, useContext } from "solid-js";
import { Label } from "../forms/label.tsx";
import { splitProps } from "../utils/split-props";

type ProgressProps = ComponentProps<"div"> & {
  children?: JSX.Element;
  getValueLabel?: (value: number, max: number) => string;
  max?: number;
  min?: number;
  value?: number;
};

const ProgressContext = createContext<{
  max: () => number;
  min: () => number;
  value: () => number;
  valueLabel: () => string;
}>({
  max: () => 100,
  min: () => 0,
  value: () => 0,
  valueLabel: () => "0%",
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const Progress = (props: ProgressProps) => {
  const [local, others] = splitProps(props, ["children", "getValueLabel", "max", "min", "value"]);
  const min = () => local.min ?? 0;
  const max = () => local.max ?? 100;
  const value = () => clamp(local.value ?? 0, min(), max());
  const percent = () => (max() === min() ? 0 : ((value() - min()) / (max() - min())) * 100);
  const valueLabel = () => local.getValueLabel?.(value(), max()) ?? `${Math.round(percent())}%`;

  return (
    <ProgressContext value={{ min, max, value, valueLabel }}>
      <div
        role="progressbar"
        aria-valuemin={min()}
        aria-valuemax={max()}
        aria-valuenow={value()}
        aria-valuetext={valueLabel()}
        {...others}
      >
        {local.children}
        <div class="relative h-1 w-full overflow-hidden rounded-full bg-muted">
          <div class="h-full flex-1 bg-primary transition-all" style={{ width: `${percent()}%` }} />
        </div>
      </div>
    </ProgressContext>
  );
};

type ProgressLabelProps = ComponentProps<"label">;

const ProgressLabel = (props: ProgressLabelProps) => <Label {...props} />;

type ProgressValueLabelProps = ComponentProps<"span">;

const ProgressValueLabel = (props: ProgressValueLabelProps) => {
  const context = useContext(ProgressContext);
  const [local, others] = splitProps(props, ["children"]);

  return <span {...others}>{local.children ?? context.valueLabel()}</span>;
};

export { Progress, ProgressLabel, ProgressValueLabel };
export type { ProgressLabelProps, ProgressProps, ProgressValueLabelProps };
