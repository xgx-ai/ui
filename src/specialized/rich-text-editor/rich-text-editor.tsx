import { type AnyExtension, Editor } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import {
  createEffect,
  createSignal,
  getOwner,
  on,
  onCleanup,
  runWithOwner,
  Show,
} from "solid-js";
import { cn } from "../../cn.ts";
import { BubbleMenuPortal } from "./bubble-menu-portal";
import type { RichTextEditorProps } from "./types";
import { defaultToolbarConfig } from "./types";
import "./collaboration-carets.css";

export function RichTextEditor(props: RichTextEditorProps) {
  const [editorContainer, setEditorContainer] =
    createSignal<HTMLDivElement | null>(null);
  const [editor, setEditor] = createSignal<Editor | null>(null);

  // Ref-based guard to prevent race conditions with duplicate editor creation
  let isInitializing = false;

  createEffect(() => {
    const container = editorContainer();
    if (!container) return;
    if (editor()) return;

    // Capture the owner to preserve reactive context across setTimeout
    const owner = getOwner();

    const timeoutId = setTimeout(() => {
      runWithOwner(owner, () => {
        const currentContainer = editorContainer();
        if (!currentContainer || editor()) return;
        initializeEditor(currentContainer);
      });
    }, 10);

    onCleanup(() => clearTimeout(timeoutId));
  });

  const initializeEditor = (container: HTMLDivElement) => {
    // Prevent duplicate initialization from race conditions
    if (isInitializing) return;
    isInitializing = true;
    const toolbarConfig = props.toolbarConfig ?? defaultToolbarConfig;
    const isCollaborative = !!props.collaboration;

    const extensions: AnyExtension[] = [
      StarterKit.configure({
        heading: toolbarConfig.headings ? { levels: [1, 2, 3] } : false,
        bulletList: toolbarConfig.lists !== false ? {} : false,
        orderedList: toolbarConfig.lists !== false ? {} : false,
        code: toolbarConfig.code ? {} : false,
        codeBlock: toolbarConfig.code ? {} : false,
        undoRedo: isCollaborative ? false : {},
      }),
      Placeholder.configure({
        placeholder: props.placeholder ?? "Enter text...",
        emptyNodeClass:
          "first:before:text-muted-foreground first:before:content-[attr(data-placeholder)] first:before:float-left first:before:h-0 first:before:pointer-events-none",
      }),
    ];

    if (toolbarConfig.links !== false) {
      extensions.push(
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline cursor-pointer",
          },
        }),
      );
    }

    if (toolbarConfig.color !== false) {
      extensions.push(TextStyle, Color);
    }

    if (toolbarConfig.formatting !== false) {
      extensions.push(Underline);
      extensions.push(
        Highlight.configure({
          multicolor: true,
        }),
      );
    }

    if (isCollaborative) {
      extensions.push(
        Collaboration.configure({
          fragment: props.collaboration?.fragment,
        }),
        CollaborationCaret.configure({
          provider: props.collaboration?.provider,
          user: {
            name: props.collaboration?.user.name,
            color: props.collaboration?.user.colour,
          },
        }),
      );
    }

    const newEditor = new Editor({
      element: container,
      extensions,
      content: isCollaborative ? undefined : (props.value ?? ""),
      editable: !props.disabled && !props.readOnly,
      onUpdate: ({ editor }) => {
        props.onChange?.(editor.getHTML());
      },
      onBlur: () => {
        props.onBlur?.();
      },
      editorProps: {
        attributes: {
          class: cn(
            "prose prose-sm max-w-none focus:outline-none px-3 py-2 text-xs w-full h-full",
            props.contentClass,
          ),
          style: `min-height: ${props.minHeight || "120px"}`,
        },
        handleClick: (view, _pos, _event) => {
          if (!view.hasFocus()) {
            view.focus();
          }
          return false;
        },
      },
    });

    setEditor(newEditor);
  };

  // Sync props.value changes to editor content (deferred to skip initial mount)
  // Skip entirely for collaborative editors — the Y.js document is the source of truth,
  // and calling setContent would overwrite the Y.js document and broadcast to all peers,
  // causing an infinite loop between clients.
  createEffect(
    on(
      () => props.value,
      (newValue) => {
        if (props.collaboration) return;

        const currentEditor = editor();
        if (!currentEditor) return;

        const currentContent = currentEditor.getHTML();
        if (newValue !== currentContent && newValue !== undefined) {
          currentEditor.commands.setContent(newValue, {
            emitUpdate: false,
          });
        }
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => [props.disabled, props.readOnly],
      () => {
        const currentEditor = editor();
        if (!currentEditor) return;
        currentEditor.setEditable(!props.disabled && !props.readOnly);
      },
    ),
  );

  onCleanup(() => {
    const currentEditor = editor();
    setEditor(null);
    isInitializing = false; // Reset guard for potential re-mount
    if (currentEditor) {
      try {
        currentEditor.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  const showBubbleMenu = () => !props.readOnly && !props.disabled;
  const [wrapperRef, setWrapperRef] = createSignal<
    HTMLDivElement | undefined
  >();

  return (
    <div ref={(el) => setWrapperRef(el)} class="relative">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Click-to-focus pattern for editor container */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Editor container receives focus delegation */}
      <div
        ref={setEditorContainer}
        class={cn(
          "flex flex-col w-full rounded-md border border-input bg-background text-xs",
          "ring-offset-background focus-within:outline-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          "overflow-auto cursor-text",
          "[&>.ProseMirror]:flex-1 [&>.ProseMirror]:outline-none",
          props.disabled && "cursor-not-allowed opacity-50",
          props.readOnly && "bg-muted/30",
          props.class,
        )}
        style={{
          "min-height": props.minHeight || "120px",
        }}
        onClick={() => {
          const currentEditor = editor();
          if (currentEditor && !currentEditor.isFocused) {
            currentEditor.commands.focus();
          }
        }}
      />
      <Show when={showBubbleMenu() && editor()}>
        {(currentEditor) => (
          <BubbleMenuPortal
            editor={currentEditor()}
            config={props.toolbarConfig ?? defaultToolbarConfig}
            containerRef={wrapperRef()}
          />
        )}
      </Show>
    </div>
  );
}
