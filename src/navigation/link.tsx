import { type JSX, type ParentProps, splitProps } from "solid-js";
import { cn } from "../cn";

export interface LinkProps extends ParentProps {
  href: string;
  class?: string;
  /** Link variant */
  variant?: "default" | "muted" | "nav";
}

const variantClasses = {
  default: "text-primary hover:underline",
  muted: "text-muted-foreground hover:text-foreground",
  nav: "text-sm text-muted-foreground hover:text-foreground",
};

/** Styled link component */
export function Link(props: LinkProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "href",
    "class",
    "variant",
    "children",
  ]);
  return (
    <a
      href={local.href}
      class={cn(variantClasses[local.variant ?? "default"], local.class)}
      {...rest}
    >
      {local.children}
    </a>
  );
}

export interface CardLinkProps extends ParentProps {
  href: string;
  class?: string;
}

/** Link wrapper for cards with hover effects */
export function CardLink(props: CardLinkProps): JSX.Element {
  const [local, rest] = splitProps(props, ["href", "class", "children"]);
  return (
    <a href={local.href} class={cn("block group", local.class)} {...rest}>
      {local.children}
    </a>
  );
}

export interface BackLinkProps {
  href: string;
  class?: string;
  children?: JSX.Element;
}

/** Back navigation link */
export function BackLink(props: BackLinkProps): JSX.Element {
  const [local, rest] = splitProps(props, ["href", "class", "children"]);
  return (
    <a
      href={local.href}
      class={cn(
        "text-sm text-muted-foreground hover:text-foreground",
        local.class,
      )}
      {...rest}
    >
      {local.children ?? "← Back"}
    </a>
  );
}
