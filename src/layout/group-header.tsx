import { type JSX, type ParentProps, Show, splitProps } from "solid-js";
import { cn } from "../cn";
import { Badge } from "../feedback/badge";

export interface GroupHeaderProps extends ParentProps {
  class?: string;
  /** Group label text */
  label: string;
  /** Optional count to show in badge */
  count?: number;
  /** Badge variant style */
  variant?: "default" | "overdue" | "today" | "muted" | "upcoming";
}

const variantStyles = {
  default: "",
  overdue: "bg-red-100 text-red-700 border-red-200",
  today: "bg-blue-100 text-blue-700 border-blue-200",
  muted: "bg-gray-100 text-gray-500 border-gray-200",
  upcoming: "bg-slate-100 text-slate-700 border-slate-200",
};

/**
 * Group header with label and optional count badge.
 * Used for grouped lists (e.g., tasks by due date).
 *
 * @example
 * ```tsx
 * <GroupHeader label="Overdue" count={3} variant="overdue" />
 * <GroupHeader label="Today" count={5} variant="today" />
 * ```
 */
export function GroupHeader(props: GroupHeaderProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "label",
    "count",
    "variant",
    "children",
  ]);

  const badgeClass = () => variantStyles[local.variant ?? "default"];

  return (
    <div class={cn("flex items-center gap-2 mb-2", local.class)} {...rest}>
      <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {local.label}
      </h3>
      <Show when={local.count !== undefined}>
        <Badge class={cn("text-[10px] px-1.5 py-0 h-4 border", badgeClass())}>
          {local.count}
        </Badge>
      </Show>
      {local.children}
    </div>
  );
}

export interface GroupSectionProps extends ParentProps {
  class?: string;
}

/**
 * Container for a group of items with consistent spacing.
 */
export function GroupSection(props: GroupSectionProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("mb-5 last:mb-0", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export interface GroupContentProps extends ParentProps {
  class?: string;
}

/**
 * Content container with vertical gap spacing.
 */
export function GroupContent(props: GroupContentProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("flex flex-col gap-2", local.class)} {...rest}>
      {local.children}
    </div>
  );
}
