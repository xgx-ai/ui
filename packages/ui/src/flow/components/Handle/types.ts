import type { HandleConnection, HandleProps as HandlePropsSystem, } from "@xyflow/system";
import type { JSX } from "@solidjs/web";


export type HandleProps = HandlePropsSystem & {
	class?: string;
	onconnect?: (connections: HandleConnection[]) => void;
	ondisconnect?: (connections: HandleConnection[]) => void;
	children?: JSX.Element;
} & JSX.HTMLAttributes<HTMLDivElement>;
