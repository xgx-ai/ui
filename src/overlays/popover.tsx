import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as PopoverPrimitive from "@kobalte/core/popover";
import type { JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../cn";

/**
 * # Popover
 *
 * Floating content panel triggered by a button.
 *
 * @example
 * ```
 * <Popover>
 *   <PopoverTrigger class="px-4 py-2 rounded bg-primary text-primary-foreground">
 *     Open Popover
 *   </PopoverTrigger>
 *   <PopoverContent>
 *     <PopoverTitle>Popover Title</PopoverTitle>
 *     <PopoverDescription>This is the popover content.</PopoverDescription>
 *   </PopoverContent>
 * </Popover>
 * ```
 */

type Placement =
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "top"
  | "top-start"
  | "top-end"
  | "left"
  | "left-start"
  | "left-end"
  | "right"
  | "right-start"
  | "right-end";

type PopoverProps = PopoverPrimitive.PopoverRootProps & {
  children?: JSX.Element;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** @deprecated Use placement directly instead */
  positioning?: {
    placement?: Placement;
    gutter?: number;
    offset?: { crossAxis?: number };
  };
};

const Popover = (props: PopoverProps) => {
  const [localProps, others] = splitProps(props, [
    "isOpen",
    "onOpenChange",
    "defaultOpen",
    "positioning",
  ]);

  // Extract placement from positioning for backwards compatibility
  const placement = localProps.positioning?.placement;
  const gutter = localProps.positioning?.gutter;

  return (
    <PopoverPrimitive.Root
      open={localProps.isOpen}
      defaultOpen={localProps.defaultOpen}
      onOpenChange={localProps.onOpenChange}
      placement={placement}
      gutter={gutter}
      {...others}
    />
  );
};

type PopoverContentProps<T extends ValidComponent = "div"> =
  PopoverPrimitive.PopoverContentProps<T> & {
    class?: string;
    arrow?: boolean;
    /** Whether to render the popover in a portal. Set to false when inside floating toolbars. Defaults to true. */
    portalled?: boolean;
  };

const PopoverContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, PopoverContentProps<T>>,
) => {
  const [local, others] = splitProps(props as PopoverContentProps, [
    "class",
    "arrow",
    "portalled",
  ]);

  const content = (
    <PopoverPrimitive.Content
      class={cn(
        "z-50 w-72 max-h-[var(--kb-popper-content-available-height)] overflow-y-auto rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95",
        local.class,
      )}
      {...others}
    >
      {local.arrow && <PopoverPrimitive.Arrow />}
      {props.children}
    </PopoverPrimitive.Content>
  );

  if (local.portalled === false) {
    return content;
  }

  return <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal>;
};

const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverClose = PopoverPrimitive.CloseButton;
const PopoverTitle = PopoverPrimitive.Title;
const PopoverDescription = PopoverPrimitive.Description;

export {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
};
