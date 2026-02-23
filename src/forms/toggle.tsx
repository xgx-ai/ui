import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as ToggleButtonPrimitive from "@kobalte/core/toggle-button";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "../cn";

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent shadow-xs",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-8 px-2",
        lg: "h-10 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ToggleButtonRootProps<T extends ValidComponent = "button"> =
  ToggleButtonPrimitive.ToggleButtonRootProps<T> &
    VariantProps<typeof toggleVariants> & { class?: string | undefined };

const Toggle = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, ToggleButtonRootProps<T>>,
) => {
  const [local, others] = splitProps(props as ToggleButtonRootProps, [
    "class",
    "variant",
    "size",
  ]);
  return (
    <ToggleButtonPrimitive.Root
      class={cn(
        toggleVariants({ variant: local.variant, size: local.size }),
        local.class,
      )}
      {...others}
    />
  );
};

/**
 * # Toggle
 *
 * A toggle button with variants and sizes.
 *
 * @example
 * ```
 * <div class="space-y-4">
 *   <div class="flex gap-2">
 *     <Toggle aria-label="Bold">B</Toggle>
 *     <Toggle aria-label="Italic">I</Toggle>
 *     <Toggle aria-label="Underline">U</Toggle>
 *   </div>
 *   <div class="flex gap-2">
 *     <Toggle variant="outline" aria-label="Bold">B</Toggle>
 *     <Toggle variant="outline" aria-label="Italic">I</Toggle>
 *   </div>
 *   <div class="flex gap-2">
 *     <Toggle size="sm" aria-label="Small">Sm</Toggle>
 *     <Toggle size="default" aria-label="Default">Md</Toggle>
 *     <Toggle size="lg" aria-label="Large">Lg</Toggle>
 *   </div>
 * </div>
 * ```
 */
export { Toggle, toggleVariants };
export type { ToggleButtonRootProps as ToggleProps };
