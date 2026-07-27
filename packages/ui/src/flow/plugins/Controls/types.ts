import type { PanelPosition } from "@xyflow/system";
import type { JSX } from "@solidjs/web";

import type { FitViewOptions } from "../../types";

export type ControlsProps = {
	position?: PanelPosition;
	showZoom?: boolean;
	showFitView?: boolean;
	showLock?: boolean;
	buttonBgColor?: string;
	buttonBgColorHover?: string;
	buttonColor?: string;
	buttonColorHover?: string;
	buttonBorderColor?: string;
	"aria-label"?: string;
	style?: string;
	class?: string;
	orientation?: "horizontal" | "vertical";
	children?: JSX.Element;
	before?: JSX.Element;
	after?: JSX.Element;
	fitViewOptions?: FitViewOptions;
} & JSX.HTMLAttributes<HTMLDivElement>;

export type ControlButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
	class?: string;
	bgColor?: string;
	bgColorHover?: string;
	color?: string;
	colorHover?: string;
	borderColor?: string;
	children?: JSX.Element;
};
