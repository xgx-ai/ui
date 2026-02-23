import { type JSX, type ParentProps, splitProps } from "solid-js";
import { cn } from "../cn";

export interface SidebarProps extends ParentProps {
  class?: string;
}

/** Dark sidebar container */
export function Sidebar(props: SidebarProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <aside class={cn("w-60 bg-gray-900 p-4 text-white", local.class)} {...rest}>
      {local.children}
    </aside>
  );
}

export interface SidebarHeaderProps extends ParentProps {
  class?: string;
}

/** Sidebar header/title */
export function SidebarHeader(props: SidebarHeaderProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("mb-8 text-xl font-bold", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export interface SidebarNavProps extends ParentProps {
  class?: string;
}

/** Sidebar navigation container */
export function SidebarNav(props: SidebarNavProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <nav class={cn("space-y-1", local.class)} {...rest}>
      {local.children}
    </nav>
  );
}

export interface SidebarNavItemProps extends ParentProps {
  href: string;
  class?: string;
  active?: boolean;
}

/** Sidebar navigation link */
export function SidebarNavItem(props: SidebarNavItemProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "href",
    "class",
    "active",
    "children",
  ]);
  return (
    <a
      href={local.href}
      class={cn(
        "block rounded-md px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white",
        local.active && "bg-gray-700 text-white",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </a>
  );
}

export interface SidebarLayoutProps extends ParentProps {
  class?: string;
}

/** Full height flex container for sidebar layout */
export function SidebarLayout(props: SidebarLayoutProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("flex min-h-screen", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export interface SidebarMainProps extends ParentProps {
  class?: string;
}

/** Main content area next to sidebar */
export function SidebarMain(props: SidebarMainProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <main class={cn("flex-1 bg-gray-50 p-8", local.class)} {...rest}>
      {local.children}
    </main>
  );
}
