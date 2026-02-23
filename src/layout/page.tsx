import { type JSX, type ParentProps, splitProps } from "solid-js";
import { cn } from "../cn";

export interface PageProps extends ParentProps {
  class?: string;
  /** Max width variant */
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeClasses = {
  sm: "max-w-xl",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-full",
};

/** Centered page container with padding */
export function Page(props: PageProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "size", "children"]);
  return (
    <div
      class={cn("p-6 w-full", sizeClasses[local.size ?? "lg"], local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export interface PageHeaderProps extends ParentProps {
  class?: string;
}

/** Page header with title area and actions slot */
export function PageHeader(props: PageHeaderProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={cn("flex items-center justify-between mb-2", local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export interface PageTitleProps extends ParentProps {
  class?: string;
}

/** Page title (H1 style) */
export function PageTitle(props: PageTitleProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <h1
      class={cn(
        "scroll-m-20 text-lg text-primary font-bold tracking-tight",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </h1>
  );
}

export interface PageDescriptionProps extends ParentProps {
  class?: string;
}

/** Page description text */
export function PageDescription(props: PageDescriptionProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <p class={cn("text-muted-foreground", local.class)} {...rest}>
      {local.children}
    </p>
  );
}
