import { type AnyExtension, createDocument, Editor, type EditorOptions } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { createRenderEffect, createSignal, onSettled, Show } from "solid-js";
import { cn } from "../../cn.ts";
import { BubbleMenuPortal } from "./bubble-menu-portal";
import type { RichTextEditorProps } from "./types";
import { defaultToolbarConfig } from "./types";
import "./collaboration-carets.css";

export function RichTextEditor(props: RichTextEditorProps) {
  const [editor, setEditor] = createSignal<Editor | null>(null);

  // Solid 2 refs should stay non-reactive; onSettled runs after JSX has assigned them.
  let editorContainer: HTMLDivElement | undefined;
  let wrapperRef: HTMLDivElement | undefined;

  let editorCallbacks: Pick<
    RichTextEditorProps,
    "onBlur" | "onChange" | "onEditorReady" | "onUpdate"
  > = {};

  // Tiptap construction options are initial-only; value and editability are synced below.
  const initialEditorSnapshot = () => {
    const container = editorContainer;
    if (!container) return;

    const toolbarConfig = props.toolbarConfig ?? defaultToolbarConfig;
    const collaboration = props.collaboration;
    const suppliedEditorProps = props.editorProps;
    const suppliedAttributes =
      typeof suppliedEditorProps?.attributes === "object" ? suppliedEditorProps.attributes : {};
    const minHeight = props.minHeight || "120px";

    const editorProps: EditorOptions["editorProps"] = {
      ...suppliedEditorProps,
      attributes: {
        ...suppliedAttributes,
        class: cn(
          "prose prose-sm max-w-none focus:outline-none px-3 py-2 text-xs w-full h-full",
          props.contentClass,
          typeof suppliedAttributes.class === "string" ? suppliedAttributes.class : "",
        ),
        style: `min-height: ${minHeight}`,
      },
      handleClick: (view, _pos, _event) => {
        if (!view.hasFocus()) {
          view.focus();
        }
        return false;
      },
    };

    return {
      container,
      toolbarConfig: {
        code: toolbarConfig.code,
        color: toolbarConfig.color,
        formatting: toolbarConfig.formatting,
        headings: toolbarConfig.headings,
        links: toolbarConfig.links,
        lists: toolbarConfig.lists,
      },
      collaboration: collaboration
        ? {
            fragment: collaboration.fragment,
            provider: collaboration.provider,
            user: {
              color: collaboration.user.colour,
              name: collaboration.user.name,
            },
          }
        : undefined,
      disabled: !!props.disabled,
      editorProps,
      extensions: props.extensions ? [...props.extensions] : [],
      onBlur: props.onBlur,
      onChange: props.onChange,
      onEditorReady: props.onEditorReady,
      onUpdate: props.onUpdate,
      placeholder: props.placeholder ?? "Enter text...",
      readOnly: !!props.readOnly,
      value: props.value,
    };
  };

  type InitialEditorSnapshot = NonNullable<ReturnType<typeof initialEditorSnapshot>>;

  const initializeEditor = (snapshot: InitialEditorSnapshot) => {
    editorCallbacks = {
      onBlur: snapshot.onBlur,
      onChange: snapshot.onChange,
      onEditorReady: snapshot.onEditorReady,
      onUpdate: snapshot.onUpdate,
    };
    const isCollaborative = !!snapshot.collaboration;

    const extensions: AnyExtension[] = [
      StarterKit.configure({
        heading: snapshot.toolbarConfig.headings ? { levels: [1, 2, 3] } : false,
        bulletList: snapshot.toolbarConfig.lists !== false ? {} : false,
        orderedList: snapshot.toolbarConfig.lists !== false ? {} : false,
        code: snapshot.toolbarConfig.code ? {} : false,
        codeBlock: snapshot.toolbarConfig.code ? {} : false,
        link:
          snapshot.toolbarConfig.links !== false
            ? {
                openOnClick: false,
                HTMLAttributes: {
                  class: "text-primary underline cursor-pointer",
                },
              }
            : false,
        underline: snapshot.toolbarConfig.formatting !== false ? {} : false,
        undoRedo: isCollaborative ? false : {},
      }),
      Placeholder.configure({
        placeholder: snapshot.placeholder,
        emptyNodeClass:
          "first:before:text-muted-foreground first:before:content-[attr(data-placeholder)] first:before:float-left first:before:h-0 first:before:pointer-events-none",
      }),
    ];

    if (snapshot.toolbarConfig.color !== false) {
      extensions.push(TextStyle, Color);
    }

    if (snapshot.toolbarConfig.formatting !== false) {
      extensions.push(
        Highlight.configure({
          multicolor: true,
        }),
      );
    }

    if (isCollaborative) {
      extensions.push(
        Collaboration.configure({
          fragment: snapshot.collaboration?.fragment,
        }),
        CollaborationCaret.configure({
          provider: snapshot.collaboration?.provider,
          user: snapshot.collaboration?.user,
        }),
      );
    }

    if (snapshot.extensions.length) {
      extensions.push(...snapshot.extensions);
    }

    const newEditor = new Editor({
      element: snapshot.container,
      extensions,
      content: isCollaborative ? undefined : (snapshot.value ?? ""),
      editable: !snapshot.disabled && !snapshot.readOnly,
      onUpdate: ({ editor }) => {
        editorCallbacks.onUpdate?.(editor);
        editorCallbacks.onChange?.(editor.getHTML());
      },
      onBlur: () => {
        editorCallbacks.onBlur?.();
      },
      editorProps: snapshot.editorProps,
    });

    setEditor(newEditor);
    editorCallbacks.onEditorReady?.(newEditor);
    return newEditor;
  };

  onSettled(() => {
    const snapshot = initialEditorSnapshot();
    if (!snapshot) return;

    const currentEditor = initializeEditor(snapshot);

    return () => {
      editorCallbacks.onEditorReady?.(null);
      try {
        currentEditor.destroy();
      } catch {
        // Ignore cleanup errors from an editor already destroyed by its host.
      }
    };
  });

  createRenderEffect(
    () => ({
      currentEditor: editor(),
      onBlur: props.onBlur,
      onChange: props.onChange,
      onEditorReady: props.onEditorReady,
      onUpdate: props.onUpdate,
    }),
    ({ currentEditor, ...callbacks }) => {
      if (!currentEditor) return;
      editorCallbacks = callbacks;
    },
  );

  // Sync props.value changes to editor content (deferred to skip initial mount)
  // Skip entirely for collaborative editors — the Y.js document is the source of truth,
  // and calling setContent would overwrite the Y.js document and broadcast to all peers,
  // causing an infinite loop between clients.
  createRenderEffect(
    () => [props.value, !!props.collaboration, editor()] as const,
    ([newValue, isCollaborative, currentEditor]) => {
      if (isCollaborative) return;
      if (!currentEditor) return;

      if (newValue === undefined) return;

      // TipTap may serialise equivalent documents differently (for example, custom atom nodes can
      // render text that is absent from the input HTML). Replacing the document on that superficial
      // difference resets ProseMirror's selection, so compare parsed documents before syncing.
      const incomingDocument = createDocument(newValue, currentEditor.schema);
      if (!incomingDocument.eq(currentEditor.state.doc)) {
        currentEditor.commands.setContent(newValue, {
          emitUpdate: false,
        });
      }
    },
    { defer: true },
  );

  createRenderEffect(
    () => [editor(), !!props.disabled, !!props.readOnly] as const,
    ([currentEditor, disabled, readOnly]) => {
      if (!currentEditor) return;
      currentEditor.setEditable(!disabled && !readOnly);
    },
  );

  const showBubbleMenu = () =>
    props.showFloatingToolbar !== false && !props.readOnly && !props.disabled;

  return (
    <div
      ref={(element) => {
        wrapperRef = element;
      }}
      class="relative"
    >
      <div
        ref={(element) => {
          editorContainer = element;
        }}
        class={cn(
          "flex flex-col w-full rounded-md border border-input bg-background text-xs",
          "ring-offset-background focus-within:outline-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          "overflow-auto cursor-text",
          "[&>.ProseMirror]:flex-1 [&>.ProseMirror]:outline-none",
          props.disabled && "cursor-not-allowed opacity-50",
          props.readOnly && "bg-surface-muted",
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
            containerRef={wrapperRef}
          />
        )}
      </Show>
    </div>
  );
}
