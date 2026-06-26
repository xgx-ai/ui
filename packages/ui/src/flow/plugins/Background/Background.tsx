// @ts-nocheck
import { createMemo, Show } from "solid-js";
import { useStore } from "../../store";
import { type BackgroundProps, BackgroundVariant } from "./types";

const defaultSize = {
	[BackgroundVariant.Dots]: 1,
	[BackgroundVariant.Lines]: 1,
	[BackgroundVariant.Cross]: 6,
};

export function Background(props: BackgroundProps) {
	const store = useStore();

	const variant = () => props.variant ?? BackgroundVariant.Dots;
	const gap = () => props.gap ?? 20;
	const lineWidth = () => props.lineWidth ?? 1;
	const isDots = () => variant() === BackgroundVariant.Dots;
	const isCross = () => variant() === BackgroundVariant.Cross;
	const gapXY = () =>
		Array.isArray(gap())
			? (gap() as [number, number])
			: [gap() as number, gap() as number];

	const patternId = createMemo(
		() => `background-pattern-${store.flowId}-${props.id ?? ""}`,
	);
	const scaledGap = createMemo(() => [
		gapXY()[0] * store.viewport.zoom || 1,
		gapXY()[1] * store.viewport.zoom || 1,
	]);
	const scaledSize = createMemo(
		() => (props.size ?? defaultSize[variant()]) * store.viewport.zoom,
	);

	const patternDimensions = createMemo(
		() =>
			(isCross() ? [scaledSize(), scaledSize()] : scaledGap()) as [
				number,
				number,
			],
	);
	const patternOffset = createMemo(() =>
		isDots()
			? [scaledSize() / 2, scaledSize() / 2]
			: [patternDimensions()[0] / 2, patternDimensions()[1] / 2],
	);

	return (
		<svg
			class={`xy-flow__background xy-flow__container ${props.class ?? ""}`}
			data-testid="xy-flow__background"
			style={{
				"--xy-background-color-props": props.bgColor,
				"--xy-background-pattern-color-props": props.patternColor,
			}}
		>
			<pattern
				id={patternId()}
				x={store.viewport.x % scaledGap()[0]}
				y={store.viewport.y % scaledGap()[1]}
				width={scaledGap()[0]}
				height={scaledGap()[1]}
				patternUnits="userSpaceOnUse"
				patternTransform={`translate(-${patternOffset()[0]},-${patternOffset()[1]})`}
			>
				<Show
					when={isDots()}
					fallback={
						<path
							stroke-width={lineWidth()}
							d={`M${patternDimensions()[0] / 2} 0 V${patternDimensions()[1]} M0 ${patternDimensions()[1] / 2} H${patternDimensions()[0]}`}
							class={`xy-flow__background-pattern ${variant()} ${props.patternClass ?? ""}`}
						/>
					}
				>
					<circle
						cx={scaledSize() / 2}
						cy={scaledSize() / 2}
						r={scaledSize() / 2}
						class={`xy-flow__background-pattern dots ${props.patternClass ?? ""}`}
					/>
				</Show>
			</pattern>
			<rect
				x="0"
				y="0"
				width="100%"
				height="100%"
				fill={`url(#${patternId()})`}
			/>
		</svg>
	);
}
