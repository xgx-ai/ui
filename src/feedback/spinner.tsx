import { cn } from "../cn";

interface SpinnerProps {
	class?: string;
	/** Predefined size */
	size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
	xs: "w-3 h-3",
	sm: "w-4 h-4",
	md: "w-6 h-6",
	lg: "w-8 h-8",
	xl: "w-12 h-12",
};

/**
 * # Spinner
 *
 * Animated loading spinner with configurable size.
 *
 * @example
 * ```
 * <div class="flex items-center gap-4">
 *   <Spinner size="sm" />
 *   <Spinner size="md" />
 *   <Spinner size="lg" />
 *   <Spinner size="xl" class="text-primary" />
 * </div>
 * ```
 */
export function Spinner(props: SpinnerProps) {
	return (
		<div
			class={cn(
				sizeClasses[props.size ?? "md"],
				"text-muted-foreground",
				props.class,
			)}
		>
			<style>
				{`
					@keyframes spinner_rotate {
						100% { transform: rotate(360deg); }
					}
					@keyframes spinner_dash {
						0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
						50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
						100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
					}
				`}
			</style>
			<svg
				viewBox="0 0 50 50"
				aria-hidden="true"
				style={{ animation: "spinner_rotate 2s linear infinite" }}
			>
				<circle
					cx="25"
					cy="25"
					r="21"
					fill="none"
					stroke="currentcolor"
					stroke-width="6"
					style={{
						"stroke-linecap": "round",
						animation: "spinner_dash 1.5s ease-in-out infinite",
					}}
				/>
			</svg>
		</div>
	);
}
