import type { ComponentProps, JSX } from "@solidjs/web";
import { createContext, createSignal, For, useContext } from "solid-js";
import { cn } from "../cn.ts";
import { splitProps } from "../utils/split-props";

type FileUploadState = {
  acceptedFiles: File[];
  dragging: boolean;
  disabled?: boolean;
  maxFiles?: number;
  multiple?: boolean;
  accept?: string;
  input?: HTMLInputElement;
  setInput: (input: HTMLInputElement) => void;
  setFiles: (files: File[]) => void;
  removeFile: (file: File) => void;
  open: () => void;
};

export type UseFileUploadReturn = () => FileUploadState;

export type FileUploadRootProps = ComponentProps<"div"> & {
  accept?: string;
  disabled?: boolean;
  maxFiles?: number;
  multiple?: boolean;
  onFilesChange?: (files: File[]) => void;
};

const FileUploadContextValue = createContext<UseFileUploadReturn>();

function useFileUploadContext() {
  const context = useContext(FileUploadContextValue);
  if (!context) throw new Error("FileUpload parts must be used inside FileUploadRoot.");
  return context;
}

export function useFileUpload(props: FileUploadRootProps = {}): UseFileUploadReturn {
  const [files, setFilesSignal] = createSignal<File[]>([]);
  const [dragging, _setDragging] = createSignal(false);
  let input: HTMLInputElement | undefined;

  const maxFiles = () => props.maxFiles ?? (props.multiple ? Number.POSITIVE_INFINITY : 1);
  const setFiles = (nextFiles: File[]) => {
    const limited = nextFiles.slice(0, maxFiles());
    setFilesSignal(limited);
    props.onFilesChange?.(limited);
  };

  return () => ({
    acceptedFiles: files(),
    dragging: dragging(),
    disabled: props.disabled,
    maxFiles: props.maxFiles,
    multiple: props.multiple,
    accept: props.accept,
    input,
    setInput: (nextInput) => {
      input = nextInput;
    },
    setFiles,
    removeFile: (file) => setFiles(files().filter((item) => item !== file)),
    open: () => input?.click(),
  });
}

export function FileUploadRoot(props: FileUploadRootProps) {
  const [local, rest] = splitProps(props, [
    "accept",
    "disabled",
    "maxFiles",
    "multiple",
    "onFilesChange",
    "class",
    "children",
  ]);
  const upload = useFileUpload(local);

  return (
    <FileUploadContextValue value={upload}>
      <div class={cn("flex flex-col gap-2", local.class)} {...rest}>
        {local.children}
      </div>
    </FileUploadContextValue>
  );
}

export type FileUploadRootProviderProps = ComponentProps<"div"> & {
  value: UseFileUploadReturn;
};

export function FileUploadRootProvider(props: FileUploadRootProviderProps) {
  const [local, rest] = splitProps(props, ["value", "class", "children"]);
  return (
    <FileUploadContextValue value={local.value}>
      <div class={cn("flex flex-col gap-2", local.class)} {...rest}>
        {local.children}
      </div>
    </FileUploadContextValue>
  );
}

export type FileUploadDropzoneProps = ComponentProps<"div">;

export function FileUploadDropzone(props: FileUploadDropzoneProps) {
  const context = useFileUploadContext();
  const [local, rest] = splitProps(props, ["class", "children"]);

  const acceptDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const state = context();
    state.setFiles(Array.from(event.dataTransfer?.files ?? []));
  };

  return (
    <div
      data-dragging={context().dragging ? "" : undefined}
      class={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-input p-6 text-center transition-colors",
        "hover:border-border-strong hover:bg-hover hover:text-hover-foreground",
        "data-[dragging]:border-control data-[dragging]:bg-control-muted data-[dragging]:text-control-muted-foreground",
        local.class,
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        context().setFiles(context().acceptedFiles);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={acceptDrop}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export type FileUploadTriggerProps = ComponentProps<"button">;

export function FileUploadTrigger(props: FileUploadTriggerProps) {
  const context = useFileUploadContext();
  const [local, rest] = splitProps(props, ["class", "onClick"]);
  return (
    <button
      type="button"
      class={cn(
        "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors",
        "hover:bg-hover hover:text-hover-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        local.class,
      )}
      disabled={context().disabled || rest.disabled}
      onClick={(event) => {
        (local.onClick as any)?.(event);
        if (!event.defaultPrevented) context().open();
      }}
      {...rest}
    />
  );
}

export type FileUploadLabelProps = ComponentProps<"label">;

export function FileUploadLabel(props: FileUploadLabelProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return <label class={cn("text-sm font-medium leading-none", local.class)} {...rest} />;
}

export type FileUploadHiddenInputProps = ComponentProps<"input">;

export function FileUploadHiddenInput(props: FileUploadHiddenInputProps) {
  const context = useFileUploadContext();
  return (
    <input
      ref={(input) => context().setInput(input)}
      type="file"
      hidden
      accept={context().accept}
      multiple={context().multiple || (context().maxFiles ?? 1) > 1}
      disabled={context().disabled}
      onChange={(event) => {
        context().setFiles(Array.from(event.currentTarget.files ?? []));
        (props.onChange as any)?.(event);
      }}
      {...props}
    />
  );
}

export type FileUploadItemGroupProps = ComponentProps<"div">;

export function FileUploadItemGroup(props: FileUploadItemGroupProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return <div class={cn("flex flex-col gap-2", local.class)} {...rest} />;
}

const FileUploadItemContext = createContext<File | undefined>();

export type FileUploadItemProps = ComponentProps<"div"> & { file?: File };

export function FileUploadItem(props: FileUploadItemProps) {
  const [local, rest] = splitProps(props, ["file", "class", "children"]);
  return (
    <FileUploadItemContext value={local.file}>
      <div
        class={cn(
          "flex items-center gap-3 rounded-md border border-border-subtle bg-surface p-3 text-sm text-surface-foreground",
          local.class,
        )}
        {...rest}
      >
        {local.children}
      </div>
    </FileUploadItemContext>
  );
}

export type FileUploadItemPreviewProps = ComponentProps<"div">;
export function FileUploadItemPreview(props: FileUploadItemPreviewProps) {
  return <div {...props} />;
}

export type FileUploadItemPreviewImageProps = ComponentProps<"img"> & {
  file?: File;
};
export function FileUploadItemPreviewImage(props: FileUploadItemPreviewImageProps) {
  const file = () => props.file ?? useContext(FileUploadItemContext);
  const url = () => (file() ? URL.createObjectURL(file()!) : undefined);
  const [local, rest] = splitProps(props, ["class", "file"]);
  return <img src={url()} class={cn("size-10 rounded object-cover", local.class)} {...rest} />;
}

export type FileUploadItemNameProps = ComponentProps<"span">;
export function FileUploadItemName(props: FileUploadItemNameProps) {
  const file = useContext(FileUploadItemContext);
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <span class={cn("flex-1 truncate font-medium", local.class)} {...rest}>
      {local.children ?? file?.name}
    </span>
  );
}

export type FileUploadItemSizeTextProps = ComponentProps<"span">;
export function FileUploadItemSizeText(props: FileUploadItemSizeTextProps) {
  const file = useContext(FileUploadItemContext);
  const [local, rest] = splitProps(props, ["class", "children"]);
  const size = () => (file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : undefined);
  return (
    <span class={cn("text-muted-foreground", local.class)} {...rest}>
      {local.children ?? size()}
    </span>
  );
}

export type FileUploadItemDeleteTriggerProps = ComponentProps<"button">;
export function FileUploadItemDeleteTrigger(props: FileUploadItemDeleteTriggerProps) {
  const context = useFileUploadContext();
  const file = useContext(FileUploadItemContext);
  const [local, rest] = splitProps(props, ["class", "onClick"]);
  return (
    <button
      type="button"
      class={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-danger hover:text-danger-foreground",
        local.class,
      )}
      onClick={(event) => {
        (local.onClick as any)?.(event);
        if (!event.defaultPrevented && file) context().removeFile(file);
      }}
      {...rest}
    />
  );
}

export type FileUploadContextProps = {
  children: (context: UseFileUploadReturn) => JSX.Element;
};

export function FileUploadContext(props: FileUploadContextProps) {
  return props.children(useFileUploadContext());
}

export function FileUploadAcceptedFiles(props: { children: (file: File) => JSX.Element }) {
  const context = useFileUploadContext();
  return <For each={context().acceptedFiles}>{(file) => props.children(file)}</For>;
}
