// @ts-nocheck
import { Show } from "solid-js";
import { Panel } from "../../container/Panel";
import { useStore } from "../../store";
import { ControlButton } from "./ControlButton";
import { FitViewIcon } from "./Icons/Fit";
import { LockIcon } from "./Icons/Lock";
import { MinusIcon } from "./Icons/Minus";
import { PlusIcon } from "./Icons/Plus";
import { UnlockIcon } from "./Icons/Unlock";
import type { ControlsProps } from "./types";
import { splitProps } from "../../../utils/split-props";

export function Controls(allProps: ControlsProps) {
	const [props, rest] = splitProps(allProps, [
		"position",
		"orientation",
		"showZoom",
		"showFitView",
		"showLock",
		"style",
		"class",
		"buttonBgColor",
		"buttonBgColorHover",
		"buttonColor",
		"buttonColorHover",
		"buttonBorderColor",
		"fitViewOptions",
		"children",
		"before",
		"after",
	]);

	const store = useStore();

	const buttonProps = () => ({
		bgColor: props.buttonBgColor,
		bgColorHover: props.buttonBgColorHover,
		color: props.buttonColor,
		colorHover: props.buttonColorHover,
		borderColor: props.buttonBorderColor,
	});

	const isInteractive = () =>
		store.nodesDraggable || store.nodesConnectable || store.elementsSelectable;
	const minZoomReached = () => store.viewport.zoom <= store.minZoom;
	const maxZoomReached = () => store.viewport.zoom >= store.maxZoom;
	const orientationClass = () =>
		(props.orientation ?? "vertical") === "horizontal"
			? "horizontal"
			: "vertical";

	return (
		<Panel
			class={`xy-flow__controls ${orientationClass()} ${props.class ?? ""}`}
			position={props.position ?? "bottom-left"}
			data-testid="xy-flow__controls"
			aria-label={store.ariaLabelConfig["controls.ariaLabel"]}
			style={props.style}
			{...rest}
		>
			{props.before}
			<Show when={props.showZoom ?? true}>
				<ControlButton
					onClick={() => store.zoomIn()}
					class="xy-flow__controls-zoomin"
					title={store.ariaLabelConfig["controls.zoomIn.ariaLabel"]}
					aria-label={store.ariaLabelConfig["controls.zoomIn.ariaLabel"]}
					disabled={maxZoomReached()}
					{...buttonProps()}
				>
					<PlusIcon />
				</ControlButton>
				<ControlButton
					onClick={() => store.zoomOut()}
					class="xy-flow__controls-zoomout"
					title={store.ariaLabelConfig["controls.zoomOut.ariaLabel"]}
					aria-label={store.ariaLabelConfig["controls.zoomOut.ariaLabel"]}
					disabled={minZoomReached()}
					{...buttonProps()}
				>
					<MinusIcon />
				</ControlButton>
			</Show>
			<Show when={props.showFitView ?? true}>
				<ControlButton
					class="xy-flow__controls-fitview"
					onClick={() => store.fitView(props.fitViewOptions)}
					title={store.ariaLabelConfig["controls.fitView.ariaLabel"]}
					aria-label={store.ariaLabelConfig["controls.fitView.ariaLabel"]}
					{...buttonProps()}
				>
					<FitViewIcon />
				</ControlButton>
			</Show>
			<Show when={props.showLock ?? true}>
				<ControlButton
					class="xy-flow__controls-interactive"
					onClick={() => {
						const interactive = !isInteractive();
						store.nodesDraggable = interactive;
						store.nodesConnectable = interactive;
						store.elementsSelectable = interactive;
					}}
					title={store.ariaLabelConfig["controls.interactive.ariaLabel"]}
					aria-label={store.ariaLabelConfig["controls.interactive.ariaLabel"]}
					{...buttonProps()}
				>
					<Show when={isInteractive()} fallback={<LockIcon />}>
						<UnlockIcon />
					</Show>
				</ControlButton>
			</Show>
			{props.children}
			{props.after}
		</Panel>
	);
}
