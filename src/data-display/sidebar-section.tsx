import type { Component, ComponentProps, JSX } from "solid-js";
import { Show, splitProps } from "solid-js";
import { cn } from "../cn";

type SidebarSectionProps = ComponentProps<"div"> & {
	title: string;
	action?: JSX.Element;
};

const SidebarSection: Component<SidebarSectionProps> = (props) => {
	const [local, others] = splitProps(props, [
		"title",
		"action",
		"children",
		"class",
	]);
	return (
		<div class={cn("pt-4 pb-3 px-3", local.class)} {...others}>
			<div class="flex items-center justify-between mb-1.5">
				<div class="text-[9px] font-medium text-black/30 uppercase tracking-widest">
					{local.title}
				</div>
				<Show when={local.action}>{local.action}</Show>
			</div>
			{local.children}
		</div>
	);
};

type SidebarRowProps = ComponentProps<"div"> & {
	label: string;
};

const SidebarRow: Component<SidebarRowProps> = (props) => {
	const [local, others] = splitProps(props, ["label", "children", "class"]);
	return (
		<div
			class={cn(
				"flex items-center justify-between py-1 text-[11px]",
				local.class,
			)}
			{...others}
		>
			<span class="text-black/35 shrink-0">{local.label}</span>
			<span class="text-black/70 text-right truncate ml-3">
				{local.children}
			</span>
		</div>
	);
};

/**
 * # SidebarSection / SidebarRow
 *
 * Sidebar layout primitives for detail sidebars with title + label/value rows.
 *
 * @example
 * ```
 * <SidebarSection title="Contact">
 *   <SidebarRow label="Email">john@example.com</SidebarRow>
 *   <SidebarRow label="Phone">+44 7700 900000</SidebarRow>
 * </SidebarSection>
 * ```
 */
export { SidebarRow, SidebarSection };
export type { SidebarRowProps, SidebarSectionProps };
