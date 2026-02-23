import * as CheckboxPrimitive from "@kobalte/core/checkbox";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ValidComponent } from "solid-js";
import { Match, Switch, splitProps } from "solid-js";

import { cn } from "../cn";

type CheckboxRootProps<T extends ValidComponent = "div"> =
  CheckboxPrimitive.CheckboxRootProps<T> & {
    class?: string | undefined;
    size?: "sm" | "md" | "lg";
  };

const Checkbox = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, CheckboxRootProps<T>>,
) => {
  const [local, others] = splitProps(props as CheckboxRootProps, [
    "class",
    "size",
  ]);

  const sizeClasses = {
    sm: "size-3.5",
    md: "size-4",
    lg: "size-5",
  };

  const iconSizeClasses = {
    sm: "size-3.5",
    md: "size-4",
    lg: "size-5",
  };

  const size = local.size || "md";

  return (
    <CheckboxPrimitive.Root
      class={cn(
        "items-top group relative flex space-x-2 cursor-pointer",
        local.class,
      )}
      {...others}
    >
      <CheckboxPrimitive.Input class="peer" />
      <CheckboxPrimitive.Control
        class={cn(
          sizeClasses[size],
          "shrink-0  rounded-sm border border-foreground disabled:cursor-not-allowed disabled:opacity-80 data-checked:border-none data-indeterminate:border-none data-checked:bg-primary data-indeterminate:bg-foreground data-checked:text-background data-indeterminate:text-background",
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Switch>
            <Match when={!others.indeterminate}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class={iconSizeClasses[size]}
                aria-hidden="true"
              >
                <path d="M5 12l5 5l10 -10" />
              </svg>
            </Match>
            <Match when={others.indeterminate}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class={iconSizeClasses[size]}
                aria-hidden="true"
              >
                <path d="M5 12l14 0" />
              </svg>
            </Match>
          </Switch>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
    </CheckboxPrimitive.Root>
  );
};

/**
 * # Checkbox
 *
 * A checkbox input with multiple sizes and states.
 *
 * @example
 * ```
 * <div class="space-y-4">
 *   <div class="flex items-center gap-4">
 *     <Checkbox defaultChecked />
 *     <Checkbox />
 *     <Checkbox indeterminate />
 *   </div>
 *   <div class="flex items-center gap-4">
 *     <Checkbox size="sm" defaultChecked />
 *     <Checkbox size="md" defaultChecked />
 *     <Checkbox size="lg" defaultChecked />
 *   </div>
 *   <div class="flex items-center gap-4">
 *     <Checkbox disabled />
 *     <Checkbox disabled defaultChecked />
 *   </div>
 * </div>
 * ```
 */
export { Checkbox };
