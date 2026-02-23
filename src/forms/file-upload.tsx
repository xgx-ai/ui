import {
  FileUpload as ArkFileUpload,
  type FileUploadRootProps as ArkFileUploadRootProps,
} from "@ark-ui/solid/file-upload";
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../cn.ts";

/* ---------------------------------- Root ---------------------------------- */

export interface FileUploadRootProps extends ArkFileUploadRootProps {}

export function FileUploadRoot(props: FileUploadRootProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <ArkFileUpload.Root
      class={cn("flex flex-col gap-2", local.class)}
      {...rest}
    />
  );
}

/* -------------------------------- Dropzone -------------------------------- */

export type FileUploadDropzoneProps = ComponentProps<
  typeof ArkFileUpload.Dropzone
>;

export function FileUploadDropzone(props: FileUploadDropzoneProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <ArkFileUpload.Dropzone
      class={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-input p-6 text-center transition-colors",
        "hover:border-primary/50 hover:bg-muted/50",
        "data-[dragging]:border-primary data-[dragging]:bg-primary/5",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </ArkFileUpload.Dropzone>
  );
}

/* -------------------------------- Trigger --------------------------------- */

export type FileUploadTriggerProps = ComponentProps<
  typeof ArkFileUpload.Trigger
>;

export function FileUploadTrigger(props: FileUploadTriggerProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <ArkFileUpload.Trigger
      class={cn(
        "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        local.class,
      )}
      {...rest}
    />
  );
}

/* --------------------------------- Label ---------------------------------- */

export type FileUploadLabelProps = ComponentProps<typeof ArkFileUpload.Label>;

export function FileUploadLabel(props: FileUploadLabelProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <ArkFileUpload.Label
      class={cn("text-sm font-medium leading-none", local.class)}
      {...rest}
    />
  );
}

/* ------------------------------ HiddenInput ------------------------------- */

export type FileUploadHiddenInputProps = ComponentProps<
  typeof ArkFileUpload.HiddenInput
>;

export function FileUploadHiddenInput(props: FileUploadHiddenInputProps) {
  return <ArkFileUpload.HiddenInput {...props} />;
}

/* ------------------------------- ItemGroup -------------------------------- */

export type FileUploadItemGroupProps = ComponentProps<
  typeof ArkFileUpload.ItemGroup
>;

export function FileUploadItemGroup(props: FileUploadItemGroupProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <ArkFileUpload.ItemGroup
      class={cn("flex flex-col gap-2", local.class)}
      {...rest}
    />
  );
}

/* ---------------------------------- Item ---------------------------------- */

export type FileUploadItemProps = ComponentProps<typeof ArkFileUpload.Item>;

export function FileUploadItem(props: FileUploadItemProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <ArkFileUpload.Item
      class={cn(
        "flex items-center gap-3 rounded-md border border-input bg-background p-3 text-sm",
        local.class,
      )}
      {...rest}
    />
  );
}

/* ------------------------------ ItemPreview ------------------------------- */

export type FileUploadItemPreviewProps = ComponentProps<
  typeof ArkFileUpload.ItemPreview
>;

export function FileUploadItemPreview(props: FileUploadItemPreviewProps) {
  return <ArkFileUpload.ItemPreview {...props} />;
}

/* -------------------------- ItemPreviewImage ----------------------------- */

export type FileUploadItemPreviewImageProps = ComponentProps<
  typeof ArkFileUpload.ItemPreviewImage
>;

export function FileUploadItemPreviewImage(
  props: FileUploadItemPreviewImageProps,
) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <ArkFileUpload.ItemPreviewImage
      class={cn("size-10 rounded object-cover", local.class)}
      {...rest}
    />
  );
}

/* ------------------------------- ItemName -------------------------------- */

export type FileUploadItemNameProps = ComponentProps<
  typeof ArkFileUpload.ItemName
>;

export function FileUploadItemName(props: FileUploadItemNameProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <ArkFileUpload.ItemName
      class={cn("flex-1 truncate font-medium", local.class)}
      {...rest}
    />
  );
}

/* ----------------------------- ItemSizeText ------------------------------ */

export type FileUploadItemSizeTextProps = ComponentProps<
  typeof ArkFileUpload.ItemSizeText
>;

export function FileUploadItemSizeText(props: FileUploadItemSizeTextProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <ArkFileUpload.ItemSizeText
      class={cn("text-muted-foreground", local.class)}
      {...rest}
    />
  );
}

/* ------------------------- ItemDeleteTrigger ----------------------------- */

export type FileUploadItemDeleteTriggerProps = ComponentProps<
  typeof ArkFileUpload.ItemDeleteTrigger
>;

export function FileUploadItemDeleteTrigger(
  props: FileUploadItemDeleteTriggerProps,
) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <ArkFileUpload.ItemDeleteTrigger
      class={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-destructive/10 hover:text-destructive",
        local.class,
      )}
      {...rest}
    />
  );
}

/* ------------------------------ Context ---------------------------------- */

export const FileUploadContext = ArkFileUpload.Context;
export type FileUploadContextProps = ComponentProps<
  typeof ArkFileUpload.Context
>;
