import {
  ColorPicker as ArkColorPicker,
  parseColor,
} from "@ark-ui/solid/color-picker";
import { cn } from "../cn";
import { createMemo, For, Show, splitProps } from "solid-js";
import { Portal } from "solid-js/web";
import { Label } from "./label";

export type ColorPickerFieldProps = {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;
  class?: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
};

const presets = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#000000",
];

export function ColorPickerField(props: ColorPickerFieldProps) {
  const [local, rest] = splitProps(props, [
    "value",
    "onChange",
    "label",
    "error",
    "class",
    "disabled",
    "readOnly",
    "required",
    "placeholder",
  ]);

  const parsedValue = createMemo(() => {
    try {
      return local.value ? parseColor(local.value) : parseColor("#000000");
    } catch {
      return parseColor("#000000");
    }
  });

  return (
    <div class={cn("grid w-full items-center gap-1.5", local.class)}>
      <Show when={local.label}>
        <Label required={local.required}>{local.label}</Label>
      </Show>

      <ArkColorPicker.Root
        value={parsedValue()}
        onValueChange={(e) => local.onChange?.(e.value.toString("hex"))}
        disabled={local.disabled}
        readOnly={local.readOnly}
        format="hsla"
      >
        <ArkColorPicker.Context>
          {(api) => (
            <ArkColorPicker.Trigger
              class={cn(
                "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
                local.readOnly &&
                  "bg-gray-50 text-gray-500 opacity-100 focus:ring-0",
                local.error && "border-destructive focus:ring-destructive",
              )}
            >
              <div class="flex items-center gap-2">
                <div class="h-4 w-4 rounded-full border border-input overflow-hidden relative shrink-0">
                  <ArkColorPicker.TransparencyGrid class="h-full w-full" />
                  <ArkColorPicker.ValueSwatch class="h-full w-full" />
                </div>
                <span class="font-mono text-xs uppercase text-muted-foreground">
                  {api().value.toString("hex")}
                </span>
              </div>
            </ArkColorPicker.Trigger>
          )}
        </ArkColorPicker.Context>

        <Portal>
          <ArkColorPicker.Positioner>
            <ArkColorPicker.Content class="z-50 w-[260px] rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
              <div class="flex flex-col gap-3">
                <ArkColorPicker.Area class="h-32 w-full rounded-lg overflow-hidden relative border border-border shadow-sm">
                  <ArkColorPicker.AreaBackground class="h-full w-full" />
                  <ArkColorPicker.AreaThumb class="h-3 w-3 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </ArkColorPicker.Area>

                <div class="grid grid-cols-[1fr_auto] gap-3">
                  <div class="flex flex-col gap-3 pt-1">
                    <ArkColorPicker.ChannelSlider
                      channel="hue"
                      class="h-3 rounded-full relative w-full"
                    >
                      <ArkColorPicker.ChannelSliderTrack class="h-full rounded-full border border-border" />
                      <ArkColorPicker.ChannelSliderThumb class="h-4 w-4 rounded-full border-2 border-white shadow-sm -translate-x-1/2 -translate-y-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </ArkColorPicker.ChannelSlider>

                    <ArkColorPicker.ChannelSlider
                      channel="alpha"
                      class="h-3 rounded-full relative w-full"
                    >
                      <ArkColorPicker.TransparencyGrid class="rounded-full" />
                      <ArkColorPicker.ChannelSliderTrack class="h-full rounded-full border border-border" />
                      <ArkColorPicker.ChannelSliderThumb class="h-4 w-4 rounded-full border-2 border-white shadow-sm -translate-x-1/2 -translate-y-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </ArkColorPicker.ChannelSlider>
                  </div>
                  <ArkColorPicker.EyeDropperTrigger class="h-8 w-8 shrink-0 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors self-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="m2 22 1-1h3l9-9" />
                      <path d="M3 21v-3l9-9" />
                      <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 5.3l-9 9" />
                      <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 5.3l-9 9" />
                      <path d="M15 6l-9 9" />
                      <path d="m15 6 4 4" />
                    </svg>
                  </ArkColorPicker.EyeDropperTrigger>
                </div>

                <ArkColorPicker.ChannelInput
                  channel="hex"
                  class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />

                <div class="flex flex-wrap gap-1.5">
                  <For each={presets}>
                    {(color) => (
                      <button
                        type="button"
                        class="h-5 w-5 rounded-full border border-input/20 hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm"
                        style={{ background: color }}
                        onClick={() => local.onChange?.(color)}
                        aria-label={`Select colour ${color}`}
                      />
                    )}
                  </For>
                </div>
              </div>
            </ArkColorPicker.Content>
          </ArkColorPicker.Positioner>
        </Portal>

        <ArkColorPicker.HiddenInput />
      </ArkColorPicker.Root>

      <div
        class={cn(
          "transition-all opacity-0 h-0 duration-300 ease-in-out text-xs text-destructive",
          local.error && "opacity-100 h-4 ",
        )}
      >
        {local.error}
      </div>
    </div>
  );
}
