import { type JSX, type ParentProps, splitProps } from "solid-js";
import { cn } from "../cn";

export interface NotificationItemProps {
  class?: string;
  /** Title text */
  title: string;
  /** Optional body/description text */
  body?: string;
  /** Timestamp or relative time string */
  time?: string;
  /** Whether the notification is unread */
  unread?: boolean;
  /** Trailing action element (e.g., mark as read button) */
  action?: JSX.Element;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Notification item with unread indicator, title, body, time, and optional action.
 *
 * @example
 * ```tsx
 * <NotificationItem
 *   title="New message"
 *   body="You have a new message from John"
 *   time="5 min ago"
 *   unread
 *   onClick={handleClick}
 *   action={<IconButton onClick={markAsRead}><Check /></IconButton>}
 * />
 * ```
 */
export function NotificationItem(props: NotificationItemProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "title",
    "body",
    "time",
    "unread",
    "action",
    "onClick",
  ]);

  return (
    <button
      type="button"
      onClick={local.onClick}
      class={cn(
        "w-full text-left flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors",
        local.unread && "bg-primary/5",
        local.class,
      )}
      {...rest}
    >
      {/* Unread indicator */}
      <div
        class={cn(
          "size-2 rounded-full mt-2 shrink-0",
          local.unread ? "bg-primary" : "bg-transparent",
        )}
      />

      {/* Content */}
      <div class="flex-1 min-w-0">
        <p
          class={cn(
            "text-sm truncate",
            local.unread ? "font-medium" : "text-muted-foreground",
          )}
        >
          {local.title}
        </p>
        {local.body && (
          <p class="text-xs text-muted-foreground truncate">{local.body}</p>
        )}
        {local.time && (
          <span class="text-[10px] text-muted-foreground/70">{local.time}</span>
        )}
      </div>

      {/* Action */}
      {local.action}
    </button>
  );
}

export interface NotificationActionButtonProps extends ParentProps {
  class?: string;
  onClick?: (e: MouseEvent) => void;
  title?: string;
}

/**
 * Small action button for notification items (e.g., mark as read).
 */
export function NotificationActionButton(
  props: NotificationActionButtonProps,
): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "onClick",
    "title",
    "children",
  ]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        local.onClick?.(e);
      }}
      class={cn(
        "p-1 hover:bg-muted rounded transition-colors shrink-0 text-muted-foreground [&>svg]:size-3.5",
        local.class,
      )}
      title={local.title}
      {...rest}
    >
      {local.children}
    </button>
  );
}
