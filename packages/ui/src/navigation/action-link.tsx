import type { JSX } from "@solidjs/web";
import { omit, type ParentProps } from "solid-js";
import { cn } from "../cn";

export interface ActionLinkProps extends ParentProps {
  class?: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  /** Leading icon element */
  icon?: JSX.Element;
}

/**
 * Clickable action text with icon, used for inline actions like "Mark all read".
 *
 * @example
 * ```tsx
 * <ActionLink onClick={handleMarkAll} icon={<CheckCheck />}>
 *   Mark all read
 * </ActionLink>
 * ```
 */
export function ActionLink(props: ActionLinkProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "onClick", "disabled", "title", "icon", "children");

  return (
    <button
      type="button"
      onClick={local.onClick}
      disabled={local.disabled}
      title={local.title}
      class={cn(
        "text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors disabled:opacity-50 [&>svg]:size-3.5",
        local.class,
      )}
      {...rest}
    >
      {local.icon}
      <span>{local.children}</span>
    </button>
  );
}
