import { type JSX, type ParentProps, splitProps } from "solid-js";
import { cn } from "../cn";

export interface TextLinkProps extends ParentProps {
  class?: string;
  href?: string;
  onClick?: () => void;
  /** Size variant */
  size?: "xs" | "sm" | "default";
}

/**
 * Simple text link with hover state.
 * Used for "View all", "See more", etc.
 *
 * @example
 * ```tsx
 * <TextLink size="xs" onClick={handleViewAll}>
 *   View all {count} clients
 * </TextLink>
 * ```
 */
export function TextLink(props: TextLinkProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "href",
    "onClick",
    "size",
    "children",
  ]);

  const sizeClass = () => {
    switch (local.size) {
      case "xs":
        return "text-[10px]";
      case "sm":
        return "text-xs";
      default:
        return "text-sm";
    }
  };

  if (local.href) {
    return (
      <a
        href={local.href}
        class={cn(
          "text-muted-foreground hover:text-primary transition-colors",
          sizeClass(),
          local.class,
        )}
        {...rest}
      >
        {local.children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={local.onClick}
      class={cn(
        "text-muted-foreground hover:text-primary transition-colors",
        sizeClass(),
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </button>
  );
}
