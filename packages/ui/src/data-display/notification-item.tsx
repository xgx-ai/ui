import type { JSX } from "@solidjs/web";
import { omit, type ParentProps, Show } from "solid-js";
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
  /**
   * Render the row as a container whose click target and `action` are siblings, so an
   * interactive `action` is not nested inside the row's button. The row looks the same and
   * stays clickable across its whole area.
   */
  separateAction?: boolean;
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
 *   separateAction
 *   action={<NotificationActionButton onClick={markAsRead}><Check /></NotificationActionButton>}
 * />
 * ```
 */
export function NotificationItem(props: NotificationItemProps): JSX.Element {
  const local = props;
  const rest = omit(
    props,
    "class",
    "title",
    "body",
    "time",
    "unread",
    "action",
    "onClick",
    "separateAction",
  );
  const rowClass = () =>
    cn(
      "w-full text-left flex items-start gap-3 p-2 rounded-lg hover:bg-hover hover:text-hover-foreground transition-colors",
      local.unread && "bg-selected text-selected-foreground",
      local.class,
    );
  const content = () => (
    <>
      {/* Unread indicator */}
      <div
        data-slot="notification-indicator"
        class={cn(
          "size-2 rounded-full mt-2 shrink-0",
          local.unread ? "bg-selected-foreground" : "bg-transparent",
        )}
      />

      {/* Content */}
      <div class="flex-1 min-w-0">
        <p class={cn("text-sm truncate", local.unread ? "font-medium" : "text-muted-foreground")}>
          {local.title}
        </p>
        {local.body && <p class="text-xs text-muted-foreground truncate">{local.body}</p>}
        {local.time && <span class="text-[10px] text-muted-foreground/70">{local.time}</span>}
      </div>
    </>
  );

  return (
    <Show
      when={local.separateAction}
      fallback={
        <button type="button" onClick={local.onClick} class={rowClass()} {...rest}>
          {content()}

          {/* Action */}
          {local.action}
        </button>
      }
    >
      <div class={cn("relative isolate", rowClass())} {...rest}>
        {/* The stretched ::after makes the whole row the click target and carries the focus ring.
            It sits beneath the row's content, so the action stays clickable above it. */}
        <button
          type="button"
          onClick={local.onClick}
          class="flex min-w-0 flex-1 items-start gap-3 text-left outline-none after:absolute after:inset-0 after:-z-10 after:rounded-lg focus-visible:after:[outline-style:auto]"
        >
          {content()}
        </button>

        {/* Action */}
        {local.action}
      </div>
    </Show>
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
export function NotificationActionButton(props: NotificationActionButtonProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "onClick", "title", "children");

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        local.onClick?.(e);
      }}
      class={cn(
        "shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-hover hover:text-hover-foreground [&>svg]:size-3.5",
        local.class,
      )}
      title={local.title}
      {...rest}
    >
      {local.children}
    </button>
  );
}
