import type { JSX } from "@solidjs/web";
import { omit, type ParentProps } from "solid-js";
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
  const local = props;
  const rest = omit(props, "class", "padding", "children");
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
  const local = props;
  const rest = omit(props, "class", "size", "children");
  const sizeClass = () => iconSizeMap[local.size ?? "md"];
  return (
    <div class={cn("mx-auto mb-4 text-muted-foreground/50", sizeClass(), local.class)} {...rest}>
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
  const local = props;
  const rest = omit(props, "class", "size", "children");
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
export function EmptyStateDescription(props: EmptyStateDescriptionProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");
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
  const local = props;
  const rest = omit(props, "class", "children");
  return (
    <div class={cn("flex items-center justify-center gap-2", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export interface SimpleEmptyStateProps {
  class?: string;
  /** Icon element to display */
  icon?: JSX.Element;
  /** Title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional action button/element */
  action?: JSX.Element;
  /** Vertical padding size */
  padding?: "sm" | "md" | "lg";
  /** Title size */
  titleSize?: "sm" | "default";
}

/**
 * Simple empty state with props-based API
 *
 * @example
 * ```
 * <SimpleEmptyState
 *   icon={<Folder />}
 *   title="This folder is empty"
 *   description="Upload a file to get started"
 *   action={<Button>Upload</Button>}
 * />
 * ```
 */
export function SimpleEmptyState(props: SimpleEmptyStateProps): JSX.Element {
  const local = props;
  return (
    <EmptyState class={local.class} padding={local.padding}>
      {local.icon && <EmptyStateIcon>{local.icon}</EmptyStateIcon>}
      <EmptyStateTitle size={local.titleSize}>{local.title}</EmptyStateTitle>
      {local.description && <EmptyStateDescription>{local.description}</EmptyStateDescription>}
      {local.action && <EmptyStateActions>{local.action}</EmptyStateActions>}
    </EmptyState>
  );
}
