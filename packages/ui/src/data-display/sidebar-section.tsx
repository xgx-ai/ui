import type { ComponentProps, JSX } from "@solidjs/web";
import type { Component } from "solid-js";
import { omit, Show } from "solid-js";
import { cn } from "../cn";

type SidebarSectionProps = ComponentProps<"div"> & {
  title: string;
  action?: JSX.Element;
};

const SidebarSection: Component<SidebarSectionProps> = (props) => {
  const local = props;
  const others = omit(props, "title", "action", "children", "class");
  return (
    <div class={cn("px-4 py-3", local.class)} {...others}>
      <div class="flex items-center justify-between mb-1.5">
        <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {local.title}
        </div>
        <Show when={local.action}>{local.action}</Show>
      </div>
      {local.children}
    </div>
  );
};

type SidebarRowOverflow = "truncate" | "wrap";

type SidebarRowProps = ComponentProps<"div"> & {
  label: string;
  /**
   * How a value too long for the row is shown. `truncate` (the default) clips
   * it to one line. `wrap` keeps short values beside the label, moves a value
   * that doesn't fit onto its own line under the label, and wraps it there.
   */
  overflow?: SidebarRowOverflow;
};

const SidebarRow: Component<SidebarRowProps> = (props) => {
  const local = props;
  const others = omit(props, "label", "overflow", "children", "class");
  return (
    <Show
      when={local.overflow === "wrap"}
      fallback={
        <div class={cn("flex items-center justify-between py-1 text-xs", local.class)} {...others}>
          <span class="text-muted-foreground shrink-0">{local.label}</span>
          <span class="text-foreground text-right truncate ml-3">{local.children}</span>
        </div>
      }
    >
      {/* A flex line breaks on the value's unwrapped width, so a value only
          wraps once it has a line of its own. */}
      <div
        class={cn("flex flex-wrap items-center justify-between gap-x-3 py-1 text-xs", local.class)}
        data-overflow="wrap"
        {...others}
      >
        <Show when={local.label}>
          <span class="text-muted-foreground shrink-0">{local.label}</span>
        </Show>
        {/* Without a label the value has the whole row, so it aligns itself. */}
        <span
          class={cn(
            "text-foreground text-right ml-auto min-w-0 max-w-full wrap-break-word",
            !local.label && "w-full",
          )}
        >
          {local.children}
        </span>
      </div>
    </Show>
  );
};

export type { SidebarRowOverflow, SidebarRowProps, SidebarSectionProps };
/**
 * # SidebarSection / SidebarRow
 *
 * Sidebar layout primitives for detail sidebars with title + label/value rows.
 *
 * @example
 * ```
 * <SidebarSection title="Contact">
 *   <SidebarRow label="Email">john@example.com</SidebarRow>
 *   <SidebarRow label="Phone">+44 7700 900000</SidebarRow>
 *   <SidebarRow label="Notes" overflow="wrap">Prefers email after 6pm</SidebarRow>
 * </SidebarSection>
 * ```
 */
export { SidebarRow, SidebarSection };
