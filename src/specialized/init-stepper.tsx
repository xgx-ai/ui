import { Check } from "lucide-solid";
import { type Component, For, splitProps } from "solid-js";
import { cn } from "../cn";

/**
 * Status of an initialization step
 */
export type InitStepStatus = "pending" | "current" | "completed";

/**
 * A single initialization step
 */
export interface InitStep {
  id: string;
  title: string;
  description?: string;
  status: InitStepStatus;
}

/**
 * # Init Stepper
 *
 * Horizontal stepper component for displaying project initialization progress.
 *
 * @example
 * ```
 * <InitStepper
 *   steps={[
 *     { id: "describe", title: "Describe Project", status: "completed" },
 *     { id: "configure", title: "Configure", status: "current" },
 *     { id: "create", title: "Create", status: "pending" },
 *   ]}
 * />
 * ```
 */

interface InitStepperProps {
  steps: InitStep[];
  class?: string;
}

export const InitStepper: Component<InitStepperProps> = (props) => {
  const [local] = splitProps(props, ["steps", "class"]);

  return (
    <div class={cn("w-full", local.class)}>
      <div class="flex items-center justify-center">
        <For each={local.steps}>
          {(step, index) => (
            <>
              {/* Step indicator */}
              <div class="flex flex-col items-center min-w-[80px]">
                <div
                  class={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                    step.status === "completed" &&
                      "border-secondary bg-secondary text-secondary-foreground",
                    step.status === "current" &&
                      "border-secondary bg-transparent text-foreground ring-4 ring-secondary/20",
                    step.status === "pending" &&
                      "border-foreground/20 bg-transparent text-muted-foreground",
                  )}
                >
                  {step.status === "completed" ? (
                    <Check class="h-5 w-5" strokeWidth={3} />
                  ) : (
                    <span>{index() + 1}</span>
                  )}
                </div>
                <span
                  class={cn(
                    "mt-2 text-xs font-medium max-w-[100px] text-center",
                    step.status === "completed" && "text-foreground",
                    step.status === "current" &&
                      "text-foreground font-semibold",
                    step.status === "pending" && "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
              </div>

              {/* Connector line (not after last step) */}
              {index() < local.steps.length - 1 && (
                <div
                  class={cn(
                    "h-0.5 w-16 mx-1 mt-[-20px] transition-colors",
                    step.status === "completed"
                      ? "bg-secondary"
                      : "bg-foreground/20",
                  )}
                />
              )}
            </>
          )}
        </For>
      </div>
    </div>
  );
};

export type { InitStepperProps };
