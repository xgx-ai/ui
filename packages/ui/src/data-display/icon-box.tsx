import type { JSX } from "@solidjs/web";
import { omit, type ParentProps } from "solid-js";
import { cn } from "../cn";

export interface IconBoxProps extends ParentProps {
  class?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "xl";
  /** Color variant */
  variant?: "default" | "primary" | "muted";
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

const variantClasses = {
  default: "bg-surface-muted text-surface-muted-foreground",
  primary: "bg-control-muted text-control-muted-foreground",
  muted: "bg-disabled text-disabled-foreground",
};

/** Icon container box */
export function IconBox(props: IconBoxProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "size", "variant", "children");
  return (
    <div
      class={cn(
        "rounded-lg flex items-center justify-center",
        sizeClasses[local.size ?? "md"],
        variantClasses[local.variant ?? "default"],
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}
