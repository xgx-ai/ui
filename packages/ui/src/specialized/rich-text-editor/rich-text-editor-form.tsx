import { Show } from "solid-js";
import { cn } from "../../cn.ts";
import { FieldLabel } from "../../forms/form-components/field-label.tsx";
import { RichTextEditor } from "./rich-text-editor";
import type { RichTextEditorFormProps } from "./types";

/**
 * A rich text editor wrapped in a form field with label, description, and error display.
 * Follows the same pattern as TextAreaForm for consistency.
 *
 * @example
 * ```tsx
 * <RichTextEditorForm
 *   label="Description"
 *   description="Enter a detailed description"
 *   value={content()}
 *   onChange={setContent}
 *   toolbarConfig={{ formatting: true, lists: true, color: true }}
 * />
 * ```
 */
export function RichTextEditorForm(props: RichTextEditorFormProps) {
  return (
    <div class={cn("grid w-full items-center gap-1.5", props.class)}>
      <Show when={props.label || props.description}>
        <div class="flex flex-col gap-0.5">
          <Show when={props.label}>
            <FieldLabel required={props.required}>{props.label}</FieldLabel>
          </Show>
          <Show when={props.description}>
            <p class="text-xs text-muted-foreground">{props.description}</p>
          </Show>
        </div>
      </Show>

      <RichTextEditor
        collaboration={props.collaboration}
        contentClass={props.contentClass}
        disabled={props.disabled}
        editorProps={props.editorProps}
        extensions={props.extensions}
        minHeight={props.minHeight}
        onBlur={props.onBlur}
        onChange={props.onChange}
        onEditorReady={props.onEditorReady}
        onUpdate={props.onUpdate}
        placeholder={props.placeholder}
        readOnly={props.readOnly}
        showFloatingToolbar={props.showFloatingToolbar}
        toolbarConfig={props.toolbarConfig}
        value={props.value}
      />

      <div
        class={cn(
          "transition-all opacity-0 h-0 duration-300 ease-in-out text-xs text-error",
          props.error && "opacity-100 h-4",
        )}
      >
        {props.error}
      </div>
    </div>
  );
}
