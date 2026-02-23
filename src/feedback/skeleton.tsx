import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SkeletonPrimitive from "@kobalte/core/skeleton";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "../cn";

type SkeletonRootProps<T extends ValidComponent = "div"> =
  SkeletonPrimitive.SkeletonRootProps<T> & { class?: string | undefined };

const Skeleton = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SkeletonRootProps<T>>,
) => {
  const [local, others] = splitProps(props as SkeletonRootProps, ["class"]);
  return (
    <SkeletonPrimitive.Root
      class={cn(
        "bg-primary/10 data-[animate='true']:animate-pulse",
        local.class,
      )}
      {...others}
    />
  );
};

/**
 * # Skeleton
 *
 * Loading placeholder with animation.
 *
 * @example
 * ```
 * <div class="space-y-4 max-w-sm">
 *   <div class="flex items-center space-x-4">
 *     <Skeleton class="h-12 w-12 rounded-full" />
 *     <div class="space-y-2">
 *       <Skeleton class="h-4 w-[200px]" />
 *       <Skeleton class="h-4 w-[150px]" />
 *     </div>
 *   </div>
 *   <Skeleton class="h-[125px] w-full rounded-xl" />
 *   <div class="space-y-2">
 *     <Skeleton class="h-4 w-full" />
 *     <Skeleton class="h-4 w-4/5" />
 *   </div>
 * </div>
 * ```
 */
export { Skeleton };
