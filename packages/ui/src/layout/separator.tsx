/**
 * # Separator
 *
 * Renders a visual or semantic divider.
 *
 * @example
 * ```tsx
 * <Separator />
 * ```
 */
import type { ComponentProps } from "@solidjs/web";
import { cn } from "../cn";
import { splitProps } from "../utils/split-props";

type SeparatorProps = ComponentProps<"hr"> & {
  orientation?: "horizontal" | "vertical";
};

const Separator = (props: SeparatorProps) => {
  const [local, others] = splitProps(props, ["class", "orientation"]);
  const orientation = () => local.orientation ?? "horizontal";

  return (
    <hr
      aria-orientation={orientation()}
      class={cn(
        "shrink-0 border-0 bg-border",
        orientation() === "vertical" ? "h-full w-px" : "h-px w-full",
        local.class,
      )}
      {...others}
    />
  );
};

export { Separator };
export type { SeparatorProps };
