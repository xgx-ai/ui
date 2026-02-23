import * as CollapsiblePrimitive from "@kobalte/core/collapsible";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-solid";
import type { Component, ComponentProps, JSX } from "solid-js";
import { createSignal, For, Show, splitProps } from "solid-js";

import { cn } from "../cn";

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

export interface ContentTreeProps
  extends Omit<ComponentProps<"div">, "children"> {
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
  const [isExpanded, setIsExpanded] = createSignal(
    props.defaultExpanded ?? false,
  );
  const hasChildren = () =>
    props.item.children && props.item.children.length > 0;
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
      <CollapsiblePrimitive.Root
        open={isExpanded()}
        onOpenChange={setIsExpanded}
      >
        <button
          type="button"
          class={cn(
            "flex items-center gap-1 py-1.5 px-2 rounded-sm cursor-pointer transition-colors w-full text-left bg-transparent border-none",
            isSelected() ? "bg-primary/10 text-primary" : "hover:bg-muted/50",
          )}
          style={{ "padding-left": `${level() * 12 + 8}px` }}
          onClick={handleClick}
        >
          <Show
            when={hasChildren()}
            fallback={<span class="w-4 h-4 shrink-0" />}
          >
            <span class="p-0.5 shrink-0">
              <Show
                when={isExpanded()}
                fallback={<ChevronRight class="w-3 h-3" />}
              >
                <ChevronDown class="w-3 h-3" />
              </Show>
            </span>
          </Show>

          <Show when={props.item.icon}>
            {(Icon) => {
              const IconComponent = Icon();
              return (
                <IconComponent class="w-4 h-4 shrink-0 text-muted-foreground" />
              );
            }}
          </Show>

          <span class="text-sm font-medium truncate min-w-0 flex-1">
            {props.item.label}
          </span>

          <Show when={props.item.isLoading}>
            <Loader2 class="w-3.5 h-3.5 ml-2 shrink-0 text-muted-foreground animate-spin" />
          </Show>
        </button>

        <Show when={hasChildren()}>
          <CollapsiblePrimitive.Content class="overflow-hidden data-[expanded]:animate-collapsible-down data-[closed]:animate-collapsible-up">
            <div style={{ "margin-left": `${level() * 12 + 20}px` }}>
              <For each={props.item.children}>
                {(child, index) => {
                  const isLast = () =>
                    index() === (props.item.children?.length ?? 0) - 1;
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
          </CollapsiblePrimitive.Content>
        </Show>
      </CollapsiblePrimitive.Root>
    </div>
  );
};

const ContentTree: Component<ContentTreeProps> = (props) => {
  const [local, others] = splitProps(props, [
    "items",
    "header",
    "footer",
    "onItemClick",
    "selectedId",
    "defaultExpandedIds",
    "class",
  ]);

  return (
    <div
      class={cn(
        "flex flex-col h-full bg-muted/30 border-r border-border",
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
                local.defaultExpandedIds
                  ? local.defaultExpandedIds.includes(item.id)
                  : false
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
