import { Check } from "lucide-solid";
import type { Component, ComponentProps } from "solid-js";
import { For, Show, splitProps } from "solid-js";

import { cn } from "../cn";

/**
 * # Step Card
 *
 * Displays a completed step as a collapsed card that "locks in" user input.
 * Used in wizard-style flows where previous answers become immutable cards.
 *
 * @example
 * ```
 * <StepCard
 *   stepNumber={1}
 *   label="Project Name"
 *   value="E2E Test Docs"
 * />
 * ```
 */

export interface StepCardProps extends Omit<ComponentProps<"div">, "children"> {
	/** Step number to display */
	stepNumber: number;
	/** Label for the step (e.g., "Project Name") */
	label: string;
	/** The value/answer provided by the user */
	value: string;
	/** Optional secondary values for multi-field steps */
	secondaryValues?: Array<{ label: string; value: string }>;
	/** Whether this step is editable (shows edit affordance) */
	editable?: boolean;
	/** Callback when edit is requested */
	onEdit?: () => void;
}

export const StepCard: Component<StepCardProps> = (props) => {
	const [local, others] = splitProps(props, [
		"stepNumber",
		"label",
		"value",
		"secondaryValues",
		"editable",
		"onEdit",
		"class",
	]);

	return (
		<div
			class={cn(
				"group flex items-start gap-3 p-3 rounded-xl",
				"bg-muted/30 border border-border/50",
				"transition-all duration-200",
				local.editable && "hover:bg-muted/50 cursor-pointer",
				local.class,
			)}
			onClick={() => local.editable && local.onEdit?.()}
			{...others}
		>
			{/* Completed indicator */}
			<div class="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-secondary-foreground shrink-0">
				<Check class="w-3.5 h-3.5" strokeWidth={3} />
			</div>

			{/* Content */}
			<div class="flex-1 min-w-0">
				<p class="text-xs text-muted-foreground mb-0.5">{local.label}</p>
				<p class="text-sm font-medium text-foreground truncate">
					{local.value}
				</p>

				{/* Secondary values */}
				<Show when={local.secondaryValues?.length}>
					<div class="mt-2 space-y-1">
						<For each={local.secondaryValues}>
							{(item) => (
								<div class="flex items-center gap-2 text-xs">
									<span class="text-muted-foreground">{item.label}:</span>
									<span class="text-foreground">{item.value}</span>
								</div>
							)}
						</For>
					</div>
				</Show>
			</div>

			{/* Edit indicator (subtle) */}
			<Show when={local.editable}>
				<span class="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
					Edit
				</span>
			</Show>
		</div>
	);
};

export type { StepCardProps as StepCardProperties };
