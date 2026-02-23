import * as DialogPrimitive from "@kobalte/core/dialog";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { Component, ComponentProps, JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../cn";

const Dialog: Component<DialogPrimitive.DialogRootProps> = (props) => {
  const [local, rest] = splitProps(props, ["modal"]);
  return <DialogPrimitive.Root modal={local.modal ?? false} {...rest} />;
};
const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal: Component<{
  children: JSX.Element;
  mount?: Node;
  zIndex?: string;
}> = (props) => {
  const [, rest] = splitProps(props, ["children", "zIndex"]);
  return (
    <DialogPrimitive.Portal {...rest}>
      <div
        class={cn(
          "pointer-events-none fixed inset-0 flex items-start justify-center sm:!items-center p-6 print:hidden",
          props.zIndex || "z-50",
        )}
      >
        {props.children}
      </div>
    </DialogPrimitive.Portal>
  );
};

type DialogOverlayProps<_T extends ValidComponent = "div"> =
  DialogPrimitive.DialogOverlayProps & {
    class?: string | undefined;
    zIndex?: string;
  };

const DialogOverlay = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DialogOverlayProps<T>>,
) => {
  const [, rest] = splitProps(props as DialogOverlayProps, ["class", "zIndex"]);
  return (
    <DialogPrimitive.Overlay
      class={cn(
        "pointer-events-auto fixed inset-0 bg-black/30 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 p-6",
        props.zIndex || "z-50",
        props.class,
      )}
      {...rest}
    />
  );
};

type DialogContentProps<_T extends ValidComponent = "div"> =
  DialogPrimitive.DialogContentProps & {
    class?: string | undefined;
    children?: JSX.Element;
    mount?: HTMLDivElement;
    hideCloseButton?: boolean;
    zIndex?: string;
  };

const DialogContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DialogContentProps<T>>,
) => {
  const [local, rest] = splitProps(props as DialogContentProps, [
    "class",
    "children",
    "mount",
    "hideCloseButton",
    "zIndex",
  ]);
  return (
    <DialogPortal mount={local.mount} zIndex={local.zIndex}>
      <DialogOverlay zIndex={local.zIndex} />
      <DialogPrimitive.Content
        class={cn(
          "pointer-events-auto relative flex flex-col max-h-full max-w-full overflow-hidden gap-4 bg-background p-6 shadow-lg duration-200 ease-in-out data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 sm:!rounded-lg",
          local.zIndex || "z-50",
          local.class,
        )}
        {...rest}
      >
        {local.children}
        {!local.hideCloseButton && (
          <DialogPrimitive.CloseButton class="cursor-pointer absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[expanded]:bg-accent data-[expanded]:text-muted-foreground">
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
            <span class="sr-only">Close</span>
          </DialogPrimitive.CloseButton>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
};

const DialogHeader: Component<ComponentProps<"div">> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("flex flex-col gap-4 text-center sm:!text-left", props.class)}
      {...rest}
    />
  );
};

const DialogFooter: Component<ComponentProps<"div">> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  return (
    <div
      class={cn(
        "flex flex-col-reverse sm:!flex-row sm:!justify-end sm:!space-x-2",
        props.class,
      )}
      {...rest}
    />
  );
};

type DialogTitleProps<_T extends ValidComponent = "h2"> =
  DialogPrimitive.DialogTitleProps & {
    class?: string | undefined;
  };

const DialogTitle = <T extends ValidComponent = "h2">(
  props: PolymorphicProps<T, DialogTitleProps<T>>,
) => {
  const [, rest] = splitProps(props as DialogTitleProps, ["class"]);
  return (
    <DialogPrimitive.Title
      class={cn(
        " font-semibold leading-none tracking-tight -mb-3",
        props.class,
      )}
      {...rest}
    />
  );
};

type DialogDescriptionProps<_T extends ValidComponent = "p"> =
  DialogPrimitive.DialogDescriptionProps & {
    class?: string | undefined;
  };

const DialogDescription = <T extends ValidComponent = "p">(
  props: PolymorphicProps<T, DialogDescriptionProps<T>>,
) => {
  const [, rest] = splitProps(props as DialogDescriptionProps, ["class"]);
  return (
    <DialogPrimitive.Description
      class={cn("text-xs text-muted-foreground pt-2", props.class)}
      {...rest}
    />
  );
};

/**
 * # Dialog
 *
 * Modal dialog for focused interactions.
 *
 * @example
 * ```
 * <Dialog>
 *   <DialogTrigger class="px-4 py-2 border rounded">Open Dialog</DialogTrigger>
 *   <DialogContent class="sm:max-w-[425px]">
 *     <DialogHeader>
 *       <DialogTitle>Edit Profile</DialogTitle>
 *       <DialogDescription>Make changes to your profile here.</DialogDescription>
 *     </DialogHeader>
 *     <div class="py-4">
 *       <p class="text-sm text-muted-foreground">Dialog content goes here.</p>
 *     </div>
 *     <DialogFooter>
 *       <button type="button" class="px-4 py-2 bg-primary text-primary-foreground rounded">Save changes</button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 * ```
 */
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
