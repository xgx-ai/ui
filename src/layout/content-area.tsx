import type { JSX } from "@solidjs/web";
import { splitProps } from "../utils/split-props";
import { type ParentProps } from "solid-js";
import { cn } from "../cn";

export interface ContentAreaProps extends ParentProps {
  class?: string;
  /** Padding size */
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-2",
  md: "p-4",
  lg: "p-6",
};

/**
 * Scrollable content area that fills remaining space.
 * Used as the main content container in cards/panels.
 *
 * @example
 * ```tsx
 * <Card>
 *   <Toolbar>...</Toolbar>
 *   <ContentArea padding="md">
 *     {items}
 *   </ContentArea>
 * </Card>
 * ```
 */
export function ContentArea(props: ContentAreaProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "padding", "children"]);

  return (
    <div
      class={cn("flex-1 overflow-auto", paddingMap[local.padding ?? "md"], local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
}
