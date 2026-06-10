import type { ComponentProps } from "@solidjs/web";
import type { Component } from "solid-js";
import { Toaster as Sonner, toast as sonnerToast } from "./sonner/index";

type ToasterProps = ComponentProps<typeof Sonner>;

const Toaster: Component<ToasterProps> = (props) => {
  return (
    <Sonner
      class="toaster group"
      toastOptions={{
        classes: {
          toast:
            "group toast group-[.toaster]:border-border-subtle group-[.toaster]:bg-surface-raised group-[.toaster]:text-surface-raised-foreground group-[.toaster]:shadow-elevation-medium",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

const toast = sonnerToast;

export { Toaster, toast };
