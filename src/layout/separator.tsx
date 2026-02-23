import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SeparatorPrimitive from "@kobalte/core/separator";
import type { ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "../cn";

type SeparatorRootProps<T extends ValidComponent = "hr"> =
  SeparatorPrimitive.SeparatorRootProps<T> & { class?: string | undefined };

/**
 * # Separator
 *
 * Visual divider between content sections.
 *
 * @example
 * ```
 * <div class="space-y-4">
 *   <p>Content above</p>
 *   <Separator />
 *   <p>Content below</p>
 *   <div class="flex h-8 items-center gap-4">
 *     <span>Left</span>
 *     <Separator orientation="vertical" />
 *     <span>Right</span>
 *   </div>
 * </div>
 * ```
 */
const Separator = <T extends ValidComponent = "hr">(
  props: PolymorphicProps<T, SeparatorRootProps<T>>,
) => {
  const [local, others] = splitProps(props as SeparatorRootProps, [
    "class",
    "orientation",
  ]);
  return (
    <SeparatorPrimitive.Root
      orientation={local.orientation ?? "horizontal"}
      class={cn(
        "shrink-0 bg-border",
        local.orientation === "vertical" ? "h-full w-px" : "h-px w-full",
        local.class,
      )}
      {...others}
    />
  );
};

export { Separator };
