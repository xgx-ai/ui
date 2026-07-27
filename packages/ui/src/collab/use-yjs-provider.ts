/**
 * useYjsProvider - Hook for managing Y.Doc and WebSocket provider
 */
import { createEffect, createMemo, createSignal } from "solid-js";
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

	createEffect(
		() => [ydoc(), wsUrl(), options.projectId, options.docName] as const,
		([doc, url, projectId, docName]) => {
			// Create WebSocket provider - use project: prefix for project tree docs
			const wsProvider = new WebsocketProvider(
				url,
				docName ?? `yjs/project:${projectId}`,
				doc,
				{ connect: true },
			);

			setProvider(wsProvider);

			// Handle connection status
			wsProvider.on("status", (event: { status: string }) => {
				setIsConnected(event.status === "connected");
			});

			return () => {
				wsProvider.destroy();
			};
		},
	);

	return {
		ydoc,
		provider,
		isConnected,
		wsUrl,
	};
}
