import type { ComponentProps } from "@solidjs/web";
import type { Component } from "solid-js";
import { For, omit, Show } from "solid-js";
import { cn } from "../cn";
import { FileText, FolderOpen, ListTree } from "../icons.index";

/**
 * # Tree Preview
 *
 * Minimal tree visualization showing the structure being built.
 * Used as a live artifact preview during project creation wizards.
 *
 * @example
 * ```
 * <TreePreview
 *   nodes={[
 *     { id: "1", title: "Getting Started", type: "document", sections: [
 *       { id: "s1", title: "Introduction" },
 *       { id: "s2", title: "Setup" },
 *     ]},
 *     { id: "2", title: "API Reference", type: "document" },
 *   ]}
 * />
 * ```
 */

export interface TreePreviewSection {
  id: string;
  title: string;
}

export interface TreePreviewNode {
  id: string;
  title: string;
  type: "document" | "folder";
  sections?: TreePreviewSection[];
}

export interface TreePreviewProps extends Omit<ComponentProps<"div">, "children"> {
  /** Nodes to display in the tree */
  nodes: TreePreviewNode[];
  /** Project/root name */
  rootName?: string;
  /** Whether the tree is still being built */
  isBuilding?: boolean;
}

const TreeConnector: Component<{ isLast?: boolean }> = (props) => (
  <div class="absolute left-3 top-0 flex items-center h-6">
    <div class={cn("w-3 h-3 border-l border-b border-border", props.isLast ? "rounded-bl" : "")} />
  </div>
);

export const TreePreview: Component<TreePreviewProps> = (props) => {
  const local = props;
  const others = omit(props, "nodes", "rootName", "isBuilding", "class");

  const hasNodes = () => local.nodes.length > 0;

  return (
    <div
      class={cn("rounded-md p-4", "bg-surface border border-border-subtle", local.class)}
      {...others}
    >
      {/* Header */}
      <div class="flex items-center gap-2 mb-3">
        <ListTree class="w-4 h-4 text-muted-foreground" />
        <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Project Structure
        </span>
        <Show when={local.isBuilding}>
          <span class="ml-auto text-xs text-muted-foreground animate-pulse">Building...</span>
        </Show>
      </div>

      {/* Empty state */}
      <Show when={!hasNodes()}>
        <div class="text-center py-6">
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
            <FolderOpen class="h-6 w-6 text-surface-muted-foreground" />
          </div>
          <p class="text-sm text-muted-foreground">Your project structure will appear here</p>
        </div>
      </Show>

      {/* Tree */}
      <Show when={hasNodes()}>
        <div class="space-y-0">
          {/* Root */}
          <Show when={local.rootName}>
            <div class="flex items-center gap-2 py-1">
              <FolderOpen class="w-4 h-4 text-secondary" />
              <span class="text-sm font-medium">{local.rootName}</span>
            </div>
          </Show>

          {/* Nodes */}
          <div class={cn(local.rootName && "ml-2")}>
            <For each={local.nodes}>
              {(node, nodeIndex) => {
                const isLastNode = () => nodeIndex() === local.nodes.length - 1;
                const hasSections = () => node.sections && node.sections.length > 0;

                return (
                  <div class="relative">
                    {/* Node */}
                    <div class="flex items-center gap-2 py-1 pl-6 relative">
                      <TreeConnector isLast={isLastNode() && !hasSections()} />
                      <FileText class="w-4 h-4 text-muted-foreground" />
                      <span class="text-sm">{node.title}</span>
                    </div>

                    {/* Sections */}
                    <Show when={hasSections()}>
                      <div class="ml-6">
                        <For each={node.sections}>
                          {(section, sectionIndex) => {
                            const isLastSection = () =>
                              sectionIndex() === (node.sections?.length ?? 0) - 1;
                            const isLastInTree = () => isLastNode() && isLastSection();

                            return (
                              <div class="flex items-center gap-2 py-0.5 pl-6 relative text-muted-foreground">
                                <TreeConnector isLast={isLastInTree()} />
                                <span class="text-xs">› {section.title}</span>
                              </div>
                            );
                          }}
                        </For>
                      </div>
                    </Show>

                    {/* Vertical line continuation */}
                    <Show when={!isLastNode()}>
                      <div class="absolute left-3 top-6 bottom-0 w-px bg-border" />
                    </Show>
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

export type { TreePreviewProps as TreePreviewProperties };
