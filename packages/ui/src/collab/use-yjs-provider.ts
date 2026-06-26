/**
 * useYjsProvider - Hook for managing Y.Doc and WebSocket provider
 */
import { createMemo, createSignal, onCleanup } from "solid-js";
import { onSignal } from "../solid-runtime/index.ts";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

export interface UseYjsProviderOptions {
	projectId: string;
	docName?: string;
}

export interface UseYjsProviderReturn {
	ydoc: () => Y.Doc;
	provider: () => WebsocketProvider | null;
	isConnected: () => boolean;
	wsUrl: () => string;
}

export function useYjsProvider(
	options: UseYjsProviderOptions,
): UseYjsProviderReturn {
	const [ydoc] = createSignal(new Y.Doc());
	const [provider, setProvider] = createSignal<WebsocketProvider | null>(null);
	const [isConnected, setIsConnected] = createSignal(false);

	const wsUrl = createMemo(() => {
		const backendUrl =
			import.meta.env.PUBLIC_BACKEND_URL ?? window.location.origin;
		return backendUrl.replace(/^http/, "ws");
	});

	onSignal(
		[ydoc, wsUrl, () => options.projectId] as const,
		([doc, url, projectId]) => {
			// Create WebSocket provider - use project: prefix for project tree docs
			const wsProvider = new WebsocketProvider(
				url,
				options.docName ?? `yjs/project:${projectId}`,
				doc,
				{ connect: true },
			);

			setProvider(wsProvider);

			// Handle connection status
			wsProvider.on("status", (event: { status: string }) => {
				setIsConnected(event.status === "connected");
			});

			onCleanup(() => {
				wsProvider.destroy();
			});
		},
	);

	return {
		ydoc,
		provider,
		isConnected,
		wsUrl,
	};
}
