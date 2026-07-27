import type { PanelPosition } from "@xyflow/system";
import type { JSX } from "@solidjs/web";


export type PanelProps = JSX.HTMLAttributes<HTMLDivElement> & {
	"data-testid"?: string;
	"data-message"?: string;
	position?: PanelPosition;
	style?: string | JSX.CSSProperties;
	class?: string;
	children?: JSX.Element;
};
