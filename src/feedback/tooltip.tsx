import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as TooltipPrimitive from "@kobalte/core/tooltip";
import type { ValidComponent } from "solid-js";
import { type Component, splitProps } from "solid-js";

import { cn } from "../cn";

const TooltipTrigger = TooltipPrimitive.Trigger;

const Tooltip: Component<TooltipPrimitive.TooltipRootProps> = (props) => {
  return <TooltipPrimitive.Root gutter={4} {...props} />;
};

type TooltipContentProps<T extends ValidComponent = "div"> =
  TooltipPrimitive.TooltipContentProps<T> & { class?: string | undefined };

const TooltipContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, TooltipContentProps<T>>,
) => {
  const [local, others] = splitProps(props as TooltipContentProps, ["class"]);
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        class={cn(
          "z-50 origin-[var(--kb-popover-content-transform-origin)] overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-2xs font-medium text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          local.class,
        )}
        {...others}
      />
    </TooltipPrimitive.Portal>
  );
};

/**
 * # Tooltip
 *
 * Hover tooltips for additional information.
 *
 * @example
 * ```
 * <div class="flex gap-4">
 *   <Tooltip>
 *     <TooltipTrigger class="px-4 py-2 border rounded">Hover me</TooltipTrigger>
 *     <TooltipContent>This is a tooltip</TooltipContent>
 *   </Tooltip>
 *   <Tooltip>
 *     <TooltipTrigger class="px-4 py-2 border rounded">Another</TooltipTrigger>
 *     <TooltipContent>Another tooltip with more content</TooltipContent>
 *   </Tooltip>
 * </div>
 * ```
 */
export { Tooltip, TooltipContent, TooltipTrigger };
