import type { JSX } from "@solidjs/web";
import { For, Show } from "solid-js";
import { cn } from "../cn";
import { FileText, Upload, X } from "../icons.index";
import { Card } from "../layout/card";
import { Button } from "./button";
import {
  FileUploadDropzone,
  FileUploadHiddenInput,
  FileUploadItem,
  FileUploadItemDeleteTrigger,
  FileUploadItemGroup,
  FileUploadItemName,
  FileUploadItemSizeText,
  FileUploadRootProvider,
  FileUploadTrigger,
  type FileUploadRootProps,
  type UseFileUploadReturn,
  useFileUpload,
} from "./file-upload";
import { Label } from "./label";

type FileFieldProps = FileUploadRootProps & {
  label?: string;
  fileUpload?: UseFileUploadReturn;
  showBrowseButton?: boolean;
  dropzoneText?: string;
  dropzoneSubtext?: string;
};

export default function FileField(props: FileFieldProps): JSX.Element {
  const fileUpload = props.fileUpload ?? useFileUpload(props);

  return (
    <FileUploadRootProvider
      value={fileUpload}
      class={cn("flex flex-col gap-1.5 disabled:opacity-50", props.class)}
    >
      <Show when={props.label || props.showBrowseButton !== false}>
        <div class="flex items-center justify-between">
          <Show when={props.label}>
            <Label>{props.label}</Label>
          </Show>
          <Show when={props.showBrowseButton !== false}>
            <FileUploadTrigger>
              <Button variant="outline" size="sm" type="button" disabled={props.disabled}>
                <Upload class="mr-2 h-4 w-4" />
                Browse Files
              </Button>
            </FileUploadTrigger>
          </Show>
        </div>
      </Show>

      <Show when={fileUpload().acceptedFiles.length === 0}>
        <FileUploadTrigger class="border-0 bg-transparent p-0 shadow-none hover:bg-transparent">
          <FileUploadDropzone
            class={cn(
              "group cursor-pointer rounded-lg border-2 border-dashed border-border-subtle bg-surface-muted p-6 text-center transition-colors hover:border-border-strong hover:bg-hover",
              props.disabled && "opacity-50 pointer-events-none",
            )}
          >
            <div class="flex flex-col items-center gap-2">
              <div class="rounded-full bg-surface p-2 text-muted-foreground transition-colors group-hover:text-foreground">
                <FileText class="h-5 w-5" />
              </div>
              <div>
                <p class="text-sm font-medium text-foreground">
                  {props.dropzoneText ?? `Drop file${(props.maxFiles ?? 1) > 1 ? "s" : ""} here`}
                </p>
                <Show when={props.dropzoneSubtext !== undefined ? props.dropzoneSubtext : true}>
                  <p class="text-xs text-muted-foreground">
                    {props.dropzoneSubtext ??
                      `${props.maxFiles ?? 1} file${(props.maxFiles ?? 1) > 1 ? "s" : ""} max`}
                  </p>
                </Show>
              </div>
            </div>
          </FileUploadDropzone>
        </FileUploadTrigger>
      </Show>

      <Show when={fileUpload().acceptedFiles.length > 0}>
        <FileUploadItemGroup class="mt-2 space-y-2">
          <For each={fileUpload().acceptedFiles}>
            {(file) => (
              <Card class="p-3">
                <FileUploadItem file={file} class="flex items-center gap-3">
                  <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-surface-muted text-surface-muted-foreground">
                    <FileText class="h-4 w-4" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium truncate">
                      <FileUploadItemName />
                    </div>
                    <div class="text-xs text-muted-foreground">
                      <FileUploadItemSizeText />
                    </div>
                  </div>
                  <FileUploadItemDeleteTrigger class="cursor-pointer text-muted-foreground transition-colors hover:text-danger">
                    <X class="w-4 h-4" />
                  </FileUploadItemDeleteTrigger>
                </FileUploadItem>
              </Card>
            )}
          </For>
        </FileUploadItemGroup>
      </Show>

      <FileUploadHiddenInput />
    </FileUploadRootProvider>
  );
}
