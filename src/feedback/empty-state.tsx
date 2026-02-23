import { type JSX, type ParentProps, splitProps } from "solid-js";
import { cn } from "../cn";

export interface EmptyStateProps extends ParentProps {
  class?: string;
  /** Vertical padding size */
  padding?: "sm" | "md" | "lg";
}

const paddingMap = {
  sm: "py-4",
  md: "py-8",
  lg: "py-12",
};

/** Empty state container */
export function EmptyState(props: EmptyStateProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "padding", "children"]);
  const paddingClass = () => paddingMap[local.padding ?? "lg"];
  return (
    <div class={cn(paddingClass(), "text-center", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export interface EmptyStateIconProps extends ParentProps {
  class?: string;
  /** Icon size */
  size?: "sm" | "md" | "lg";
}

const iconSizeMap = {
  sm: "[&>svg]:size-5",
  md: "[&>svg]:size-8",
  lg: "[&>svg]:size-10",
};

/** Empty state icon wrapper - icons are automatically sized */
export function EmptyStateIcon(props: EmptyStateIconProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "size", "children"]);
  const sizeClass = () => iconSizeMap[local.size ?? "md"];
  return (
    <div
      class={cn(
        "mx-auto mb-4 text-muted-foreground/50",
        sizeClass(),
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export interface EmptyStateTitleProps extends ParentProps {
  class?: string;
  /** Text size */
  size?: "sm" | "default";
}

/** Empty state title */
export function EmptyStateTitle(props: EmptyStateTitleProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "size", "children"]);
  return (
    <h3
      class={cn(
        "scroll-m-20 tracking-tight",
        local.size === "sm" ? "text-sm font-normal" : "text-xl font-semibold",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </h3>
  );
}

export interface EmptyStateDescriptionProps extends ParentProps {
  class?: string;
}

/** Empty state description */
export function EmptyStateDescription(
  props: EmptyStateDescriptionProps,
): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <p class={cn("text-muted-foreground mb-4", local.class)} {...rest}>
      {local.children}
    </p>
  );
}

export interface EmptyStateActionsProps extends ParentProps {
  class?: string;
}

/** Empty state actions container */
export function EmptyStateActions(props: EmptyStateActionsProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={cn("flex items-center justify-center gap-2", local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
}
