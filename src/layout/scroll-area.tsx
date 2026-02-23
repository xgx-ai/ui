import { type JSX, type ParentProps, splitProps } from "solid-js";
import { cn } from "../cn";

export interface ScrollAreaProps extends ParentProps {
  class?: string;
  /** Maximum height constraint */
  maxHeight?: "xs" | "sm" | "md" | "lg" | "xl" | "full";
}

const maxHeightMap = {
  xs: "max-h-32",
  sm: "max-h-48",
  md: "max-h-64",
  lg: "max-h-96",
  xl: "max-h-[32rem]",
  full: "max-h-full",
};

/**
 * Scrollable container with consistent styling.
 *
 * @example
 * ```tsx
 * <ScrollArea maxHeight="md">
 *   <NotificationsList />
 * </ScrollArea>
 * ```
 */
export function ScrollArea(props: ScrollAreaProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "maxHeight", "children"]);

  return (
    <div
      class={cn(
        "overflow-y-auto",
        local.maxHeight && maxHeightMap[local.maxHeight],
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}
