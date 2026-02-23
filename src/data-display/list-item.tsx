import { type JSX, type ParentProps, Show, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "../cn";

export interface ListItemProps extends ParentProps {
  class?: string;
  /** Leading element (avatar, icon wrapper) */
  leading?: JSX.Element;
  /** Primary text/title */
  title: string | JSX.Element;
  /** Secondary text/description */
  subtitle?: string | JSX.Element;
  /** Trailing element (chevron, badge, action) */
  trailing?: JSX.Element;
  /** Whether to show hover state */
  interactive?: boolean;
  /** Click handler */
  onClick?: () => void;
}

/**
 * List item with leading icon/avatar, title, subtitle, and trailing element.
 *
 * @example
 * ```tsx
 * <ListItem
 *   leading={<Avatar><Building2 /></Avatar>}
 *   title="Acme Corp"
 *   subtitle="Technology"
 *   trailing={<ChevronRight />}
 *   interactive
 *   onClick={() => navigate(id)}
 * />
 * ```
 */
export function ListItem(props: ListItemProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "leading",
    "title",
    "subtitle",
    "trailing",
    "interactive",
    "onClick",
    "children",
  ]);

  return (
    <Dynamic
      component={local.onClick ? "button" : "div"}
      type={local.onClick ? "button" : undefined}
      class={cn(
        "flex items-center gap-2.5 p-2 rounded-md group w-full text-left",
        local.interactive &&
          "hover:bg-muted/50 transition-colors cursor-pointer",
        local.class,
      )}
      onClick={local.onClick}
      {...rest}
    >
      <Show when={local.leading}>
        <div class="shrink-0">{local.leading}</div>
      </Show>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">{local.title}</div>
        <Show when={local.subtitle}>
          <div class="text-xs text-muted-foreground truncate">
            {local.subtitle}
          </div>
        </Show>
      </div>
      <Show when={local.trailing}>
        <div class="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity [&>svg]:size-3.5">
          {local.trailing}
        </div>
      </Show>
      {local.children}
    </Dynamic>
  );
}

export interface ListItemIconProps extends ParentProps {
  class?: string;
}

/**
 * Icon wrapper for list items with consistent sizing and background.
 * Icons inside are automatically sized to 3.5 (14px).
 */
export function ListItemIcon(props: ListItemIconProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={cn(
        "size-7 rounded-full bg-muted flex items-center justify-center [&>svg]:size-3.5",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export interface ListProps extends ParentProps {
  class?: string;
}

/**
 * Container for list items with consistent spacing.
 */
export function List(props: ListProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("space-y-1", local.class)} {...rest}>
      {local.children}
    </div>
  );
}
