import { type JSX, type ParentProps, splitProps } from "solid-js";
import { cn } from "../cn";

// ---------------------------------------------------------------------------
// Sidebar – fixed icon-rail sidebar with header, nav, and footer slots
// ---------------------------------------------------------------------------

export interface SidebarProps extends ParentProps {
	class?: string;
	/** Width of the sidebar. Defaults to `w-14` (icon-only rail). */
	width?: string;
}

/** Fixed sidebar container with a vertical flex layout spanning the full viewport height. */
export function Sidebar(props: SidebarProps): JSX.Element {
	const [local, rest] = splitProps(props, ["class", "children", "width"]);
	return (
		<aside
			class={cn(
				"fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-sidebar text-sidebar-foreground",
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
// SidebarHeader – top section (e.g. logo)
// ---------------------------------------------------------------------------

export interface SidebarHeaderProps extends ParentProps {
	class?: string;
}

/** Top section of the sidebar, typically used for a logo or brand mark. */
export function SidebarHeader(props: SidebarHeaderProps): JSX.Element {
	const [local, rest] = splitProps(props, ["class", "children"]);
	return (
		<div
			class={cn("flex shrink-0 items-center justify-center p-2", local.class)}
			{...rest}
		>
			{local.children}
		</div>
	);
}

// ---------------------------------------------------------------------------
// SidebarNav – scrollable navigation area
// ---------------------------------------------------------------------------

export interface SidebarNavProps extends ParentProps {
	class?: string;
}

/** Scrollable middle section for navigation items. Grows to fill available space. */
export function SidebarNav(props: SidebarNavProps): JSX.Element {
	const [local, rest] = splitProps(props, ["class", "children"]);
	return (
		<nav
			class={cn(
				"flex flex-1 flex-col items-center gap-1 overflow-y-auto p-2",
				local.class,
			)}
			{...rest}
		>
			{local.children}
		</nav>
	);
}

// ---------------------------------------------------------------------------
// SidebarNavItem – single navigation link with active state
// ---------------------------------------------------------------------------

export interface SidebarNavItemProps extends ParentProps {
	href: string;
	class?: string;
	active?: boolean;
	title?: string;
}

/** A single navigation link. Renders as a centred icon button by default. */
export function SidebarNavItem(props: SidebarNavItemProps): JSX.Element {
	const [local, rest] = splitProps(props, [
		"href",
		"class",
		"active",
		"children",
		"title",
	]);
	return (
		<a
			href={local.href}
			title={local.title}
			class={cn(
				"flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
				local.active &&
					"bg-sidebar-accent text-sidebar-accent-foreground",
				local.class,
			)}
			{...rest}
		>
			{local.children}
		</a>
	);
}

// ---------------------------------------------------------------------------
// SidebarFooter – pinned bottom section (user button, notifications, etc.)
// ---------------------------------------------------------------------------

export interface SidebarFooterProps extends ParentProps {
	class?: string;
}

/** Bottom-pinned section for user controls, notifications, and other actions. */
export function SidebarFooter(props: SidebarFooterProps): JSX.Element {
	const [local, rest] = splitProps(props, ["class", "children"]);
	return (
		<div
			class={cn(
				"flex shrink-0 flex-col items-center gap-1 p-2",
				local.class,
			)}
			{...rest}
		>
			{local.children}
		</div>
	);
}

// ---------------------------------------------------------------------------
// SidebarLayout – page-level flex wrapper
// ---------------------------------------------------------------------------

export interface SidebarLayoutProps extends ParentProps {
	class?: string;
}

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

export interface SidebarMainProps extends ParentProps {
	class?: string;
	/** Left offset matching the sidebar width. Defaults to `pl-14`. */
	offset?: string;
}

/** Main content area. Applies a left offset to clear the fixed sidebar. */
export function SidebarMain(props: SidebarMainProps): JSX.Element {
	const [local, rest] = splitProps(props, ["class", "children", "offset"]);
	return (
		<main
			class={cn(
				"flex-1",
				local.offset ?? "pl-14",
				local.class,
			)}
			{...rest}
		>
			{local.children}
		</main>
	);
}
