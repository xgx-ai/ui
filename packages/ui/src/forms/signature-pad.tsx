import { ChevronDown, Pen, Plus, Trash2, Type, Upload } from "../icons.index";
import { createTrackedEffect, createSignal, For, Show } from "solid-js";
import { cn } from "../cn.ts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../layout/tabs.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../overlays/popover.tsx";
import { Button } from "./button.tsx";
import { TextField, TextFieldInput } from "./text-field.tsx";

interface ImageCropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SignatureMetadata {
  timestamp: string;
  ipAddress?: string;
  method: "text" | "draw" | "upload";
  fontFamily?: string;
}

interface SignatureData {
  signature: string; // base64 image
  metadata: SignatureMetadata;
}

interface SignatureFieldProps {
  label: string;
  placeholder?: string;
  value?: string | SignatureData;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  inkColor?: string;
  backgroundColor?: string;
}

const GOOGLE_FONTS = [
  { value: "Dancing Script", label: "Dancing Script" },
  { value: "Great Vibes", label: "Great Vibes" },
  { value: "Allura", label: "Allura" },
  { value: "Alex Brush", label: "Alex Brush" },
  { value: "Amatic SC", label: "Amatic SC" },
  { value: "Caveat", label: "Caveat" },
  { value: "Courgette", label: "Courgette" },
  { value: "Kaushan Script", label: "Kaushan Script" },
  { value: "Lobster", label: "Lobster" },
  { value: "Pacifico", label: "Pacifico" },
  { value: "Permanent Marker", label: "Permanent Marker" },
  { value: "Playwrite GB S", label: "Playwrite GB S" },
  { value: "Sacramento", label: "Sacramento" },
  { value: "Satisfy", label: "Satisfy" },
  { value: "Shadows Into Light", label: "Shadows Into Light" },
];

async function getIpAddress() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip;
  } catch {
    return undefined;
  }
}

function resolveCanvasColor(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith("var(")) return value;

  const property = value.match(/var\((--[^,\s)]+)/)?.[1];
  if (!property || typeof document === "undefined") return fallback;

  return getComputedStyle(document.documentElement).getPropertyValue(property).trim() || fallback;
}

function generateTextSignature(
  text: string,
  fontFamily: string,
  fontSize: number,
  width: number,
  height: number,
  inkColor: string,
  backgroundColor: string,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = inkColor;
  ctx.font = `${fontSize}px "${fontFamily}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);

  return canvas.toDataURL("image/png");
}

async function processSignatureImage(
  file: File,
  cropData?: ImageCropData,
  inkColor = "CanvasText",
  backgroundColor = "Canvas",
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Use crop data or full image
        const sx = cropData?.x ?? 0;
        const sy = cropData?.y ?? 0;
        const sw = cropData?.width ?? img.width;
        const sh = cropData?.height ?? img.height;

        // Set canvas size to target dimensions
        const targetWidth = 400;
        const targetHeight = 100;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Calculate aspect ratio preserving dimensions
        const scale = Math.min(targetWidth / sw, targetHeight / sh);
        const dw = sw * scale;
        const dh = sh * scale;
        const dx = (targetWidth - dw) / 2;
        const dy = (targetHeight - dh) / 2;

        // Draw the image
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 255 - avg;
        }
        ctx.putImageData(imageData, 0, 0);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = inkColor;
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.globalCompositeOperation = "source-over";

        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function SignaturePad(props: SignatureFieldProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<"text" | "draw" | "upload">("text");
  const [textInput, setTextInput] = createSignal("");
  const [selectedFont, setSelectedFont] = createSignal("Dancing Script");
  const [fontsLoaded, setFontsLoaded] = createSignal(false);
  const [isDrawing, setIsDrawing] = createSignal(false);
  const [uploadedFile, setUploadedFile] = createSignal<File | null>(null);
  const [cropData, setCropData] = createSignal<ImageCropData | null>(null);

  let canvasRef: HTMLCanvasElement | undefined;
  let fileInputRef: HTMLInputElement | undefined;
  const signatureInkColor = () =>
    resolveCanvasColor(props.inkColor ?? "var(--signature-ink)", "CanvasText");
  const signatureBackgroundColor = () =>
    resolveCanvasColor(props.backgroundColor ?? "var(--signature-background)", "Canvas");

  // Load Google Fonts when popover opens
  const loadGoogleFonts = () => {
    if (fontsLoaded()) return;

    // Create Google Fonts link with all our signature fonts
    const fontFamilies = GOOGLE_FONTS.map((font) => font.value.replace(/ /g, "+")).join("&family=");

    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;
    link.rel = "stylesheet";

    // Add to document head
    document.head.appendChild(link);

    // Wait for fonts to load
    link.onload = () => {
      setFontsLoaded(true);
    };
  };

  // Load fonts when popover opens
  createTrackedEffect(() => {
    if (isOpen() && !fontsLoaded()) {
      loadGoogleFonts();
    }
  });

  // Generate signature metadata for e-signature compliance
  async function generateSignatureMetadata(
    method: "text" | "draw" | "upload",
    fontFamily?: string,
  ) {
    return {
      timestamp: new Date().toISOString(),
      method,
      fontFamily,
      ipAddress: await getIpAddress(),
    };
  }

  async function createSignatureData(
    signature: string,
    method: "text" | "draw" | "upload",
    fontFamily?: string,
  ) {
    const metadata = await generateSignatureMetadata(method, fontFamily);
    const signatureData: SignatureData = {
      signature,
      metadata: metadata,
    };
    return JSON.stringify(signatureData);
  }

  // Initialize canvas for drawing
  createTrackedEffect(() => {
    if (canvasRef && activeTab() === "draw") {
      const ctx = canvasRef.getContext("2d");
      if (ctx) {
        ctx.fillStyle = signatureBackgroundColor();
        ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);
        ctx.strokeStyle = signatureInkColor();
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  });

  const handleSaveTextSignature = async () => {
    if (!textInput().trim()) return;

    try {
      const signature = generateTextSignature(
        textInput(),
        selectedFont(),
        24,
        400,
        100,
        signatureInkColor(),
        signatureBackgroundColor(),
      );
      const signatureWithMetadata = await createSignatureData(signature, "text", selectedFont());
      props.onChange(signatureWithMetadata);
      setIsOpen(false);
    } catch (error) {
      console.error("Error generating text signature:", error);
    }
  };

  const handleSaveDrawnSignature = async () => {
    if (!canvasRef) return;

    try {
      const signature = canvasRef.toDataURL("image/png");
      const signatureWithMetadata = await createSignatureData(signature, "draw");
      props.onChange(signatureWithMetadata);
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving drawn signature:", error);
    }
  };

  const startDrawing = (e: MouseEvent) => {
    if (!canvasRef || props.disabled) return;
    setIsDrawing(true);

    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvasRef.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: MouseEvent) => {
    if (!isDrawing() || !canvasRef || props.disabled) return;

    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvasRef.getContext("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing() || !canvasRef) return;
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef) return;

    const ctx = canvasRef.getContext("2d");
    if (ctx) {
      ctx.fillStyle = signatureBackgroundColor();
      ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);
    }
    props.onChange("");
  };

  const handleFileUpload = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    setUploadedFile(file);
  };

  const handleSaveUploadedSignature = async () => {
    const file = uploadedFile();
    if (!file) return;

    try {
      const processedSignature = await processSignatureImage(
        file,
        cropData() || undefined,
        signatureInkColor(),
        signatureBackgroundColor(),
      );
      const signatureWithMetadata = await createSignatureData(processedSignature, "upload");
      props.onChange(signatureWithMetadata);
      setIsOpen(false);
    } catch (error) {
      console.error("Error processing uploaded image:", error);
      alert("Failed to process image. Please try again.");
    }
  };

  const triggerFileUpload = () => {
    fileInputRef?.click();
  };

  const getSignatureImage = (value?: string | SignatureData): string | null => {
    if (!value) return null;

    if (typeof value === "object" && "signature" in value) {
      return value.signature;
    }

    if (typeof value !== "string") return null;

    try {
      // Try to parse as JSON (new format with metadata)
      const signatureData: SignatureData = JSON.parse(value);
      return signatureData.signature;
    } catch {
      // Fallback to old format (direct base64 image)
      return value.startsWith("data:image") ? value : null;
    }
  };

  const clearSignature = () => {
    props.onChange("");
    setTextInput("");
    setUploadedFile(null);
    setCropData(null);
    if (canvasRef) {
      clearCanvas();
    }
  };

  return (
    <div class="flex flex-col gap-2">
      <Show
        when={!props.disabled}
        fallback={
          <Show
            when={getSignatureImage(props.value)}
            fallback={
              <div class="flex h-20 w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border-subtle bg-surface-muted">
                <span class="text-sm text-muted-foreground">No signature</span>
              </div>
            }
          >
            <div class="group relative rounded-md border border-border-subtle bg-surface-muted p-4">
              <img
                src={getSignatureImage(props.value) ?? ""}
                alt="Current signature"
                class="max-w-full max-h-16 object-contain mx-auto"
                style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;"
              />
            </div>
          </Show>
        }
      >
        <Popover open={isOpen()} onOpenChange={setIsOpen}>
          <PopoverTrigger>
            <div class="w-full">
              <Show
                when={getSignatureImage(props.value)}
                fallback={
                  <Button
                    variant="outline"
                    class="flex h-20 w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-border-subtle text-muted-foreground hover:border-border-strong hover:text-foreground"
                    disabled={props.disabled}
                  >
                    <Plus class="h-6 w-6" />
                    <span class="text-sm">Add Signature</span>
                  </Button>
                }
              >
                <div class="group relative cursor-pointer rounded-md border border-border-subtle bg-surface-muted p-4 transition-colors hover:bg-hover">
                  <img
                    src={getSignatureImage(props.value) ?? ""}
                    alt="Current signature"
                    class="max-w-full max-h-16 object-contain mx-auto"
                    style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;"
                  />
                  <div class="absolute inset-0 flex items-center justify-center rounded-md bg-surface-raised opacity-0 transition-opacity group-hover:opacity-90">
                    <Pen class="h-4 w-4 text-foreground" />
                  </div>
                </div>
              </Show>
            </div>
          </PopoverTrigger>

          <PopoverContent class="w-96 p-0">
            <div class="p-4">
              <div class="mb-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-semibold">Create Signature</h3>
                  <Show when={getSignatureImage(props.value)}>
                    <Button
                      onClick={clearSignature}
                      variant="ghost"
                      size="sm"
                      class="text-danger hover:bg-danger hover:text-danger-foreground"
                    >
                      <Trash2 class="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  </Show>
                </div>
              </div>

              <Tabs value={activeTab()} onChange={setActiveTab}>
                <TabsList class="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="text" disabled={props.disabled}>
                    <Type class="w-4 h-4 mr-1" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="draw" disabled={props.disabled}>
                    <Pen class="w-4 h-4 mr-1" />
                    Draw
                  </TabsTrigger>
                  <TabsTrigger value="upload" disabled={props.disabled}>
                    <Upload class="w-4 h-4 mr-1" />
                    Upload
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" class="space-y-4">
                  <TextField>
                    <TextFieldInput
                      placeholder={props.placeholder || "Enter your name"}
                      value={textInput()}
                      onInput={(e) => setTextInput(e.currentTarget.value)}
                      disabled={props.disabled}
                    />
                  </TextField>

                  <div class="relative">
                    <select
                      value={selectedFont()}
                      onChange={(e) => setSelectedFont(e.currentTarget.value)}
                      disabled={props.disabled || !fontsLoaded()}
                      class={cn(
                        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        "appearance-none pr-8",
                      )}
                    >
                      <For each={GOOGLE_FONTS}>
                        {(font) => (
                          <option
                            value={font.value}
                            style={{
                              "font-family": fontsLoaded() ? font.value : "inherit",
                            }}
                          >
                            {font.label}
                          </option>
                        )}
                      </For>
                    </select>
                    <ChevronDown class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
                    <Show when={!fontsLoaded()}>
                      <div class="absolute inset-0 flex items-center justify-center rounded-md bg-surface-raised">
                        <span class="text-xs text-muted-foreground">Loading fonts...</span>
                      </div>
                    </Show>
                  </div>

                  <Show when={textInput().trim()}>
                    <div
                      class="rounded-md border border-border-subtle bg-surface p-3 text-center text-surface-foreground"
                      style={{
                        "font-family": fontsLoaded() ? selectedFont() : "inherit",
                        "font-size": "20px",
                        "min-height": "50px",
                        display: "flex",
                        "align-items": "center",
                        "justify-content": "center",
                      }}
                    >
                      {textInput()}
                    </div>
                  </Show>

                  <Button
                    onClick={handleSaveTextSignature}
                    disabled={!textInput().trim() || props.disabled}
                    class="w-full"
                  >
                    Save Signature
                  </Button>
                </TabsContent>

                <TabsContent value="draw" class="space-y-4">
                  <div class="rounded-md border border-border-subtle bg-surface p-2">
                    <canvas
                      ref={canvasRef}
                      width={340}
                      height={100}
                      class="w-full cursor-crosshair border border-dashed border-border-subtle"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      style={{ "touch-action": "none" }}
                    />
                  </div>
                  <p class="text-xs text-muted-foreground text-center">
                    Click and drag to draw your signature
                  </p>
                  <div class="flex gap-2">
                    <Button
                      onClick={handleSaveDrawnSignature}
                      disabled={props.disabled}
                      class="flex-1"
                    >
                      Save Signature
                    </Button>
                    <Button
                      onClick={clearCanvas}
                      variant="outline"
                      disabled={props.disabled}
                      class="flex-1"
                    >
                      <Trash2 class="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="upload" class="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                    disabled={props.disabled}
                  />

                  <button
                    type="button"
                    class="w-full cursor-pointer rounded-md border-2 border-dashed border-border-subtle bg-transparent p-6 text-center transition-colors hover:border-border-strong hover:bg-hover"
                    onClick={triggerFileUpload}
                  >
                    <Upload class="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                    <p class="text-sm text-foreground">Click to upload signature image</p>
                    <p class="mt-1 text-xs text-muted-foreground">
                      Will be converted to high contrast
                    </p>
                  </button>

                  <Show when={uploadedFile()}>
                    <div class="space-y-3">
                      <p class="text-center text-sm text-success-foreground">
                        Image uploaded: {uploadedFile()?.name}
                      </p>
                      <Button
                        onClick={handleSaveUploadedSignature}
                        disabled={props.disabled}
                        class="w-full"
                      >
                        Save Signature
                      </Button>
                    </div>
                  </Show>
                </TabsContent>
              </Tabs>
            </div>
          </PopoverContent>
        </Popover>
      </Show>

      {/* Error message */}
      <Show when={props.error}>
        <div class="text-sm text-error">{props.error}</div>
      </Show>
    </div>
  );
}
