/**
 * usePresenceCursor - Hook for managing cursor position and zoom awareness
 */
import { createSignal } from "solid-js";
import type { WebsocketProvider } from "y-websocket";
import type { CoordConverter, PresenceCursor } from "./types.ts";

export interface UsePresenceCursorOptions {
	provider: () => WebsocketProvider | null;
}

export interface UsePresenceCursorReturn {
	contentViewerConverter: () => CoordConverter | null;
	registerContentViewer: (converter: CoordConverter) => () => void;
	updateCursor: (x: number, y: number) => void;
	clearCursor: () => void;
	updateZoom: (zoom: number) => void;
}

export function usePresenceCursor(
	options: UsePresenceCursorOptions,
): UsePresenceCursorReturn {
	const [contentViewerConverter, setContentViewerConverter] =
		createSignal<CoordConverter | null>(null);

	const getDocumentMetrics = () => {
		const body = document.body;
		const root = document.documentElement;
		return {
			width: Math.max(
				root?.scrollWidth ?? 0,
				root?.clientWidth ?? 0,
				body?.scrollWidth ?? 0,
				body?.clientWidth ?? 0,
				window.innerWidth,
			),
			height: Math.max(
				root?.scrollHeight ?? 0,
				root?.clientHeight ?? 0,
				body?.scrollHeight ?? 0,
				body?.clientHeight ?? 0,
				window.innerHeight,
			),
		};
	};

	const registerContentViewer = (converter: CoordConverter) => {
		setContentViewerConverter(converter);
		return () => setContentViewerConverter(null);
	};

	const updateCursor = (x: number, y: number) => {
		const prov = options.provider();
		if (!prov) return;

		const converter = contentViewerConverter();
		let cursor: PresenceCursor;
		if (converter) {
			const contentCoord = converter.screenToContent(x, y);
			cursor = {
				x: contentCoord.x,
				y: contentCoord.y,
				isContentCoord: true,
				renderInOverlay: converter.renderInOverlay,
			};
		} else {
			const documentMetrics = getDocumentMetrics();
			cursor = {
				x,
				y,
				isContentCoord: false,
				pageX: window.scrollX + x,
				pageY: window.scrollY + y,
				documentWidth: documentMetrics.width,
				documentHeight: documentMetrics.height,
			};
		}

		prov.awareness.setLocalStateField("presenceCursor", cursor);
	};

	const clearCursor = () => {
		const prov = options.provider();
		if (!prov) return;
		prov.awareness.setLocalStateField("presenceCursor", null);
	};

	const updateZoom = (zoom: number) => {
		const prov = options.provider();
		if (!prov) return;
		prov.awareness.setLocalStateField("zoom", zoom);
	};

	return {
		contentViewerConverter,
		registerContentViewer,
		updateCursor,
		clearCursor,
		updateZoom,
	};
}
