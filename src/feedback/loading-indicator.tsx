import { type JSX, type ParentProps, splitProps } from "solid-js";
import { cn } from "../cn";
import { Spinner } from "./spinner";

export interface LoadingIndicatorProps extends ParentProps {
  class?: string;
  /** Size of the spinner */
  size?: "xs" | "sm" | "md" | "lg";
  /** Vertical padding */
  padding?: "sm" | "md" | "lg";
}

const sizeMap = {
  xs: "size-3",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

const paddingMap = {
  sm: "py-3",
  md: "py-6",
  lg: "py-8",
};

/**
 * Centered loading indicator with optional text.
 *
 * @example
 * ```tsx
 * <LoadingIndicator size="md" padding="lg" />
 * <LoadingIndicator size="sm" padding="sm">Loading more...</LoadingIndicator>
 * ```
 */
export function LoadingIndicator(props: LoadingIndicatorProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "size",
    "padding",
    "children",
  ]);

  const spinnerSize = () => sizeMap[local.size ?? "md"];
  const containerPadding = () => paddingMap[local.padding ?? "md"];

  return (
    <div
      class={cn(
        "flex items-center justify-center",
        containerPadding(),
        local.class,
      )}
      {...rest}
    >
      <Spinner class={spinnerSize()} />
      {local.children && (
        <span class="ml-2 text-xs text-muted-foreground">{local.children}</span>
      )}
    </div>
  );
}
