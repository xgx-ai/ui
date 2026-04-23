import {
  FileUpload,
  type FileUploadRootProps,
  type UseFileUploadReturn,
  useFileUpload,
} from "@ark-ui/solid/file-upload";
import { Button } from "./button";
import { Card } from "../layout/card";
import { cn } from "../cn";
import { FileText, Upload, X } from "lucide-solid";
import { For, type JSX, Show } from "solid-js";

import { Label } from "./label";

type FileFieldProps = FileUploadRootProps & {
  label?: string;
  fileUpload?: UseFileUploadReturn;
  showBrowseButton?: boolean;
  dropzoneText?: string;
  dropzoneSubtext?: string;
};

export default function FileField(props: FileFieldProps): JSX.Element {
  // Use external fileUpload if provided, otherwise create internal one
  const fileUpload =
    props.fileUpload ??
    useFileUpload({
      ...props,
    });

  return (
    <FileUpload.RootProvider
      value={fileUpload}
      class={cn("flex flex-col gap-1.5 disabled:opacity-50", props.class)}
    >
      <Show when={props.label || props.showBrowseButton !== false}>
        <div class="flex items-center justify-between">
          <Show when={props.label}>
            <Label>{props.label}</Label>
          </Show>
          <Show when={props.showBrowseButton !== false}>
            <FileUpload.Trigger>
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={props.disabled}
              >
                <Upload class="mr-2 h-4 w-4" />
                Browse Files
              </Button>
            </FileUpload.Trigger>
          </Show>
        </div>
      </Show>

      <Show when={fileUpload().acceptedFiles.length === 0}>
        <FileUpload.Trigger>
          <FileUpload.Dropzone
            class={cn(
              "border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors cursor-pointer group",
              props.disabled && "opacity-50 pointer-events-none",
            )}
          >
            <div class="flex flex-col items-center gap-2">
              <div class="p-2 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
                <FileText class="w-5 h-5 text-gray-400 group-hover:text-gray-500 transition-colors" />
              </div>
              <div>
                <p class="text-sm text-gray-600 font-medium">
                  {props.dropzoneText ??
                    `Drop file${(props.maxFiles ?? 1) > 1 ? "s" : ""} here`}
                </p>
                <Show
                  when={
                    props.dropzoneSubtext !== undefined
                      ? props.dropzoneSubtext
                      : true
                  }
                >
                  <p class="text-xs text-gray-500">
                    {props.dropzoneSubtext ??
                      `${props.maxFiles ?? 1} file${
                        (props.maxFiles ?? 1) > 1 ? "s" : ""
                      } max`}
                  </p>
                </Show>
              </div>
            </div>
          </FileUpload.Dropzone>
        </FileUpload.Trigger>
      </Show>

      <Show when={fileUpload().acceptedFiles.length > 0}>
        <FileUpload.ItemGroup class="mt-2 space-y-2">
          <FileUpload.Context>
            {(context) => (
              <For each={context().acceptedFiles}>
                {(file) => (
                  <Card class="p-3">
                    <FileUpload.Item
                      file={file}
                      class="flex items-center gap-3"
                    >
                      <div class="w-8 h-8 flex-shrink-0 bg-blue-50 rounded flex items-center justify-center">
                        <FileText class="w-4 h-4 text-blue-600" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium truncate">
                          <FileUpload.ItemName />
                        </div>
                        <div class="text-xs text-gray-500">
                          <FileUpload.ItemSizeText />
                        </div>
                      </div>
                      <FileUpload.ItemDeleteTrigger class="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                        <X class="w-4 h-4" />
                      </FileUpload.ItemDeleteTrigger>
                    </FileUpload.Item>
                  </Card>
                )}
              </For>
            )}
          </FileUpload.Context>
        </FileUpload.ItemGroup>
      </Show>

      <FileUpload.HiddenInput />
    </FileUpload.RootProvider>
  );
}
