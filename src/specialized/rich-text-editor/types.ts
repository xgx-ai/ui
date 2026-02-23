import type { Editor } from "@tiptap/core";

export interface ToolbarConfig {
  /** Enable bold, italic, underline formatting */
  formatting?: boolean;
  /** Enable heading levels (h1, h2, h3) */
  headings?: boolean;
  /** Enable bullet and numbered lists */
  lists?: boolean;
  /** Enable link insertion */
  links?: boolean;
  /** Enable text color picker */
  color?: boolean;
  /** Enable code/code block */
  code?: boolean;
}

export interface CollaborationConfig {
  /** Y.js XmlFragment driving the editor content */
  fragment: any;
  /** Provider with `.awareness` property (e.g. WebsocketProvider) */
  provider: any;
  /** Current user's display info for collaboration cursors */
  user: {
    name: string;
    colour: string;
  };
}

export interface RichTextEditorProps {
  /** The HTML content value */
  value?: string;
  /** Callback when content changes */
  onChange?: (html: string) => void;
  /** Callback when editor loses focus */
  onBlur?: () => void;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Additional class names for the editor container */
  class?: string;
  /** Additional class names for the editor content area (overrides default prose styling) */
  contentClass?: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Configuration for the floating toolbar */
  toolbarConfig?: ToolbarConfig;
  /** Minimum height for the editor */
  minHeight?: string;
  /** Optional collaboration config for multi-user editing */
  collaboration?: CollaborationConfig;
}

export interface RichTextEditorFormProps extends RichTextEditorProps {
  /** Field label */
  label?: string;
  /** Description text shown below the label */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
}

export interface FloatingToolbarProps {
  /** The Tiptap editor instance */
  editor: Editor;
  /** Configuration for which buttons to show */
  config?: ToolbarConfig;
}

/** Default toolbar configuration */
export const defaultToolbarConfig: ToolbarConfig = {
  formatting: true,
  headings: false,
  lists: true,
  links: true,
  color: true,
  code: false,
};
