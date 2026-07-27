import { onCleanup } from "solid-js";
import type { OnSelectionChange } from "../types";
import { useStore } from "./useStore";

export function useOnSelectionChange(onselectionchange: OnSelectionChange) {
	const store = useStore();
	const symbol = Symbol();

	store.selectionChangeHandlers.set(symbol, onselectionchange);

	onCleanup(() => {
		store.selectionChangeHandlers.delete(symbol);
	});
}
