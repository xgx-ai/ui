import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as ToastPrimitive from "@kobalte/core/toast";
import { cva, type VariantProps } from "class-variance-authority";
import type { Component, ComponentProps, JSX, ValidComponent } from "solid-js";
import { createSignal, For, Show, splitProps } from "solid-js";
import { Portal } from "solid-js/web";
import { cn } from "../cn";

// Toast Region - container for all toasts
type ToastRegionProps = ToastPrimitive.ToastRegionProps & {
  class?: string;
};

const ToastRegion: Component<ToastRegionProps> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <Portal>
      <ToastPrimitive.Region
        class={cn(
          "fixed bottom-0 left-1/2 z-[100] flex max-h-screen -translate-x-1/2 flex-col-reverse gap-2 p-4",
          local.class,
        )}
        {...others}
      >
        <ToastPrimitive.List class="flex flex-col-reverse gap-2" />
      </ToastPrimitive.Region>
    </Portal>
  );
};

// Toast variants - all use white background with coloured icons
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--kb-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--kb-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[opened]:animate-in data-[closed]:animate-out data-[swipe=end]:animate-out data-[closed]:fade-out-80 data-[closed]:slide-out-to-bottom-full data-[opened]:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "text-slate-700",
        success: "text-slate-700",
        warning: "text-slate-700",
        error: "text-slate-700",
        info: "text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type ToastRootProps<T extends ValidComponent = "li"> =
  ToastPrimitive.ToastRootProps<T> &
    VariantProps<typeof toastVariants> & {
      class?: string;
      onOpenChange?: (open: boolean) => void;
    };

const Toast = <T extends ValidComponent = "li">(
  props: PolymorphicProps<T, ToastRootProps<T>>,
) => {
  const [local, others] = splitProps(props as ToastRootProps, [
    "class",
    "variant",
  ]);
  return (
    <ToastPrimitive.Root
      class={cn(toastVariants({ variant: local.variant }), local.class)}
      {...others}
    />
  );
};

type ToastTitleProps<T extends ValidComponent = "div"> =
  ToastPrimitive.ToastTitleProps<T> & {
    class?: string;
  };

const ToastTitle = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ToastTitleProps<T>>,
) => {
  const [local, others] = splitProps(props as ToastTitleProps, ["class"]);
  return (
    <ToastPrimitive.Title
      class={cn("text-sm font-medium text-slate-900", local.class)}
      {...others}
    />
  );
};

type ToastDescriptionProps<T extends ValidComponent = "div"> =
  ToastPrimitive.ToastDescriptionProps<T> & {
    class?: string;
  };

const ToastDescription = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ToastDescriptionProps<T>>,
) => {
  const [local, others] = splitProps(props as ToastDescriptionProps, ["class"]);
  return (
    <ToastPrimitive.Description
      class={cn("text-sm text-slate-500", local.class)}
      {...others}
    />
  );
};

type ToastCloseButtonProps<T extends ValidComponent = "button"> =
  ToastPrimitive.ToastCloseButtonProps<T> & {
    class?: string;
  };

const ToastCloseButton = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, ToastCloseButtonProps<T>>,
) => {
  const [local, others] = splitProps(props as ToastCloseButtonProps, ["class"]);
  return (
    <ToastPrimitive.CloseButton
      class={cn(
        "ml-2 shrink-0 rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 focus:opacity-100 focus:outline-none group-hover:opacity-100",
        local.class,
      )}
      {...others}
    >
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-4"
      >
        <path d="M18 6l-12 12" />
        <path d="M6 6l12 12" />
      </svg>
    </ToastPrimitive.CloseButton>
  );
};

// Toast action button
const ToastAction: Component<ComponentProps<"button"> & { altText: string }> = (
  props,
) => {
  const [local, others] = splitProps(props, ["class", "altText"]);
  return (
    <button
      class={cn(
        "inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:pointer-events-none disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

// Toast state management
type ToastData = {
  id: number;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
  duration?: number;
  action?: JSX.Element;
};

const [toasts, setToasts] = createSignal<ToastData[]>([]);
let toastId = 0;

function toast(options: Omit<ToastData, "id">) {
  const id = ++toastId;
  setToasts((prev) => [...prev, { id, ...options }]);
  return id;
}

toast.success = (title: string, description?: string) =>
  toast({ title, description, variant: "success" });

toast.error = (title: string, description?: string) =>
  toast({ title, description, variant: "error" });

toast.warning = (title: string, description?: string) =>
  toast({ title, description, variant: "warning" });

toast.info = (title: string, description?: string) =>
  toast({ title, description, variant: "info" });

toast.dismiss = (id: number) => {
  setToasts((prev) => prev.filter((t) => t.id !== id));
};

// Status icons for toast variants
const SuccessIcon = () => (
  <svg
    class="size-5 shrink-0 text-emerald-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ErrorIcon = () => (
  <svg
    class="size-5 shrink-0 text-red-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const WarningIcon = () => (
  <svg
    class="size-5 shrink-0 text-amber-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const InfoIcon = () => (
  <svg
    class="size-5 shrink-0 text-blue-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const getToastIcon = (variant?: ToastData["variant"]) => {
  switch (variant) {
    case "success":
      return <SuccessIcon />;
    case "error":
      return <ErrorIcon />;
    case "warning":
      return <WarningIcon />;
    case "info":
      return <InfoIcon />;
    default:
      return null;
  }
};

// Toaster component that renders all toasts
const Toaster: Component = () => {
  return (
    <Portal>
      <ToastPrimitive.Region
        swipeDirection="down"
        duration={4000}
        class="fixed bottom-6 left-1/2 z-[100] w-full max-w-sm -translate-x-1/2"
      >
        <ToastPrimitive.List class="flex flex-col-reverse gap-2" />
        <For each={toasts()}>
          {(toastData) => (
            <Toast
              toastId={toastData.id}
              variant={toastData.variant}
              onOpenChange={(open) => {
                if (!open) {
                  toast.dismiss(toastData.id);
                }
              }}
              duration={toastData.duration}
            >
              {getToastIcon(toastData.variant)}
              <div class="min-w-0 flex-1">
                <Show when={toastData.title}>
                  <ToastTitle>{toastData.title}</ToastTitle>
                </Show>
                <Show when={toastData.description}>
                  <ToastDescription>{toastData.description}</ToastDescription>
                </Show>
              </div>
              <Show when={toastData.action}>{toastData.action}</Show>
              <ToastCloseButton />
            </Toast>
          )}
        </For>
      </ToastPrimitive.Region>
    </Portal>
  );
};

/**
 * # Toast
 *
 * Toast notification system with multiple variants.
 *
 * @example
 * ```
 * <div class="space-y-4">
 *   <div class="flex flex-wrap gap-2">
 *     <Button onClick={() => toast({ title: "Default Toast", description: "This is a notification." })}>Default</Button>
 *     <Button onClick={() => toast.success("Success!", "Operation completed successfully.")}>Success</Button>
 *     <Button onClick={() => toast.error("Error!", "Something went wrong.")}>Error</Button>
 *     <Button onClick={() => toast.warning("Warning!", "Please review this action.")}>Warning</Button>
 *     <Button onClick={() => toast.info("Info", "Here's some information.")}>Info</Button>
 *   </div>
 *   <Toaster />
 * </div>
 * ```
 */
export {
  Toast,
  ToastAction,
  ToastCloseButton,
  ToastDescription,
  Toaster,
  ToastRegion,
  ToastTitle,
  toast,
  toastVariants,
};
export type { ToastData };
