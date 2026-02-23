import { type JSX, type ParentProps, Show, splitProps } from "solid-js";
import { cn } from "../cn";

export interface SectionHeaderProps extends ParentProps {
  class?: string;
  /** Icon to display before the title */
  icon?: JSX.Element;
  /** Title text */
  title: string;
  /** Badge/count element to display after the title */
  badge?: JSX.Element;
  /** Action element (button, link) to display on the right */
  action?: JSX.Element;
  /** Use compact styling */
  compact?: boolean;
}

/**
 * Section header with icon, title, optional badge and action.
 * Used for card headers, section titles, etc.
 *
 * @example
 * ```tsx
 * <SectionHeader
 *   icon={<Users class="size-4" />}
 *   title="My Clients"
 *   badge={<Badge variant="info">{count}</Badge>}
 *   action={<Button size="sm">Add</Button>}
 *   compact
 * />
 * ```
 */
export function SectionHeader(props: SectionHeaderProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "icon",
    "title",
    "badge",
    "action",
    "compact",
    "children",
  ]);

  return (
    <div
      class={cn(
        "flex items-center justify-between border-b shrink-0",
        local.compact ? "py-2.5 px-4" : "py-3 px-4",
        local.class,
      )}
      {...rest}
    >
      <div class="flex items-center gap-2">
        <Show when={local.icon}>
          <span class="text-muted-foreground [&>svg]:size-4">{local.icon}</span>
        </Show>
        <h2
          class={cn(
            "font-semibold",
            local.compact
              ? "text-[11px] text-muted-foreground uppercase tracking-wider"
              : "text-sm",
          )}
        >
          {local.title}
        </h2>
        <Show when={local.badge}>{local.badge}</Show>
      </div>
      <Show when={local.action}>{local.action}</Show>
      {local.children}
    </div>
  );
}

export interface SectionContentProps extends ParentProps {
  class?: string;
}

/**
 * Content area for sections with consistent padding.
 */
export function SectionContent(props: SectionContentProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("p-3 flex-1 overflow-auto", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export interface SectionFooterProps extends ParentProps {
  class?: string;
}

/**
 * Footer for sections with border and centered content.
 */
export function SectionFooter(props: SectionFooterProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("mt-2 pt-2 border-t text-center", local.class)} {...rest}>
      {local.children}
    </div>
  );
}
