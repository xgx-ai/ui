import type { Component } from "solid-js";
import { For, omit, Show } from "solid-js";
import { cn } from "../cn";
import { SidebarRow, SidebarSection } from "../data-display/sidebar-section";
import { Badge } from "../feedback/badge";
import type { DetailSidebarProps, DetailSidebarSlimIcon } from "./types";

function SlimIconButton(props: DetailSidebarSlimIcon & { onToggle: () => void }) {
  const content = (
    <div class="bg-surface-muted w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-300">
      {props.icon}
    </div>
  );

  return (
    <div
      class="opacity-0 animate-bounce-in"
      style={{ "animation-delay": `${props.delay ?? 100}ms` }}
    >
      <Show
        when={props.href}
        fallback={
          <button type="button" onClick={props.onClick ?? props.onToggle} class="cursor-pointer">
            {content}
          </button>
        }
      >
        <a href={props.href}>{content}</a>
      </Show>
    </div>
  );
}

const DetailSidebar: Component<DetailSidebarProps> = (props) => {
  const local = props;
  const others = omit(
    props,
    "isSlim",
    "onToggle",
    "header",
    "sections",
    "slimIcons",
    "footer",
    "extraContent",
    "loading",
    "class",
  );

  const LoadingState = () => (
    <div class="flex items-center justify-center h-full w-full p-4">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
    </div>
  );

  const SlimView = () => (
    <div class="flex flex-col h-full w-full items-center py-4 space-y-2 gap-4 justify-between">
      <div class="flex flex-col items-center">
        <div class="pb-4 opacity-0 animate-fade-in" style={{ "animation-delay": "50ms" }}>
          <button type="button" onClick={() => local.onToggle()} class="cursor-pointer">
            <div class="w-10 h-10 bg-primary text-primary-foreground rounded-full items-center justify-center flex text-xs hover:opacity-70 transition-all duration-300">
              {local.header.initials}
            </div>
          </button>
        </div>

        <Show when={local.slimIcons && local.slimIcons.length > 0}>
          <div class="flex flex-col space-y-4 pt-6 border-t border-border-subtle">
            <For each={local.slimIcons}>
              {(slimIcon, index) => (
                <SlimIconButton
                  {...slimIcon}
                  delay={slimIcon.delay ?? (index() + 1) * 100}
                  onToggle={local.onToggle}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );

  const FullView = () => (
    <div class="flex flex-col h-full w-full">
      <div class="flex items-start gap-3 border-b border-border-subtle p-4">
        <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-xs font-medium text-surface-muted-foreground">
          {local.header.initials}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 items-center gap-2">
            <h3 class="truncate text-sm font-medium leading-tight">{local.header.displayName}</h3>
            <Show when={local.header.badges && local.header.badges.length > 0}>
              <div class="flex shrink-0 gap-1">
                <For each={local.header.badges}>
                  {(badge) => (
                    <Badge class="text-[10px]" variant={badge.variant ?? "secondary"} round>
                      {badge.label}
                    </Badge>
                  )}
                </For>
              </div>
            </Show>
          </div>
          <Show when={local.header.subtitle}>
            <div class="mt-0.5">{local.header.subtitle}</div>
          </Show>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto min-h-0">
        <For each={local.sections}>
          {(section) => (
            <SidebarSection title={section.title} action={section.action}>
              <For each={section.rows}>
                {(row) => (
                  <SidebarRow label={row.label}>
                    {typeof row.value === "string" ? <span>{row.value}</span> : row.value}
                  </SidebarRow>
                )}
              </For>
            </SidebarSection>
          )}
        </For>

        <Show when={local.extraContent}>{local.extraContent}</Show>
      </div>

      <Show when={local.footer}>{local.footer}</Show>
    </div>
  );

  return (
    <div class={cn("h-full", local.class)} {...others}>
      <Show when={!local.loading} fallback={<LoadingState />}>
        <Show when={!local.isSlim} fallback={<SlimView />}>
          <FullView />
        </Show>
      </Show>
    </div>
  );
};

export { DetailSidebar };
