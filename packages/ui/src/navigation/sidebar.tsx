import type { JSX } from "@solidjs/web";
import { splitProps } from "../utils/split-props";
import { type Component, type ParentProps } from "solid-js";
import { Dynamic } from "@solidjs/web";
import { cn } from "../cn";

// ---------------------------------------------------------------------------
// Sidebar – fixed icon-rail sidebar with header, nav, and footer slots
// ---------------------------------------------------------------------------

export type SidebarProps = ParentProps<
  JSX.HTMLAttributes<HTMLElement> & {
    class?: string;
    /** Width of the sidebar. Defaults to `w-14` (icon-only rail). */
    width?: string;
  }
>;

/** Fixed sidebar container with a vertical flex layout spanning the full viewport height. */
export function Sidebar(props: SidebarProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children", "width"]);
  return (
    <aside
      class={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        local.width ?? "w-14",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// SidebarHeader – top section
// ---------------------------------------------------------------------------

export type SidebarHeaderProps = ParentProps<
  JSX.HTMLAttributes<HTMLDivElement> & {
    class?: string;
  }
>;

/** Top section of the sidebar. */
export function SidebarHeader(props: SidebarHeaderProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("flex shrink-0 items-center justify-center p-2", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SidebarNav – scrollable navigation area
// ---------------------------------------------------------------------------

export type SidebarNavProps = ParentProps<
  JSX.HTMLAttributes<HTMLElement> & {
    class?: string;
  }
>;

/** Scrollable middle section for navigation items. Grows to fill available space. */
export function SidebarNav(props: SidebarNavProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <nav
      class={cn("flex flex-1 flex-col items-center gap-1 overflow-y-auto p-2", local.class)}
      {...rest}
    >
      {local.children}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// SidebarNavItem – single navigation link with active state
// ---------------------------------------------------------------------------

export type SidebarNavItemProps = ParentProps<
  Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "title"> & {
    href?: string;
    class?: string;
    active?: boolean;
    title?: string;
    shape?: "rounded" | "circle";
    /** Render a custom element (e.g. a router Link) instead of a plain `<a>`. */
    as?: Component<any> | string;
    /** Alias for `href` — used by routers that expect a `to` prop. */
    to?: string;
  }
>;

/** A single navigation link. Renders as a centred icon button by default. */
export function SidebarNavItem(props: SidebarNavItemProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "as",
    "href",
    "to",
    "class",
    "active",
    "children",
    "title",
    "shape",
  ]);
  return (
    <Dynamic
      component={local.as ?? "a"}
      href={local.href ?? local.to}
      to={local.to ?? local.href}
      title={local.title}
      aria-current={local.active ? "page" : undefined}
      data-active={local.active ? "" : undefined}
      class={cn(
        "flex size-8 items-center justify-center text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:pointer-events-none disabled:opacity-50",
        (local.shape ?? "rounded") === "circle" ? "rounded-full" : "rounded-md",
        local.active &&
          "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </Dynamic>
  );
}

// ---------------------------------------------------------------------------
// SidebarFooter – pinned bottom section (user button, notifications, etc.)
// ---------------------------------------------------------------------------

export type SidebarFooterProps = ParentProps<
  JSX.HTMLAttributes<HTMLDivElement> & {
    class?: string;
  }
>;

/** Bottom-pinned section for user controls, notifications, and other actions. */
export function SidebarFooter(props: SidebarFooterProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("flex shrink-0 flex-col items-center gap-1 p-2", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export type SidebarAccountProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "title"> & {
  class?: string;
  initials?: string;
  status?: "online" | "away" | "busy" | "offline";
  title?: string;
};

const sidebarAccountStatusClass: Record<NonNullable<SidebarAccountProps["status"]>, string> = {
  online: "bg-success-foreground",
  away: "bg-warning-foreground",
  busy: "bg-error-foreground",
  offline: "bg-muted-foreground",
};

/** Account/session presence control for icon-rail sidebars. */
export function SidebarAccount(props: SidebarAccountProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "initials", "status", "title", "children"]);
  const status = () => local.status ?? "online";

  return (
    <button
      type="button"
      title={local.title}
      aria-label={local.title ?? "Account"}
      class={cn(
        "relative flex size-8 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent text-[10px] font-semibold uppercase text-sidebar-accent-foreground transition-colors hover:bg-sidebar-primary hover:text-sidebar-primary-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:pointer-events-none disabled:opacity-50",
        local.class,
      )}
      {...rest}
    >
      <span aria-hidden="true">{local.children ?? local.initials ?? "U"}</span>
      <span
        aria-hidden="true"
        class={cn(
          "absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-sidebar",
          sidebarAccountStatusClass[status()],
        )}
      />
      <span class="sr-only">{status()}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// SidebarLayout – page-level flex wrapper
// ---------------------------------------------------------------------------

export type SidebarLayoutProps = ParentProps<
  JSX.HTMLAttributes<HTMLDivElement> & {
    class?: string;
  }
>;

/** Full-height flex container for a sidebar + main content layout. */
export function SidebarLayout(props: SidebarLayoutProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("flex min-h-screen", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SidebarMain – main content area offset by sidebar width
// ---------------------------------------------------------------------------

export type SidebarMainProps = ParentProps<
  JSX.HTMLAttributes<HTMLElement> & {
    class?: string;
    /** Left offset matching the sidebar width. Defaults to `pl-14`. */
    offset?: string;
  }
>;

/** Main content area. Applies a left offset to clear the fixed sidebar. */
export function SidebarMain(props: SidebarMainProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children", "offset"]);
  return (
    <main class={cn("flex-1", local.offset ?? "pl-14", local.class)} {...rest}>
      {local.children}
    </main>
  );
}
