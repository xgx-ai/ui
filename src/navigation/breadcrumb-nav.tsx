import { For, type JSX, Show, splitProps } from "solid-js";
import { cn } from "../cn";
import { Button } from "../forms/button";

export interface BreadcrumbItem {
  id?: string;
  name: string;
}

export interface BreadcrumbNavProps {
  class?: string;
  /** Breadcrumb items to display */
  items: BreadcrumbItem[];
  /** Called when a breadcrumb is clicked. Index is the position in the items array. */
  onNavigate: (index: number) => void;
  /** Called when back button is clicked */
  onBack: () => void;
  /** Called when home button is clicked */
  onHome: () => void;
  /** Whether navigation is possible (controls back/home button state) */
  canNavigate?: boolean;
  /** Text to show when items array is empty */
  fallbackLabel?: string;
  /** Icon for back button */
  backIcon: JSX.Element;
  /** Icon for home button */
  homeIcon: JSX.Element;
  /** Separator icon between breadcrumbs */
  separatorIcon: JSX.Element;
}

/**
 * Navigation breadcrumb with back and home buttons.
 * Used for folder navigation in file explorers.
 *
 * @example
 * ```tsx
 * <BreadcrumbNav
 *   items={breadcrumbs}
 *   onNavigate={(index) => navigateTo(index)}
 *   onBack={goBack}
 *   onHome={goHome}
 *   canNavigate={!isAtRoot}
 *   backIcon={<ArrowLeft size={14} />}
 *   homeIcon={<Home size={14} />}
 *   separatorIcon={<ChevronRight size={12} />}
 * />
 * ```
 */
export function BreadcrumbNav(props: BreadcrumbNavProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "items",
    "onNavigate",
    "onBack",
    "onHome",
    "canNavigate",
    "fallbackLabel",
    "backIcon",
    "homeIcon",
    "separatorIcon",
  ]);

  const canNav = () => local.canNavigate ?? true;

  return (
    <div
      class={cn(
        "flex items-center gap-2 px-3 py-2 bg-muted/50 border-b",
        local.class,
      )}
      {...rest}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={local.onBack}
        disabled={!canNav()}
        class="w-7 h-7 shrink-0"
        title="Back"
      >
        {local.backIcon}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={local.onHome}
        disabled={!canNav()}
        class="w-7 h-7 shrink-0"
        title="Home"
      >
        {local.homeIcon}
      </Button>
      <div class="flex items-center gap-1 text-xs flex-1 min-w-0 bg-background border rounded-md px-2 py-1 min-h-[28px]">
        <Show
          when={local.items.length > 0}
          fallback={
            <span class="text-muted-foreground">
              {local.fallbackLabel ?? "Home"}
            </span>
          }
        >
          <For each={local.items}>
            {(item, index) => {
              const isLast = () => index() === local.items.length - 1;
              return (
                <>
                  <button
                    type="button"
                    onClick={() => local.onNavigate(index())}
                    disabled={isLast()}
                    class={cn(
                      "hover:text-primary hover:underline truncate transition-colors",
                      isLast()
                        ? "font-medium text-foreground cursor-default"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.name}
                  </button>
                  <Show when={!isLast()}>
                    <span class="text-muted-foreground/50 shrink-0">
                      {local.separatorIcon}
                    </span>
                  </Show>
                </>
              );
            }}
          </For>
        </Show>
      </div>
    </div>
  );
}
