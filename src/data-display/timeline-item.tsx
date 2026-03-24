import type { Component, ComponentProps, JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../cn";

type TimelineItemProps = ComponentProps<"div"> & {
	icon: JSX.Element;
	iconBg?: string;
	iconClass?: string;
	showConnector?: boolean;
};

const TimelineItem: Component<TimelineItemProps> = (props) => {
	const [local, others] = splitProps(props, [
		"icon",
		"iconBg",
		"iconClass",
		"showConnector",
		"children",
		"class",
	]);
	return (
		<div class={cn("relative flex w-full", local.class)} {...others}>
			<div class="flex flex-col items-center mr-4">
				<div
					class={cn(
						"w-5 h-5 rounded-full shadow-sm mt-2 z-10 flex items-center justify-center",
						local.iconBg ?? "bg-muted-foreground/30",
						local.iconClass,
					)}
				>
					{local.icon}
				</div>
				{local.showConnector !== false && (
					<div class="flex-1 border-r border-border w-0 self-center h-full min-h-[28px] mt-1" />
				)}
			</div>
			<div class="flex-1 pb-3">{local.children}</div>
		</div>
	);
};

/**
 * # TimelineItem
 *
 * Timeline entry with a circle icon and optional vertical connector line.
 * Used in activity timelines and note lists.
 *
 * @example
 * ```
 * <TimelineItem
 *   icon={<Activity size={12} class="text-muted-foreground" />}
 *   iconBg="bg-primary"
 * >
 *   <div>Event content here</div>
 * </TimelineItem>
 * ```
 */
export { TimelineItem };
export type { TimelineItemProps };
