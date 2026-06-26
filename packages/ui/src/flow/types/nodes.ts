// @ts-nocheck
import type { InternalNodeBase, NodeBase, NodeProps as NodePropsBase, } from "@xyflow/system";
import type { Component } from "solid-js";
import type { JSX } from "@solidjs/web";

/**
 * The node data structure that gets used for internal nodes.
 * There are some data structures added under node.internal
 * that are needed for tracking some properties
 * @public
 */
export type InternalNode<NodeType extends Node = Node> =
	InternalNodeBase<NodeType>;

/**
 * The node data structure that gets used for the nodes prop.
 * @public
 */
export type Node<
	NodeData extends Record<string, unknown> = Record<string, unknown>,
	NodeType extends string | undefined = string | undefined,
> = NodeBase<NodeData, NodeType> & {
	class?: string;
	style?: JSX.CSSProperties | string;
	focusable?: boolean;
	/**
	 * The ARIA role attribute for the node element, used for accessibility.
	 * @default "group"
	 */
	ariaRole?: string;

	/**
	 * General escape hatch for adding custom attributes to the node's DOM element.
	 */
	domAttributes?: JSX.HTMLAttributes<HTMLDivElement>;
};

// @todo: currently generics for nodes are not really supported
export type NodeProps<NodeType extends Node = Node> =
	NodePropsBase<NodeType> & {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		type: any;
	};

export type NodeTypes = Record<
	string,
	Component<
		NodeProps & {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			data: any;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			type: any;
		}
	>
>;

export type BuiltInNode =
	| Node<{ label: string }, "input" | "output" | "default">
	| Node<Record<string, never>, "group">;
