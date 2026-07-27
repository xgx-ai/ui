import { getNodeIdContext } from "../store/context";
import { useStore } from "./useStore";

export function useUpdateNodeInternals(): (nodeId?: string | string[]) => void {
	const store = useStore();
	const nodeId = getNodeIdContext();

	const updateInternals = (id?: string | string[]) => {
		if (!id && !nodeId) {
			throw new Error("When using outside of a node, you must provide an id.");
		}
		const updateIds = id ? (Array.isArray(id) ? id : [id]) : [nodeId];
		const updates = new Map();

		updateIds.forEach((updateId) => {
			const nodeElement = store.domNode?.querySelector(
				`.xy-flow__node[data-id="${updateId}"]`,
			) as HTMLDivElement;

			if (nodeElement) {
				updates.set(updateId, { id: updateId, nodeElement, force: true });
			}
		});

		requestAnimationFrame(() => store.updateNodeInternals(updates));
	};

	return updateInternals;
}
