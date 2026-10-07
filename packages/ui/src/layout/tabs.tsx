/**
 * # Tabs
 *
 * Switches between related panels.
 *
 * @example
 * ```tsx
 * <Tabs defaultValue="overview">
 *   <TabsList>
 *     <TabsTrigger value="overview">Overview</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="overview">Summary</TabsContent>
 * </Tabs>
 * ```
 */
import type { ComponentProps, JSX } from "@solidjs/web";
import { createContext, createSignal, createUniqueId, omit, Show, useContext } from "solid-js";
import { cn } from "../cn";

type TabsVariant = "underline" | "segmented";

type TabsProps = Omit<ComponentProps<"div">, "onChange"> & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** "underline" (default) or "segmented": a muted track with a raised selected tab. */
  variant?: TabsVariant;
};

const TabsContext = createContext<{
  baseId: string;
  value: () => string | undefined;
  setValue: (value: string) => void;
  variant: () => TabsVariant;
}>({
  baseId: "tabs",
  value: () => undefined,
  setValue: () => {},
  variant: () => "underline",
});

const Tabs = (props: TabsProps) => {
  const local = props;
  const others = omit(props, "class", "children", "value", "defaultValue", "onChange", "variant");
  const [uncontrolledValue, setUncontrolledValue] = createSignal(local.defaultValue);
  const baseId = createUniqueId();
  const value = () => local.value ?? uncontrolledValue();
  const setValue = (next: string) => {
    if (local.value === undefined) setUncontrolledValue(next);
    local.onChange?.(next);
  };

  return (
    <TabsContext value={{ baseId, value, setValue, variant: () => local.variant ?? "underline" }}>
      <div
        class={local.class}
        {...others}
        data-slot="tabs"
        data-tabs-variant={local.variant ?? "underline"}
      >
        {local.children}
      </div>
    </TabsContext>
  );
};

type TabsListProps = ComponentProps<"div">;

const listVariants: Record<TabsVariant, string> = {
  underline:
    "inline-flex min-h-9 items-center gap-5 border-b border-border-subtle text-muted-foreground",
  segmented:
    "inline-flex h-8 items-center justify-center rounded-md bg-surface-muted p-1 text-muted-foreground",
};

const TabsList = (props: TabsListProps) => {
  const context = useContext(TabsContext);
  const local = props;
  const others = omit(props, "class");
  return (
    <div
      role="tablist"
      data-slot="tabs-list"
      data-tabs-variant={context.variant()}
      class={cn(listVariants[context.variant()], local.class)}
      {...others}
    />
  );
};

const triggerVariants: Record<TabsVariant, string> = {
  underline:
    "relative inline-flex h-9 items-center justify-center whitespace-nowrap px-0 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[selected]:text-foreground data-[selected]:after:bg-selected",
  segmented:
    "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-surface-raised data-[selected]:text-surface-raised-foreground data-[selected]:shadow-elevation-low",
};

type TabsTriggerProps = Omit<ComponentProps<"button">, "value"> & {
  value: string;
};

const TabsTrigger = (props: TabsTriggerProps) => {
  const context = useContext(TabsContext);
  const local = props;
  const others = omit(props, "class", "value", "disabled", "onClick", "onKeyDown", "type");
  const selected = () => context.value() === local.value;
  const safeValue = () => local.value.replace(/[^a-zA-Z0-9_-]/g, "-");
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented && !local.disabled) context.setValue(local.value);
  };
  const onKeyDown: JSX.EventHandler<HTMLButtonElement, KeyboardEvent> = (event) => {
    const handler = local.onKeyDown as
      | JSX.EventHandler<HTMLButtonElement, KeyboardEvent>
      | undefined;
    handler?.(event);
    if (event.defaultPrevented) return;

    const list = event.currentTarget.closest('[role="tablist"]');
    const tabs = Array.from(
      list?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])') ?? [],
    );
    const current = tabs.indexOf(event.currentTarget);
    if (current < 0) return;

    let next = current;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (current + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (current - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  };

  return (
    <button
      id={`${context.baseId}-trigger-${safeValue()}`}
      type={local.type ?? "button"}
      role="tab"
      data-slot="tabs-trigger"
      data-tabs-variant={context.variant()}
      aria-controls={`${context.baseId}-panel-${safeValue()}`}
      aria-selected={selected() ? "true" : "false"}
      disabled={local.disabled}
      tabindex={selected() ? 0 : -1}
      data-selected={selected() ? "" : undefined}
      class={cn(triggerVariants[context.variant()], local.class)}
      onClick={onClick}
      onKeyDown={onKeyDown}
      {...others}
    />
  );
};

type TabsContentProps = ComponentProps<"div"> & {
  value: string;
};

const TabsContent = (props: TabsContentProps) => {
  const context = useContext(TabsContext);
  const local = props;
  const others = omit(props, "class", "children", "value");
  const safeValue = () => local.value.replace(/[^a-zA-Z0-9_-]/g, "-");

  return (
    <Show when={context.value() === local.value}>
      <div
        id={`${context.baseId}-panel-${safeValue()}`}
        role="tabpanel"
        data-slot="tabs-content"
        data-tabs-variant={context.variant()}
        aria-labelledby={`${context.baseId}-trigger-${safeValue()}`}
        class={cn(
          context.variant() === "segmented" ? "mt-2" : "mt-3",
          "ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          local.class,
        )}
        {...others}
      >
        {local.children}
      </div>
    </Show>
  );
};

type TabsIndicatorProps = ComponentProps<"div">;

const TabsIndicator = (props: TabsIndicatorProps) => {
  const context = useContext(TabsContext);
  const local = props;
  const others = omit(props, "class");
  return (
    <div
      data-slot="tabs-indicator"
      data-tabs-variant={context.variant()}
      class={cn("absolute h-0.5 rounded-full bg-selected transition-all", local.class)}
      {...others}
    />
  );
};

export type { TabsContentProps, TabsListProps, TabsProps, TabsTriggerProps, TabsVariant };
export { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger };
