// @ts-nocheck
import { isInputDOMNode, isMacOs } from "@xyflow/system";
import { createRenderEffect, onCleanup } from "solid-js";
import { useSolidFlow } from "../../hooks/useSolidFlow";
import type {
	Edge,
	KeyDefinition,
	KeyDefinitionObject,
	Node,
} from "../../types";
import type { KeyHandlerProps } from "./types";

/**
 * KeyHandler - replaces @svelte-put/shortcut with native keyboard event listeners.
 * Handles selection, multi-selection, delete, pan activation, and zoom activation keys.
 */
export function KeyHandler<
	NodeType extends Node = Node,
	EdgeType extends Edge = Edge,
>(props: KeyHandlerProps<NodeType, EdgeType>) {
	const selectionKey = () => props.selectionKey ?? "Shift";
	const multiSelectionKey = () =>
		props.multiSelectionKey ?? (isMacOs() ? "Meta" : "Control");
	const deleteKey = () => props.deleteKey ?? "Backspace";
	const panActivationKey = () => props.panActivationKey ?? " ";
	const zoomActivationKey = () =>
		props.zoomActivationKey ?? (isMacOs() ? "Meta" : "Control");

	const { deleteElements } = useSolidFlow<NodeType, EdgeType>();

	function isKeyObject(key?: KeyDefinition | null): key is KeyDefinitionObject {
		return key !== null && typeof key === "object";
	}

	function getKeyString(key?: KeyDefinition | null): string {
		if (key === null || key === undefined) return "";
		return isKeyObject(key) ? key.key : key;
	}

	function getModifiers(key?: KeyDefinition | null): string[] {
		if (!isKeyObject(key)) return [];
		const mod = key.modifier;
		if (!mod) return [];
		return Array.isArray(mod) ? mod : [mod];
	}

	function matchesKey(
		event: KeyboardEvent,
		keyDef: KeyDefinition | null | undefined,
	): boolean {
		if (keyDef === null || keyDef === undefined) return false;

		const keyString = getKeyString(keyDef);
		if (!keyString) return false;

		// Check the key matches
		if (event.key !== keyString) return false;

		// Check modifiers if specified
		const requiredModifiers = getModifiers(keyDef);
		for (const mod of requiredModifiers) {
			switch (mod) {
				case "ctrl":
					if (!event.ctrlKey) return false;
					break;
				case "shift":
					if (!event.shiftKey) return false;
					break;
				case "alt":
					if (!event.altKey) return false;
					break;
				case "meta":
					if (!event.metaKey) return false;
					break;
			}
		}

		return true;
	}

	function matchesAnyKey(
		event: KeyboardEvent,
		keyDef: KeyDefinition | KeyDefinition[] | null | undefined,
	): boolean {
		if (keyDef === null || keyDef === undefined) return false;
		const keys = Array.isArray(keyDef) ? keyDef : [keyDef];
		return keys.some((k) => matchesKey(event, k));
	}

	function resetKeysAndSelection() {
		props.store.selectionRect = null;
		props.store.selectionKeyPressed = false;
		props.store.multiselectionKeyPressed = false;
		props.store.deleteKeyPressed = false;
		props.store.panActivationKeyPressed = false;
		props.store.zoomActivationKeyPressed = false;
	}

	function handleDelete() {
		const selectedNodes = props.store.nodes.filter((node) => node.selected);
		const selectedEdges = props.store.edges.filter((edge) => edge.selected);

		deleteElements({
			nodes: selectedNodes,
			edges: selectedEdges,
		});
	}

	function onKeyDown(event: KeyboardEvent) {
		if (matchesAnyKey(event, selectionKey())) {
			props.store.selectionKeyPressed = true;
		}
		if (matchesAnyKey(event, multiSelectionKey())) {
			props.store.multiselectionKeyPressed = true;
		}
		if (matchesAnyKey(event, deleteKey())) {
			const isModifierKey = event.ctrlKey || event.metaKey || event.shiftKey;
			if (!isModifierKey && !isInputDOMNode(event)) {
				props.store.deleteKeyPressed = true;
				handleDelete();
			}
		}
		if (matchesAnyKey(event, panActivationKey())) {
			props.store.panActivationKeyPressed = true;
		}
		if (matchesAnyKey(event, zoomActivationKey())) {
			props.store.zoomActivationKeyPressed = true;
		}
	}

	function onKeyUp(event: KeyboardEvent) {
		if (matchesAnyKey(event, selectionKey())) {
			props.store.selectionKeyPressed = false;
		}
		if (matchesAnyKey(event, multiSelectionKey())) {
			props.store.multiselectionKeyPressed = false;
		}
		if (matchesAnyKey(event, deleteKey())) {
			props.store.deleteKeyPressed = false;
		}
		if (matchesAnyKey(event, panActivationKey())) {
			props.store.panActivationKeyPressed = false;
		}
		if (matchesAnyKey(event, zoomActivationKey())) {
			props.store.zoomActivationKeyPressed = false;
		}
	}

	createRenderEffect(() => undefined, () => {
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		window.addEventListener("blur", resetKeysAndSelection);
		window.addEventListener("contextmenu", resetKeysAndSelection);
	});

	onCleanup(() => {
		window.removeEventListener("keydown", onKeyDown);
		window.removeEventListener("keyup", onKeyUp);
		window.removeEventListener("blur", resetKeysAndSelection);
		window.removeEventListener("contextmenu", resetKeysAndSelection);
	});

	return null;
}
