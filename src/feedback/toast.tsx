/**
 * # Toast
 *
 * Renders transient status messages in a toast region.
 *
 * @example
 * ```tsx
 * toast({ title: "Saved", description: "Changes are now live." });
 * <Toaster />
 * ```
 */
import type { ComponentProps, JSX } from "@solidjs/web";
import { cva, type VariantProps } from "class-variance-authority";
import type { Component } from "solid-js";
import { createContext, createSignal, For, onCleanup, Show, useContext } from "solid-js";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "../icons.index";
import { cn } from "../cn";
import { splitProps } from "../utils/split-props";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border border-border-subtle bg-surface-raised px-4 py-3 text-surface-raised-foreground shadow-elevation-medium",
  {
    variants: {
      variant: {
        default: "",
        success: "border-success/35",
        warning: "border-warning/40",
        error: "border-danger/35",
        info: "border-info/35",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type ToastData = {
  id: number;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
  duration?: number;
  action?: JSX.Element;
};

type ToastRootProps = Omit<ComponentProps<"li">, "id"> &
  VariantProps<typeof toastVariants> & {
    toastId?: number;
    onOpenChange?: (open: boolean) => void;
  };

const ToastContext = createContext<{ close: () => void }>({ close: () => {} });

const Toast: Component<ToastRootProps> = (props) => {
  const [local, others] = splitProps(props, [
    "class",
    "children",
    "variant",
    "onOpenChange",
    "toastId",
  ]);

  const close = () => {
    if (local.toastId !== undefined) toast.dismiss(local.toastId);
    local.onOpenChange?.(false);
  };

  return (
    <ToastContext value={{ close }}>
      <li
        role="status"
        aria-live="polite"
        class={cn(toastVariants({ variant: local.variant }), local.class)}
        {...others}
      >
        {local.children}
      </li>
    </ToastContext>
  );
};

type ToastRegionProps = ComponentProps<"section">;

const ToastRegion: Component<ToastRegionProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <section
      aria-label="Notifications"
      class={cn(
        "fixed bottom-6 left-1/2 z-[100] w-full max-w-sm -translate-x-1/2 px-4",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </section>
  );
};

type ToastTitleProps = ComponentProps<"div">;

const ToastTitle: Component<ToastTitleProps> = (props) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <div
      class={cn("text-sm font-medium text-surface-raised-foreground", local.class)}
      {...others}
    />
  );
};

type ToastDescriptionProps = ComponentProps<"div">;

const ToastDescription: Component<ToastDescriptionProps> = (props) => {
  const [local, others] = splitProps(props, ["class"]);

  return <div class={cn("text-sm text-surface-muted-foreground", local.class)} {...others} />;
};

type ToastCloseButtonProps = ComponentProps<"button">;

const ToastCloseButton: Component<ToastCloseButtonProps> = (props) => {
  const context = useContext(ToastContext);
  const [local, others] = splitProps(props, ["class", "children", "onClick"]);

  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const handler = local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent> | undefined;
    handler?.(event);
    if (!event.defaultPrevented) context.close();
  };

  return (
    <button
      type="button"
      aria-label="Dismiss notification"
      class={cn(
        "ml-2 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-hover hover:text-hover-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover:opacity-100",
        local.class,
      )}
      onClick={onClick}
      {...others}
    >
      <Show when={local.children} fallback={<X aria-hidden="true" class="size-4" />}>
        {local.children}
      </Show>
    </button>
  );
};

const ToastAction: Component<ComponentProps<"button"> & { altText: string }> = (props) => {
  const [local, others] = splitProps(props, ["class", "altText"]);

  return (
    <button
      type="button"
      aria-label={local.altText}
      class={cn(
        "inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface px-3 text-xs font-medium text-surface-foreground transition-colors hover:bg-hover hover:text-hover-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

let toastId = 0;
let pendingToasts: ToastData[] = [];
let activeStore:
  | {
      add: (toastData: ToastData) => void;
      dismiss: (id?: number) => void;
    }
  | undefined;

function toast(options: Omit<ToastData, "id">) {
  const id = ++toastId;
  const toastData = { id, ...options };

  if (activeStore) {
    activeStore.add(toastData);
  } else {
    pendingToasts = [...pendingToasts, toastData];
  }

  if (options.duration !== 0) {
    globalThis.setTimeout(() => toast.dismiss(id), options.duration ?? 4000);
  }

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

toast.dismiss = (id?: number) => {
  pendingToasts = id === undefined ? [] : pendingToasts.filter((toastData) => toastData.id !== id);
  activeStore?.dismiss(id);
};

const getToastIcon = (variant?: ToastData["variant"]) => {
  switch (variant) {
    case "success":
      return <CheckCircle2 class="mt-0.5 size-5 shrink-0 text-success" />;
    case "error":
      return <XCircle class="mt-0.5 size-5 shrink-0 text-danger" />;
    case "warning":
      return <TriangleAlert class="mt-0.5 size-5 shrink-0 text-warning" />;
    case "info":
      return <Info class="mt-0.5 size-5 shrink-0 text-info" />;
    default:
      return null;
  }
};

const Toaster: Component = () => {
  const [toasts, setToasts] = createSignal<ToastData[]>([]);
  const store = {
    add: (toastData: ToastData) => setToasts((prev) => [...prev, toastData]),
    dismiss: (id?: number) =>
      setToasts((prev) =>
        id === undefined ? [] : prev.filter((toastData) => toastData.id !== id),
      ),
  };

  activeStore = store;
  if (pendingToasts.length > 0) {
    store.add(pendingToasts[0]);
    pendingToasts.slice(1).forEach(store.add);
    pendingToasts = [];
  }

  onCleanup(() => {
    if (activeStore === store) activeStore = undefined;
  });

  return (
    <ToastRegion>
      <ol class="flex flex-col-reverse gap-2">
        <For each={toasts()}>
          {(toastData) => (
            <Toast toastId={toastData.id} variant={toastData.variant}>
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
      </ol>
    </ToastRegion>
  );
};

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
