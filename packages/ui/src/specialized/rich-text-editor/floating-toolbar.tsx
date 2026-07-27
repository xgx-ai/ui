import { createSignal, For, onSettled, Show } from "solid-js";
import { cn } from "../../cn.ts";
import { Button } from "../../forms/button.tsx";
import {
  ALargeSmall,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link,
  List,
  ListOrdered,
  Palette,
  Quote,
  Strikethrough,
  Underline,
} from "../../icons.index";
import { Popover, PopoverContent, PopoverTrigger } from "../../overlays/popover.tsx";
import type { FloatingToolbarProps, ToolbarConfig } from "./types";

interface ToolbarButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: typeof Bold;
  title: string;
}

function ToolbarButton(props: ToolbarButtonProps) {
  return (
    <button
      type="button"
      class={cn(
        "rounded p-1.5 text-muted-foreground transition-colors hover:bg-hover hover:text-hover-foreground",
        props.isActive && "bg-selected text-selected-foreground",
      )}
      onClick={props.onClick}
      title={props.title}
    >
      <props.icon class="size-4" />
    </button>
  );
}

export function FloatingToolbar(props: FloatingToolbarProps) {
  const [colorPickerOpen, setColorPickerOpen] = createSignal(false);
  const [currentFontSize, setCurrentFontSize] = createSignal("");
  const [highlightPickerOpen, setHighlightPickerOpen] = createSignal(false);

  const config = (): ToolbarConfig => props.config ?? {};
  const fontSizes = () => config().fontSizes ?? [];
  const textColors = () => config().textColors ?? [];
  const highlightColors = () => config().highlightColors ?? [];
  const syncFontSize = () => {
    if (!props.editor || props.editor.isDestroyed) {
      setCurrentFontSize("");
      return;
    }

    const fontSize = props.editor.getAttributes("textStyle").fontSize;
    setCurrentFontSize(typeof fontSize === "string" ? fontSize : "");
  };

  onSettled(() => {
    const editor = props.editor;
    if (!editor || editor.isDestroyed) return;

    syncFontSize();
    editor.on("selectionUpdate", syncFontSize);
    editor.on("transaction", syncFontSize);
    editor.on("update", syncFontSize);

    return () => {
      try {
        editor.off("selectionUpdate", syncFontSize);
        editor.off("transaction", syncFontSize);
        editor.off("update", syncFontSize);
      } catch {
        // Ignore cleanup errors
      }
    };
  });

  const setFontSize = (event: Event & { currentTarget: HTMLSelectElement }) => {
    const fontSize = event.currentTarget.value;

    if (fontSize) {
      props.editor.chain().focus().setFontSize(fontSize).run();
      setCurrentFontSize(fontSize);
      return;
    }

    props.editor.chain().focus().unsetFontSize().run();
    setCurrentFontSize("");
  };

  return (
    <div class="flex items-center gap-0.5 rounded-lg border border-border-subtle bg-surface-raised p-1 text-surface-raised-foreground shadow-elevation-medium">
      {/* Formatting buttons */}
      <Show when={config().formatting !== false}>
        <ToolbarButton
          isActive={props.editor.isActive("bold")}
          onClick={() => props.editor.chain().focus().toggleBold().run()}
          icon={Bold}
          title="Bold"
        />
        <ToolbarButton
          isActive={props.editor.isActive("italic")}
          onClick={() => props.editor.chain().focus().toggleItalic().run()}
          icon={Italic}
          title="Italic"
        />
        <ToolbarButton
          isActive={props.editor.isActive("underline")}
          onClick={() => props.editor.chain().focus().toggleUnderline().run()}
          icon={Underline}
          title="Underline"
        />
        <ToolbarButton
          isActive={props.editor.isActive("strike")}
          onClick={() => props.editor.chain().focus().toggleStrike().run()}
          icon={Strikethrough}
          title="Strikethrough"
        />
        {/* Highlight picker */}
        <Popover isOpen={highlightPickerOpen()} onOpenChange={setHighlightPickerOpen}>
          <PopoverTrigger
            type="button"
            class={cn(
              "rounded p-1.5 text-muted-foreground transition-colors hover:bg-hover hover:text-hover-foreground",
              props.editor.isActive("highlight") && "bg-selected text-selected-foreground",
            )}
            onMouseDown={(e) => e.preventDefault()}
            title="Highlight"
          >
            <Highlighter class="size-4" />
          </PopoverTrigger>
          <PopoverContent class="w-auto p-2" portalled={false}>
            <div class="flex gap-1">
              <For each={highlightColors()}>
                {(highlight) => (
                  <button
                    type="button"
                    class={cn(
                      "rounded p-1.5 transition-colors hover:bg-hover",
                      props.editor.isActive("highlight", {
                        color: highlight.color,
                      }) && "bg-selected",
                    )}
                    style={{ color: highlight.color }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      props.editor
                        .chain()
                        .focus()
                        .toggleHighlight({
                          color: highlight.color,
                        })
                        .run();
                      setHighlightPickerOpen(false);
                    }}
                    title={`Highlight ${highlight.name}`}
                  >
                    <Highlighter class="size-4" />
                  </button>
                )}
              </For>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="w-full mt-2"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                props.editor.chain().focus().unsetHighlight().run();
                setHighlightPickerOpen(false);
              }}
            >
              Remove highlight
            </Button>
          </PopoverContent>
        </Popover>
        <ToolbarButton
          isActive={props.editor.isActive("blockquote")}
          onClick={() => props.editor.chain().focus().toggleBlockquote().run()}
          icon={Quote}
          title="Blockquote"
        />
        <div class="w-px h-4 bg-border mx-1" />
      </Show>

      {/* Heading buttons */}
      <Show when={config().headings}>
        <ToolbarButton
          isActive={props.editor.isActive("heading", { level: 1 })}
          onClick={() => props.editor.chain().focus().toggleHeading({ level: 1 }).run()}
          icon={Heading1}
          title="Heading 1"
        />
        <ToolbarButton
          isActive={props.editor.isActive("heading", { level: 2 })}
          onClick={() => props.editor.chain().focus().toggleHeading({ level: 2 }).run()}
          icon={Heading2}
          title="Heading 2"
        />
        <ToolbarButton
          isActive={props.editor.isActive("heading", { level: 3 })}
          onClick={() => props.editor.chain().focus().toggleHeading({ level: 3 }).run()}
          icon={Heading3}
          title="Heading 3"
        />
        <div class="w-px h-4 bg-border mx-1" />
      </Show>

      {/* List buttons */}
      <Show when={config().lists !== false}>
        <ToolbarButton
          isActive={props.editor.isActive("bulletList")}
          onClick={() => props.editor.chain().focus().toggleBulletList().run()}
          icon={List}
          title="Bullet List"
        />
        <ToolbarButton
          isActive={props.editor.isActive("orderedList")}
          onClick={() => props.editor.chain().focus().toggleOrderedList().run()}
          icon={ListOrdered}
          title="Numbered List"
        />
        <div class="w-px h-4 bg-border mx-1" />
      </Show>

      {/* Font size picker */}
      <Show when={fontSizes().length > 0}>
        <div class="flex items-center gap-1 rounded px-1 text-muted-foreground">
          <ALargeSmall aria-hidden="true" class="size-4" />
          <select
            class="h-7 max-w-20 rounded border border-border bg-background px-1 text-xs text-foreground shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
            onChange={setFontSize}
            title="Font size"
            value={currentFontSize()}
          >
            <option value="">Size</option>
            <For each={fontSizes()}>
              {(fontSize) => <option value={fontSize}>{fontSize}</option>}
            </For>
          </select>
        </div>
        <div class="w-px h-4 bg-border mx-1" />
      </Show>

      {/* Code button */}
      <Show when={config().code}>
        <ToolbarButton
          isActive={props.editor.isActive("code")}
          onClick={() => props.editor.chain().focus().toggleCode().run()}
          icon={Code}
          title="Code"
        />
      </Show>

      {/* Link button */}
      <Show when={config().links !== false}>
        <ToolbarButton
          isActive={props.editor.isActive("link")}
          onClick={() => {
            const previousUrl = props.editor.getAttributes("link").href;
            const url = window.prompt("URL", previousUrl);

            if (url === null) {
              return;
            }

            if (url === "") {
              props.editor.chain().focus().extendMarkRange("link").unsetLink().run();
              return;
            }

            props.editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
          icon={Link}
          title="Add Link"
        />
      </Show>

      {/* Color picker */}
      <Show when={config().color !== false}>
        <Popover isOpen={colorPickerOpen()} onOpenChange={setColorPickerOpen}>
          <PopoverTrigger
            type="button"
            class={cn(
              "rounded p-1.5 text-muted-foreground transition-colors hover:bg-hover hover:text-hover-foreground",
              props.editor.isActive("textStyle") && "bg-selected text-selected-foreground",
            )}
            onMouseDown={(e) => e.preventDefault()}
            title="Text Color"
          >
            <Palette class="size-4" />
          </PopoverTrigger>
          <PopoverContent class="w-auto p-2" portalled={false}>
            <div class="grid grid-cols-6 gap-1">
              <For each={textColors()}>
                {(color) => (
                  <button
                    type="button"
                    class="size-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ "background-color": color }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      props.editor.chain().focus().setColor(color).run();
                      setColorPickerOpen(false);
                    }}
                    title={color}
                  />
                )}
              </For>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="w-full mt-2"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                props.editor.chain().focus().unsetColor().run();
                setColorPickerOpen(false);
              }}
            >
              Remove color
            </Button>
          </PopoverContent>
        </Popover>
      </Show>
    </div>
  );
}
