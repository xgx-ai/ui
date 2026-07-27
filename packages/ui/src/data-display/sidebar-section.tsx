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

type SidebarRowProps = ComponentProps<"div"> & {
  label: string;
};

const SidebarRow: Component<SidebarRowProps> = (props) => {
  const local = props;
  const others = omit(props, "label", "children", "class");
  return (
    <div class={cn("flex items-center justify-between py-1 text-xs", local.class)} {...others}>
      <span class="text-muted-foreground shrink-0">{local.label}</span>
      <span class="text-foreground text-right truncate ml-3">{local.children}</span>
    </div>
  );
};

export type { SidebarRowProps, SidebarSectionProps };
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
 * </SidebarSection>
 * ```
 */
export { SidebarRow, SidebarSection };
