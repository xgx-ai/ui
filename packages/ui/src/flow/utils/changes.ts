import type { EdgeChange, NodeChange } from "@xyflow/system";
import type { Edge, Node } from "../types";

function applyChange(change: any, element: any) {
	switch (change.type) {
		case "select": {
			element.selected = change.selected;
			break;
		}
		case "position": {
			if (typeof change.position !== "undefined") {
				element.position = change.position;
			}
			if (typeof change.dragging !== "undefined") {
				element.dragging = change.dragging;
			}
			break;
		}
		case "dimensions": {
			if (typeof change.dimensions !== "undefined") {
				element.measured = { ...change.dimensions };
				if (change.setAttributes) {
					if (
						change.setAttributes === true ||
						change.setAttributes === "width"
					) {
						element.width = change.dimensions.width;
					}
					if (
						change.setAttributes === true ||
						change.setAttributes === "height"
					) {
						element.height = change.dimensions.height;
					}
				}
			}
			if (typeof change.resizing === "boolean") {
				element.resizing = change.resizing;
			}
			break;
		}
	}
}

function applyChanges(changes: any[], elements: any[]): any[] {
	const updatedElements: any[] = [];
	const changesMap = new Map<any, any[]>();
	const addItemChanges: any[] = [];

	for (const change of changes) {
		if (change.type === "add") {
			addItemChanges.push(change);
		} else if (change.type === "remove" || change.type === "replace") {
			changesMap.set(change.id, [change]);
		} else {
			const elementChanges = changesMap.get(change.id);
			if (elementChanges) {
				elementChanges.push(change);
			} else {
				changesMap.set(change.id, [change]);
			}
		}
	}

	for (const element of elements) {
		const changes = changesMap.get(element.id);

		if (!changes) {
			updatedElements.push(element);
			continue;
		}

		if (changes[0].type === "remove") {
			continue;
		}

		if (changes[0].type === "replace") {
			updatedElements.push({ ...changes[0].item });
			continue;
		}

		const updatedElement = { ...element };
		for (const change of changes) {
			applyChange(change, updatedElement);
		}
		updatedElements.push(updatedElement);
	}

	if (addItemChanges.length) {
		addItemChanges.forEach((change) => {
			if (change.index !== undefined) {
				updatedElements.splice(change.index, 0, { ...change.item });
			} else {
				updatedElements.push({ ...change.item });
			}
		});
	}

	return updatedElements;
}

export function applyNodeChanges<NodeType extends Node = Node>(
	changes: NodeChange<NodeType>[],
	nodes: NodeType[],
): NodeType[] {
	return applyChanges(changes, nodes) as NodeType[];
}

export function applyEdgeChanges<EdgeType extends Edge = Edge>(
	changes: EdgeChange<EdgeType>[],
	edges: EdgeType[],
): EdgeType[] {
	return applyChanges(changes, edges) as EdgeType[];
}
