// @ts-nocheck
import type { SolidFlowStore } from "../../store/types";
import type { Edge, KeyDefinition, Node } from "../../types";

export type KeyHandlerProps<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
> = {
	store: SolidFlowStore<NodeType, EdgeType>;
	selectionKey?: KeyDefinition | KeyDefinition[] | null;
	multiSelectionKey?: KeyDefinition | KeyDefinition[] | null;
	deleteKey?: KeyDefinition | KeyDefinition[] | null;
	panActivationKey?: KeyDefinition | KeyDefinition[] | null;
	zoomActivationKey?: KeyDefinition | KeyDefinition[] | null;
};
