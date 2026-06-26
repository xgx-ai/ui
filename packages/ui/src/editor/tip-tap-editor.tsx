import { Editor } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-caret";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import StarterKit from "@tiptap/starter-kit";
import type { Component } from "solid-js";
import { createSignal, onCleanup } from "solid-js";
import type { WebsocketProvider } from "y-websocket";
import type * as Y from "yjs";
import { onSignal } from "../solid-runtime/index.ts";
import { ParameterNode } from "./extensions/parameter-node";
import { VegaLiteChart } from "./extensions/vega-lite-code-block";

// User colors for collaboration cursors
const USER_COLORS = [
	"#FF6B6B",
	"#4ECDC4",
	"#45B7D1",
	"#96CEB4",
	"#FFEAA7",
	"#DDA0DD",
	"#98D8C8",
	"#F7DC6F",
	"#BB8FCE",
	"#85C1E9",
	"#F8B500",
	"#00CED1",
];

/**
 * Generate a consistent color from a user ID.
 * The same user ID will always get the same color.
 */
function userColor(userId: string): string {
	let hash = 0;
	for (let i = 0; i < userId.length; i++) {
		hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
	}
	return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

export type TipTapEditorUser = {
	id?: string | null;
	name?: string | null;
};

export interface TipTapEditorProps {
	/** The Y.XmlFragment to bind the editor to for collaborative editing */
	fragment: Y.XmlFragment;
	/** Optional shared Yjs undo manager for session-scoped history */
	undoManager?: Y.UndoManager;
	/** Called when the collaboration history manager is available */
	onHistoryReady?: (undoManager: Y.UndoManager) => void;
	/** Optional WebSocket provider for collaboration cursor features */
	provider?: WebsocketProvider | null;
	/** Optional class name for the editor container */
	class?: string;
	/** Callback when editor is ready */
	onReady?: (editor: Editor) => void;
	/** Placeholder text when editor is empty */
	placeholder?: string;
	/** Whether the editor can be edited */
	editable?: boolean;
	/** Current user for collaboration cursor display */
	user?: TipTapEditorUser | null;
}

export const TipTapEditor: Component<TipTapEditorProps> = (props) => {
	const [editorContainer, setEditorContainer] =
		createSignal<HTMLDivElement | null>(null);
	const [editor, setEditor] = createSignal<Editor | null>(null);

	onSignal(editorContainer, (container) => {
		if (!container || editor()) return;

		// Get current user info for collaboration cursor
		const userName = props.user?.name || "Anonymous";
		const userId = props.user?.id || "anonymous";
		const color = userColor(userId);

		// Build extensions list
		// biome-ignore lint/suspicious/noExplicitAny: TipTap extension unions are too wide for this mixed array.
		const extensions: any[] = [
			StarterKit.configure({
				// Disable undo/redo since Y.js handles it
				undoRedo: false,
			}),
			Collaboration.configure({
				fragment: props.fragment,
				...(props.undoManager
					? {
							yUndoOptions: {
								undoManager: props.undoManager,
							},
						}
					: {}),
			}),
			VegaLiteChart,
			Table.configure({
				resizable: true,
			}),
			TableRow,
			TableHeader,
			TableCell,
			ParameterNode,
		];

		// Add CollaborationCursor if provider is available
		if (props.provider) {
			extensions.push(
				CollaborationCursor.configure({
					provider: props.provider,
					user: {
						name: userName,
						color: color,
					},
				}),
			);
		}

		const editorInstance = new Editor({
			element: container,
			extensions,
			editable: props.editable ?? true,
			editorProps: {
				attributes: {
					class:
						"ama-document-prose prose prose-sm max-w-none focus:outline-none min-h-[200px] px-8 py-12 prose-headings:font-semibold prose-h1:text-xl prose-h2:text-base prose-h3:text-sm",
				},
			},
		});

		const undoPlugin = editorInstance.state.plugins.find((plugin) =>
			((plugin as unknown as { key?: string }).key ?? "").startsWith("y-undo"),
		);
		const undoPluginState = undoPlugin?.getState(editorInstance.state) as
			| { undoManager?: Y.UndoManager }
			| undefined;
		if (undoPluginState?.undoManager) {
			props.onHistoryReady?.(undoPluginState.undoManager);
		}

		setEditor(editorInstance);
		props.onReady?.(editorInstance);
	});

	onSignal(
		[editor, () => props.editable] as const,
		([currentEditor, editable]) => {
			if (!currentEditor) {
				return;
			}

			currentEditor.setEditable(editable ?? true);
		},
	);

	onCleanup(() => {
		const currentEditor = editor();
		if (currentEditor) {
			currentEditor.destroy();
		}
	});

	return (
		<div
			ref={(el) => setEditorContainer(el)}
			class={`border border-border rounded-lg bg-card ${props.class ?? ""}`}
		/>
	);
};
