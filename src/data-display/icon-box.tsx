import { type JSX, type ParentProps, splitProps } from "solid-js";
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
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  muted: "bg-muted/50 text-muted-foreground/50",
};

/** Icon container box */
export function IconBox(props: IconBoxProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "size",
    "variant",
    "children",
  ]);
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
