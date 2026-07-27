import type { JSX } from "@solidjs/web";
import { omit, type ParentProps } from "solid-js";
import { cn } from "../cn.ts";

type ShellRegionProps<TElement extends HTMLElement = HTMLDivElement> = ParentProps<
  JSX.HTMLAttributes<TElement> & {
    class?: string | undefined;
  }
>;

export type AppShellProps = ShellRegionProps;

export function AppShell(props: AppShellProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");
  return (
    <div
      data-xgx-theme=""
      class={cn("min-h-screen bg-background text-foreground font-ui", local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export type AppTopbarProps = ShellRegionProps<HTMLElement>;

export function AppTopbar(props: AppTopbarProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");
  return (
    <header
      class={cn(
        "sticky top-0 z-20 flex min-h-12 items-center gap-3 border-b border-border-subtle bg-surface/95 px-4 text-surface-foreground backdrop-blur supports-[backdrop-filter]:bg-surface/85",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </header>
  );
}

export type AppMainProps = ShellRegionProps<HTMLElement>;

export function AppMain(props: AppMainProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");
  return (
    <main class={cn("min-h-0 flex-1 bg-background", local.class)} {...rest}>
      {local.children}
    </main>
  );
}

export type AppContentProps = ShellRegionProps;

export function AppContent(props: AppContentProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");
  return (
    <div class={cn("mx-auto flex w-full max-w-6xl flex-col gap-4 p-4", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export type AppPageHeaderProps = ShellRegionProps<HTMLElement>;

export function AppPageHeader(props: AppPageHeaderProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");
  return (
    <section
      class={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-3",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </section>
  );
}

export type AppPageHeadingProps = ShellRegionProps<HTMLDivElement>;

export function AppPageHeading(props: AppPageHeadingProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");
  return (
    <div class={cn("min-w-0 space-y-1", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export type AppPageActionsProps = ShellRegionProps<HTMLDivElement>;

export function AppPageActions(props: AppPageActionsProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");
  return (
    <div class={cn("flex flex-wrap items-center gap-2", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export type CommandRegionProps = ShellRegionProps<HTMLElement>;

export function CommandRegion(props: CommandRegionProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");
  return (
    <section
      class={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-surface-foreground",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </section>
  );
}

export type DetailPanelProps = ShellRegionProps<HTMLElement>;

export function DetailPanel(props: DetailPanelProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");
  return (
    <aside
      class={cn(
        "min-w-0 rounded-lg border border-border-subtle bg-surface text-surface-foreground",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </aside>
  );
}
