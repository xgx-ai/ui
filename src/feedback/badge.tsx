import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { Component, ComponentProps } from "solid-js";
import { Show, splitProps } from "solid-js";

import { cn } from "../cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded border font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-muted hover:bg-muted/80 border-border text-muted-foreground",
        outline:
          "bg-transparent hover:bg-muted/50 border-border text-muted-foreground",
        primary:
          "bg-primary/12 hover:bg-primary/20 border-primary/30 text-primary",
        secondary:
          "bg-secondary/12 hover:bg-secondary/20 border-secondary/30 text-secondary",
        success:
          "bg-success hover:bg-success/80 border-success-foreground/30 text-success-foreground",
        warning:
          "bg-warning hover:bg-warning/80 border-warning-foreground/30 text-warning-foreground",
        error:
          "bg-error hover:bg-error/80 border-error-foreground/30 text-error-foreground",
        danger:
          "bg-error hover:bg-error/80 border-error-foreground/30 text-error-foreground",
        info: "bg-info hover:bg-info/80 border-info-foreground/30 text-info-foreground",
        destructive:
          "bg-destructive/12 hover:bg-destructive/20 border-destructive/30 text-destructive",
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

type BadgeProps = ComponentProps<"div"> &
  VariantProps<typeof badgeVariants> & {
    round?: boolean;
  };

const Badge: Component<BadgeProps> = (props) => {
  const [local, others] = splitProps(props, [
    "class",
    "variant",
    "size",
    "round",
  ]);
  return (
    <div
      class={cn(
        badgeVariants({ variant: local.variant, size: local.size }),
        local.round && "rounded-full",
        local.class,
      )}
      {...others}
    />
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
  destructive: "bg-destructive",
} as const;

type StatusBadgeProps = BadgeProps & {
  dot?: boolean;
  pulse?: boolean;
  dotColor?: keyof typeof statusDotColors;
};

const StatusBadge: Component<StatusBadgeProps> = (props) => {
  const [local, others] = splitProps(props, [
    "dot",
    "pulse",
    "dotColor",
    "children",
  ]);
  const dotColorClass = () =>
    statusDotColors[local.dotColor || "default"] || statusDotColors.default;

  return (
    <Badge {...others}>
      <Show when={local.dot !== false}>
        <div
          class={cn(
            "w-1.5 h-1.5 rounded-full",
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
