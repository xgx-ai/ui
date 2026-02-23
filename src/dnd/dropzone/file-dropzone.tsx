import { dropTargetForExternal } from "@atlaskit/pragmatic-drag-and-drop/external/adapter";
import {
  containsFiles,
  getFiles,
} from "@atlaskit/pragmatic-drag-and-drop/external/file";
import {
  type Accessor,
  type Component,
  type ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  onCleanup,
  Show,
  splitProps,
} from "solid-js";
import { dropzoneActiveClasses, dropzoneClasses } from "../animations/presets";

/**
 * State of the file dropzone
 */
export interface FileDropzoneState {
  /** Whether files are being dragged over the dropzone */
  isOver: boolean;
  /** Whether the dropzone can accept the current drag */
  canDrop: boolean;
}

/**
 * Render props for FileDropzone
 */
export interface FileDropzoneRenderProps {
  state: Accessor<FileDropzoneState>;
}

/**
 * Props for FileDropzone
 */
export interface FileDropzoneProps
  extends Omit<ComponentProps<"div">, "children" | "onDrop"> {
  /** Called when files are dropped */
  onFileDrop: (files: File[]) => void;
  /** Called when files enter the dropzone */
  onDragEnter?: () => void;
  /** Called when files leave the dropzone */
  onDragLeave?: () => void;
  /** Accepted file types (e.g., ["image/*", ".pdf"]) */
  accept?: string[];
  /** Maximum number of files */
  maxFiles?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Whether the dropzone is disabled */
  disabled?: boolean;
  /** Children - can be render function for full control */
  children: JSX.Element | ((props: FileDropzoneRenderProps) => JSX.Element);
}

/**
 * Checks if a file matches the accepted types
 */
function matchesAccept(file: File, accept: string[]): boolean {
  if (!accept.length) return true;

  return accept.some((pattern) => {
    if (pattern.startsWith(".")) {
      // Extension match
      return file.name.toLowerCase().endsWith(pattern.toLowerCase());
    }
    if (pattern.endsWith("/*")) {
      // MIME type wildcard (e.g., "image/*")
      const baseType = pattern.slice(0, -2);
      return file.type.startsWith(baseType);
    }
    // Exact MIME type match
    return file.type === pattern;
  });
}

/**
 * A dropzone for external file drops.
 * Supports file type filtering, size limits, and file count limits.
 *
 * @example
 * ```tsx
 * <FileDropzone
 *   accept={["image/*", ".pdf"]}
 *   maxFiles={5}
 *   maxSize={10 * 1024 * 1024} // 10MB
 *   onFileDrop={(files) => {
 *     console.log("Dropped files:", files);
 *   }}
 * >
 *   {({ state }) => (
 *     <div class={cn(
 *       "p-8 text-center border-2 border-dashed rounded-lg",
 *       state().isOver && "border-primary bg-primary/5"
 *     )}>
 *       Drop files here
 *     </div>
 *   )}
 * </FileDropzone>
 * ```
 */
export const FileDropzone: Component<FileDropzoneProps> = (props) => {
  const [local, others] = splitProps(props, [
    "onFileDrop",
    "onDragEnter",
    "onDragLeave",
    "accept",
    "maxFiles",
    "maxSize",
    "disabled",
    "children",
    "class",
  ]);

  const [state, setState] = createSignal<FileDropzoneState>({
    isOver: false,
    canDrop: false,
  });

  let elementRef: HTMLElement | null = null;

  const setRef = (el: HTMLElement) => {
    elementRef = el;
  };

  const filterFiles = (files: File[]): File[] => {
    let filtered = files;

    // Filter by accept types
    const acceptTypes = local.accept;
    if (acceptTypes?.length) {
      filtered = filtered.filter((f) => matchesAccept(f, acceptTypes));
    }

    // Filter by size
    const maxSize = local.maxSize;
    if (maxSize) {
      filtered = filtered.filter((f) => f.size <= maxSize);
    }

    // Limit file count
    if (local.maxFiles) {
      filtered = filtered.slice(0, local.maxFiles);
    }

    return filtered;
  };

  createEffect(() => {
    const el = elementRef;
    if (!el) return;
    if (local.disabled) return;

    const cleanup = dropTargetForExternal({
      element: el,
      canDrop: ({ source }) => {
        return containsFiles({ source });
      },
      onDragEnter: ({ source }) => {
        const hasFiles = containsFiles({ source });
        setState({
          isOver: true,
          canDrop: hasFiles,
        });
        if (hasFiles) {
          local.onDragEnter?.();
        }
      },
      onDragLeave: () => {
        setState({
          isOver: false,
          canDrop: false,
        });
        local.onDragLeave?.();
      },
      onDrop: async ({ source }) => {
        const files = await getFiles({ source });
        const filtered = filterFiles(files);

        if (filtered.length > 0) {
          local.onFileDrop(filtered);
        }

        setState({
          isOver: false,
          canDrop: false,
        });
      },
    });

    onCleanup(cleanup);
  });

  const dropzoneClass = createMemo(() => {
    const classes: string[] = [dropzoneClasses];
    if (state().isOver && state().canDrop) {
      classes.push(dropzoneActiveClasses);
    }
    if (local.disabled) {
      classes.push("opacity-50 cursor-not-allowed");
    }
    return classes.join(" ");
  });

  const isRenderFunction = () => typeof local.children === "function";

  return (
    <div
      ref={setRef}
      class={`${dropzoneClass()} ${local.class ?? ""}`}
      data-dropzone
      data-dropzone-active={state().isOver && state().canDrop}
      {...others}
    >
      <Show when={isRenderFunction()} fallback={local.children as JSX.Element}>
        {(local.children as (props: FileDropzoneRenderProps) => JSX.Element)({
          state,
        })}
      </Show>
    </div>
  );
};

/**
 * Simple drop target indicator for file uploads
 */
export interface DropTargetIndicatorProps {
  /** Whether the indicator is visible */
  visible: boolean;
  /** Text to display */
  text?: string;
  /** Additional CSS classes */
  class?: string;
}

/**
 * An overlay indicator shown when files are dragged over a dropzone
 */
export const DropTargetIndicator: Component<DropTargetIndicatorProps> = (
  props,
) => {
  return (
    <Show when={props.visible}>
      <div
        class={`
					absolute inset-0 flex items-center justify-center
					bg-primary/10 border-2 border-primary border-dashed rounded-lg
					pointer-events-none z-10 backdrop-blur-sm
					${props.class ?? ""}
				`}
      >
        <div class="flex flex-col items-center gap-2 text-primary">
          <svg
            class="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span class="text-sm font-medium">
            {props.text ?? "Drop files here"}
          </span>
        </div>
      </div>
    </Show>
  );
};
