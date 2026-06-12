import type { ComponentProps, JSX } from "@solidjs/web";
import { splitProps } from "../utils/split-props";
import { EllipsisVertical } from "../icons.index";
import type { Component } from "solid-js";

import { cn } from "../cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../navigation/dropdown-menu.tsx";

interface DropdownMoreItemsProps extends Omit<ComponentProps<"div">, "children"> {
  children: JSX.Element;
  triggerClass?: string;
  contentClass?: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  placement?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-start"
    | "top-end"
    | "bottom-start"
    | "bottom-end"
    | "left-start"
    | "left-end"
    | "right-start"
    | "right-end";
}

/**
 * A reusable dropdown component with a pre-configured EllipsisVertical icon trigger.
 *
 * @example
 * ```tsx
 * <DropdownMoreItems>
 *   <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
 *   <DropdownMenuItem class="text-danger" onClick={handleDelete}>Delete</DropdownMenuItem>
 * </DropdownMoreItems>
 * ```
 */
const DropdownMoreItems: Component<DropdownMoreItemsProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "placement",
    "triggerClass",
    "contentClass",
    "children",
  ]);

  return (
    <DropdownMenu placement={local.placement || "bottom"} {...rest}>
      <DropdownMenuTrigger
        class={cn(
          "flex h-6 w-6 cursor-pointer items-center justify-center rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-hover hover:text-hover-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
          local.triggerClass,
        )}
      >
        <EllipsisVertical aria-hidden="true" class="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent class={local.contentClass}>{local.children}</DropdownMenuContent>
    </DropdownMenu>
  );
};

export { DropdownMoreItems };
export type { DropdownMoreItemsProps };
