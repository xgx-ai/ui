import { Check } from "lucide-solid";
import { type Component, For, Show, splitProps } from "solid-js";
import { cn } from "../cn";

export type StepStatus = "pending" | "current" | "completed";

export interface Step {
  id: string;
  title?: string;
  description?: string;
}

type StepperVariant = "dots" | "numbered" | "labeled";
type StepperSize = "sm" | "default" | "lg";

interface StepperBaseProps {
  class?: string;
  variant?: StepperVariant;
  size?: StepperSize;
}

interface StepperWithSteps extends StepperBaseProps {
  steps: Step[];
  currentStep: number;
}

interface StepperSimple extends StepperBaseProps {
  totalSteps: number;
  currentStep: number;
}

type StepperProps = StepperWithSteps | StepperSimple;

const sizeConfig = {
  sm: {
    dot: "size-2",
    indicator: "size-6 text-xs",
    gap: "gap-1.5",
    connectorWidth: "w-8",
    label: "text-xs mt-1.5",
  },
  default: {
    dot: "size-2.5",
    indicator: "size-9 text-sm",
    gap: "gap-2",
    connectorWidth: "w-16",
    label: "text-xs mt-2",
  },
  lg: {
    dot: "size-3",
    indicator: "size-11 text-base",
    gap: "gap-3",
    connectorWidth: "w-20",
    label: "text-sm mt-2.5",
  },
};

function getStepStatus(index: number, currentStep: number): StepStatus {
  if (index < currentStep) return "completed";
  if (index === currentStep) return "current";
  return "pending";
}

/**
 * # Stepper
 *
 * A flexible stepper component for multi-step flows.
 *
 * @example
 * ```tsx
 * // Simple dots
 * <Stepper totalSteps={3} currentStep={1} variant="dots" />
 *
 * // Numbered steps
 * <Stepper totalSteps={4} currentStep={2} variant="numbered" />
 *
 * // Labeled steps
 * <Stepper
 *   steps={[
 *     { id: "type", title: "Type" },
 *     { id: "details", title: "Details" },
 *     { id: "confirm", title: "Confirm" },
 *   ]}
 *   currentStep={1}
 *   variant="labeled"
 * />
 * ```
 */
export const Stepper: Component<StepperProps> = (props) => {
  const [local, others] = splitProps(props, [
    "class",
    "variant",
    "size",
    "currentStep",
  ]);

  const variant = () => local.variant ?? "dots";
  const size = () => local.size ?? "default";
  const config = () => sizeConfig[size()];

  const steps = (): Step[] => {
    if ("steps" in others) {
      return others.steps;
    }
    return Array.from({ length: others.totalSteps }, (_, i) => ({
      id: String(i),
    }));
  };

  return (
    <div class={cn("w-full", local.class)}>
      <div class={cn("flex items-center justify-center", config().gap)}>
        <For each={steps()}>
          {(step, index) => {
            const status = () => getStepStatus(index(), local.currentStep);
            const isLast = () => index() === steps().length - 1;

            return (
              <>
                <Show
                  when={variant() === "dots"}
                  fallback={
                    <div class="flex flex-col items-center">
                      <div
                        class={cn(
                          "flex items-center justify-center rounded-full border-2 font-semibold transition-all",
                          config().indicator,
                          status() === "completed" &&
                            "border-primary bg-primary text-primary-foreground",
                          status() === "current" &&
                            "border-primary bg-transparent text-foreground ring-4 ring-primary/20",
                          status() === "pending" &&
                            "border-muted-foreground/30 bg-transparent text-muted-foreground",
                        )}
                      >
                        <Show
                          when={status() === "completed"}
                          fallback={<span>{index() + 1}</span>}
                        >
                          <Check class="size-4" strokeWidth={3} />
                        </Show>
                      </div>
                      <Show when={variant() === "labeled" && step.title}>
                        <span
                          class={cn(
                            "font-medium text-center max-w-[100px]",
                            config().label,
                            status() === "current" && "text-foreground",
                            status() !== "current" && "text-muted-foreground",
                          )}
                        >
                          {step.title}
                        </span>
                      </Show>
                    </div>
                  }
                >
                  <div
                    class={cn(
                      "rounded-full transition-colors",
                      config().dot,
                      status() === "completed" && "bg-primary/60",
                      status() === "current" && "bg-primary",
                      status() === "pending" && "bg-muted-foreground/30",
                    )}
                  />
                </Show>

                <Show when={!isLast() && variant() !== "dots"}>
                  <div
                    class={cn(
                      "h-0.5 mx-1 transition-colors",
                      config().connectorWidth,
                      variant() === "labeled" && "mt-[-24px]",
                      status() === "completed"
                        ? "bg-primary"
                        : "bg-muted-foreground/20",
                    )}
                  />
                </Show>
              </>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export type { StepperProps };
