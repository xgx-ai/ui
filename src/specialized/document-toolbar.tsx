import { cva } from "class-variance-authority";
import { Download, Edit, Plus, Save, X, ZoomIn, ZoomOut } from "lucide-solid";
import {
  type Component,
  createMemo,
  type JSX,
  Show,
  splitProps,
} from "solid-js";
import { Button } from "../forms/button.tsx";

/**
 * # Document Toolbar
 *
 * Toolbar with zoom controls and document actions.
 *
 * @example
 * ```
 * <DocumentToolbar
 *   zoom={1}
 *   onZoomIn={() => {}}
 *   onZoomOut={() => {}}
 *   onZoomReset={() => {}}
 *   onEdit={() => {}}
 *   onSave={() => {}}
 *   onDownload={() => {}}
 *   canEdit={true}
 *   canDownload={true}
 * />
 * ```
 */

type DocumentToolbarProps = {
  class?: string;
  title?: string;
  subtitle?: string;
  leftSlot?: JSX.Element;
  // primary actions
  onNew?: () => void;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDownload?: () => void;
  isEditing?: boolean;
  isSaving?: boolean;
  canEdit?: boolean;
  canDownload?: boolean;
  // zoom controls
  zoom: number; // 0.5 - 2.0
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
};

const barVariants = cva(
  "w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75",
);

export const DocumentToolbar: Component<DocumentToolbarProps> = (props) => {
  const [local] = splitProps(props, [
    "class",
    "title",
    "subtitle",
    "leftSlot",
    "onNew",
    "onEdit",
    "onSave",
    "onCancel",
    "onDownload",
    "isEditing",
    "isSaving",
    "canEdit",
    "canDownload",
    "zoom",
    "onZoomIn",
    "onZoomOut",
    "onZoomReset",
  ]);

  const zoomPct = createMemo(() => Math.round(local.zoom * 100));

  return (
    <div class={barVariants({ class: local.class })}>
      <div class="mx-auto max-w-screen-xl px-4">
        <div class="flex h-14 items-center gap-3">
          {/* Left slot (e.g., CV selector) */}
          <Show when={!!local.leftSlot}>
            <div class="flex items-center">{local.leftSlot}</div>
          </Show>
          <Show when={!!local.leftSlot}>
            <div class="h-6 w-px bg-border" />
          </Show>

          {/* Zoom controls */}
          <div class="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={local.onZoomOut}>
              <ZoomOut class="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={local.onZoomReset}>
              {zoomPct()}%
            </Button>
            <Button variant="outline" size="sm" onClick={local.onZoomIn}>
              <ZoomIn class="w-4 h-4" />
            </Button>
          </div>

          {/* Spacer to push actions to the right */}
          <div class="flex-1" />

          {/* Separator */}
          <div class="mx-2 h-6 w-px bg-border" />

          {/* Primary actions */}
          <div class="flex items-center gap-2">
            <Show when={!local.isEditing}>
              <Button
                size="sm"
                variant="outline"
                disabled={!local.canDownload}
                loading={!local.canDownload}
                onClick={local.onDownload}
              >
                <Download class="w-4 h-4" />
                Download
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!local.canEdit}
                onClick={local.onEdit}
              >
                <Edit class="w-4 h-4" />
                Edit
              </Button>
              <Button size="sm" onClick={local.onNew}>
                <Plus class="w-4 h-4" />
                Create New
              </Button>
            </Show>
            <Show when={local.isEditing}>
              <Button size="sm" variant="outline" onClick={local.onCancel}>
                <X class="w-4 h-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={local.isSaving}
                onClick={local.onSave}
                loading={local.isSaving}
              >
                <Save class="w-4 h-4" />
                Save Changes
              </Button>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
};

export type { DocumentToolbarProps };
