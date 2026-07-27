import type { ComponentProps, JSX } from "@solidjs/web";
import type { Component } from "solid-js";
import { createSignal, For, omit, Show } from "solid-js";
import { cn } from "../cn";
import { ChevronDown, ChevronRight, Loader2 } from "../icons.index";

/**
 * # Content Tree
 *
 * Hierarchical tree view for navigation.
 *
 * @example
 * ```
 * <ContentTree
 *   items={[
 *     { id: "1", label: "Documents", children: [
 *       { id: "1-1", label: "Report.pdf" },
 *       { id: "1-2", label: "Notes.txt" },
 *     ]},
 *     { id: "2", label: "Images" },
 *   ]}
 *   onItemClick={(item) => console.log(item.label)}
 *   selectedId="1-1"
 *   class="w-64 h-96"
 * />
 * ```
 */

// Types
export interface ContentTreeItem {
  id: string;
  label: string;
  description?: string;
  icon?: Component<{ class?: string }>;
  children?: ContentTreeItem[];
  isLoading?: boolean;
}

export interface ContentTreeProps extends Omit<ComponentProps<"div">, "children"> {
  items: ContentTreeItem[];
  header?: JSX.Element;
  footer?: JSX.Element;
  onItemClick?: (item: ContentTreeItem) => void;
  selectedId?: string;
  defaultExpandedIds?: string[];
}

export interface ContentTreeNodeProps {
  item: ContentTreeItem;
  level?: number;
  onItemClick?: (item: ContentTreeItem) => void;
  selectedId?: string;
  defaultExpanded?: boolean;
}

// Components
const ContentTreeNode: Component<ContentTreeNodeProps> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(props.defaultExpanded ?? false);
  const hasChildren = () => props.item.children && props.item.children.length > 0;
  const level = () => props.level ?? 0;
  const isSelected = () => props.selectedId === props.item.id;

  const handleClick = () => {
    if (hasChildren()) {
      setIsExpanded(!isExpanded());
    }
    props.onItemClick?.(props.item);
  };

  return (
    <div class="select-none">
      <button
        type="button"
        class={cn(
          "flex w-full cursor-pointer items-center gap-1 rounded-sm border-none bg-transparent px-2 py-1.5 text-left transition-colors",
          isSelected()
            ? "bg-selected text-selected-foreground"
            : "text-foreground hover:bg-hover hover:text-hover-foreground",
        )}
        data-selected={isSelected() ? "true" : undefined}
        style={{ "padding-left": `${level() * 12 + 8}px` }}
        onClick={handleClick}
      >
        <Show when={hasChildren()} fallback={<span class="w-4 h-4 shrink-0" />}>
          <span class="p-0.5 shrink-0">
            <Show when={isExpanded()} fallback={<ChevronRight class="w-3 h-3" />}>
              <ChevronDown class="w-3 h-3" />
            </Show>
          </span>
        </Show>

        <Show when={props.item.icon}>
          {(Icon) => {
            const IconComponent = Icon();
            return <IconComponent class="h-4 w-4 shrink-0 text-current opacity-70" />;
          }}
        </Show>

        <span class="text-sm font-medium truncate min-w-0 flex-1">{props.item.label}</span>

        <Show when={props.item.isLoading}>
          <Loader2 class="ml-2 h-3.5 w-3.5 shrink-0 animate-spin text-current opacity-70" />
        </Show>
      </button>

      <Show when={hasChildren() && isExpanded()}>
        <div class="overflow-hidden">
          <div style={{ "margin-left": `${level() * 12 + 20}px` }}>
            <For each={props.item.children}>
              {(child, index) => {
                const isLast = () => index() === (props.item.children?.length ?? 0) - 1;
                return (
                  <div class="relative">
                    <Show
                      when={isLast()}
                      fallback={
                        <>
                          {/* Vertical line - full height */}
                          <div class="absolute left-0 top-0 w-px h-full bg-border" />
                          {/* Horizontal connector */}
                          <div class="absolute left-0 top-[13px] w-1.5 border-t border-border" />
                        </>
                      }
                    >
                      {/* Curved corner for last item */}
                      <div class="absolute left-0 top-0 w-2 h-[14px] border-l border-b border-border rounded-bl" />
                    </Show>
                    <div class="pl-2.5">
                      <ContentTreeNode
                        item={child}
                        level={0}
                        onItemClick={props.onItemClick}
                        selectedId={props.selectedId}
                        defaultExpanded={props.defaultExpanded}
                      />
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};

const ContentTree: Component<ContentTreeProps> = (props) => {
  const local = props;
  const others = omit(
    props,
    "items",
    "header",
    "footer",
    "onItemClick",
    "selectedId",
    "defaultExpandedIds",
    "class",
  );

  return (
    <div
      class={cn(
        "flex h-full flex-col border-r border-border bg-surface-muted text-surface-muted-foreground",
        local.class,
      )}
      {...others}
    >
      <Show when={local.header}>
        <div class="p-3 border-b border-border">{local.header}</div>
      </Show>

      <div class="flex-1 overflow-y-auto p-2">
        <For each={local.items}>
          {(item) => (
            <ContentTreeNode
              item={item}
              onItemClick={local.onItemClick}
              selectedId={local.selectedId}
              defaultExpanded={
                local.defaultExpandedIds ? local.defaultExpandedIds.includes(item.id) : false
              }
            />
          )}
        </For>
      </div>

      <Show when={local.footer}>
        <div class="p-3 border-t border-border">{local.footer}</div>
      </Show>
    </div>
  );
};

export { ContentTree, ContentTreeNode };
