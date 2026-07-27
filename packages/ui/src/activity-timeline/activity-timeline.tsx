import { For, omit, Show } from "solid-js";
import { cn } from "../cn";
import { Skeleton } from "../feedback/skeleton";
import { Button } from "../forms/button";
import { SearchBar } from "../forms/search-bar";
import { createMountEffect } from "../utils/lifecycle";
import type { ActivityTimelineProps } from "./types";

function ActivityTimeline<TItem = unknown>(props: ActivityTimelineProps<TItem>) {
  const local = props as ActivityTimelineProps;
  const others = omit(
    props as ActivityTimelineProps,
    "items",
    "hasMore",
    "isFetching",
    "onFetchMore",
    "filters",
    "selectedFilter",
    "onFilterChange",
    "searchValue",
    "onSearchChange",
    "renderItem",
    "headerActions",
    "emptyMessage",
    "loadingCount",
    "class",
    "children",
  );

  let sentinelRef: HTMLDivElement | undefined;

  createMountEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !local.isFetching && local.hasMore) {
        local.onFetchMore();
      }
    });

    if (sentinelRef) observer.observe(sentinelRef);
    return () => observer.disconnect();
  });

  const showFilters = () => local.filters && local.filters.length > 0;
  const showSearch = () => local.onSearchChange !== undefined;
  const showToolbar = () => showFilters() || showSearch() || local.headerActions;

  const loadingSkeletonCount = () => local.loadingCount ?? 3;

  return (
    <div
      class={cn(
        "h-full w-full rounded-lg border border-border-subtle bg-card p-4 text-card-foreground overflow-hidden flex flex-col",
        local.class,
      )}
      {...others}
    >
      <Show when={showToolbar()}>
        <div class="flex justify-between h-9 gap-2 shrink-0">
          <div class="flex gap-2 h-full flex-1">
            <Show when={showSearch()}>
              <SearchBar
                class="w-full max-w-72 h-full"
                value={local.searchValue ?? ""}
                onChange={(value: string) => local.onSearchChange?.(value)}
                placeholder="Search activity..."
              />
            </Show>
            <Show when={showFilters()}>
              <div class="flex gap-1 h-full items-center">
                <For each={local.filters}>
                  {(filter) => (
                    <Button
                      variant={local.selectedFilter === filter.id ? "default" : "outline"}
                      size="sm"
                      class="h-7 text-xs px-2.5"
                      onClick={() => local.onFilterChange?.(filter.id)}
                    >
                      {filter.label}
                    </Button>
                  )}
                </For>
              </div>
            </Show>
          </div>
          <Show when={local.headerActions}>{local.headerActions}</Show>
        </div>
      </Show>

      <div
        class={cn(
          "flex-1 overflow-y-auto flex flex-col gap-5 bg-surface-muted p-4 rounded-md",
          showToolbar() && "mt-3",
        )}
      >
        <Show
          when={!local.isFetching || local.items.length > 0}
          fallback={
            <div class="flex flex-col gap-3">
              <For each={Array.from({ length: loadingSkeletonCount() }, (_, i) => i)}>
                {() => <Skeleton class="h-20 w-full" />}
              </For>
            </div>
          }
        >
          <Show
            when={local.items.length > 0}
            fallback={
              <div class="flex justify-center items-center p-8 text-muted-foreground h-full w-full text-xs rounded-md">
                <span>{local.emptyMessage ?? "No activity found."}</span>
              </div>
            }
          >
            <For each={local.items as TItem[]}>
              {(item) => (local.renderItem as (item: TItem) => any)(item)}
            </For>

            <Show when={local.isFetching}>
              <div class="p-2">
                <Skeleton class="h-20 w-full" />
              </div>
            </Show>

            <Show when={!local.hasMore && local.items.length > 0}>
              <div class="text-center py-2 text-xs text-muted-foreground">End of results</div>
            </Show>

            <div
              ref={(el) => {
                sentinelRef = el;
              }}
              class="h-6"
            />
          </Show>
        </Show>
      </div>
    </div>
  );
}

export { ActivityTimeline };
