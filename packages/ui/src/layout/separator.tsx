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
import { omit } from "solid-js";
import { cn } from "../cn";

type SeparatorProps = ComponentProps<"hr"> & {
  orientation?: "horizontal" | "vertical";
};

const Separator = (props: SeparatorProps) => {
  const local = props;
  const others = omit(props, "class", "orientation");
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

export type { SeparatorProps };
export { Separator };
