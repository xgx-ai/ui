// @ts-nocheck
import type { Viewport } from "@xyflow/system";
import type { Edge, Node } from "../types";
import { useStore } from "./useStore";

export function useNodes() {
	const store = useStore();
	return {
		get current() {
			return store.nodes;
		},
		set current(nodes) {
			store.nodes = nodes;
		},
		update(updateFn: (nodes: Node[]) => Node[]) {
			store.nodes = updateFn(store.nodes);
		},
		set(nodes: Node[]) {
			store.nodes = nodes;
		},
	};
}

export function useEdges() {
	const store = useStore();
	return {
		get current() {
			return store.edges;
		},
		set current(edges) {
			store.edges = edges;
		},
		update(updateFn: (edges: Edge[]) => Edge[]) {
			store.edges = updateFn(store.edges);
		},
		set(edges: Edge[]) {
			store.edges = edges;
		},
	};
}

export function useViewport() {
	const store = useStore();
	return {
		get current() {
			return store.viewport;
		},
		set current(viewport: Viewport) {
			store.viewport = viewport;
		},
		update(updateFn: (viewport: Viewport) => Viewport) {
			store.viewport = updateFn(store.viewport);
		},
		set(viewport: Viewport) {
			store.viewport = viewport;
		},
	};
}
