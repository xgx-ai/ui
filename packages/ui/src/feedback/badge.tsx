import type { ComponentProps } from "@solidjs/web";
import type { JSX } from "@solidjs/web";
import { splitProps } from "../utils/split-props";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { Component } from "solid-js";
import { children } from "solid-js";
import { Show } from "solid-js";

import { cn } from "../cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded border font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-surface-muted hover:bg-hover border-border-subtle text-surface-muted-foreground hover:text-hover-foreground",
        outline:
          "bg-transparent hover:bg-hover border-border-subtle text-muted-foreground hover:text-hover-foreground",
        primary: "bg-primary hover:bg-primary/90 border-primary text-primary-foreground",
        secondary: "bg-secondary hover:bg-secondary/90 border-secondary text-secondary-foreground",
        success:
          "bg-success hover:bg-success/80 border-success-foreground/30 text-success-foreground",
        warning:
          "bg-warning hover:bg-warning/80 border-warning-foreground/30 text-warning-foreground",
        error: "bg-error hover:bg-error/80 border-error-foreground/30 text-error-foreground",
        danger: "bg-danger hover:bg-danger/80 border-danger text-danger-foreground",
        info: "bg-info hover:bg-info/80 border-info-foreground/30 text-info-foreground",
        destructive: "bg-danger hover:bg-danger/80 border-danger text-danger-foreground",
      },
      size: {
        default: "px-2 py-0.5 text-xs",
        sm: "px-1.5 py-0.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

const colorBorderVariants = new Set([
  "primary",
  "secondary",
  "success",
  "warning",
  "error",
  "danger",
  "info",
  "destructive",
]);

type BadgeProps = ComponentProps<"div"> &
  VariantProps<typeof badgeVariants> & {
    round?: boolean;
  };

const Badge: Component<BadgeProps> = (props) => {
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "variant",
    "size",
    "round",
    "style",
  ]);
  const resolvedChildren = children(() => local.children);
  const borderStyle = "color-mix(in oklch, currentColor 30%, transparent)";
  const style = () => {
    if (!colorBorderVariants.has(local.variant ?? "default")) {
      return local.style;
    }

    if (typeof local.style === "string") {
      return `${local.style}; border-color: ${borderStyle}`;
    }

    return {
      ...(local.style as JSX.CSSProperties | undefined),
      "border-color": borderStyle,
    };
  };

  return (
    <div
      {...others}
      class={cn(
        badgeVariants({ variant: local.variant, size: local.size }),
        local.round && "rounded-full",
        local.class,
      )}
      style={style()}
    >
      {resolvedChildren()}
    </div>
  );
};

const statusDotColors = {
  default: "bg-muted-foreground",
  success: "bg-success-foreground",
  warning: "bg-warning-foreground",
  error: "bg-error-foreground",
  danger: "bg-error-foreground",
  info: "bg-info-foreground",
  primary: "bg-primary",
  secondary: "bg-secondary",
  destructive: "bg-danger",
} as const;

type StatusBadgeProps = BadgeProps & {
  dot?: boolean;
  pulse?: boolean;
  dotColor?: keyof typeof statusDotColors;
};

const StatusBadge: Component<StatusBadgeProps> = (props) => {
  const [local, others] = splitProps(props, ["dot", "pulse", "dotColor", "class", "children"]);
  const dotColorClass = () =>
    statusDotColors[local.dotColor || "default"] || statusDotColors.default;

  return (
    <Badge
      round
      class={cn("h-5 shrink-0 px-2 text-[11px] font-semibold leading-none", local.class)}
      {...others}
    >
      <Show when={local.dot !== false}>
        <div
          class={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            dotColorClass(),
            local.pulse && "animate-pulse",
          )}
        />
      </Show>
      {local.children}
    </Badge>
  );
};

/**
 * # Badge
 *
 * Status badges and labels with multiple variants.
 *
 * @example
 * ```
 * <div class="space-y-4">
 *   <div class="flex flex-wrap gap-2">
 *     <Badge>Default</Badge>
 *     <Badge variant="success">Success</Badge>
 *     <Badge variant="warning">Warning</Badge>
 *     <Badge variant="error">Error</Badge>
 *     <Badge variant="info">Info</Badge>
 *     <Badge variant="outline">Outline</Badge>
 *   </div>
 *   <div class="flex flex-wrap gap-2">
 *     <StatusBadge variant="success" dotColor="success">Active</StatusBadge>
 *     <StatusBadge variant="warning" dotColor="warning" pulse>Pending</StatusBadge>
 *     <StatusBadge variant="error" dotColor="error">Error</StatusBadge>
 *   </div>
 * </div>
 * ```
 */
export { Badge, badgeVariants, StatusBadge };
export type { BadgeProps, StatusBadgeProps };
