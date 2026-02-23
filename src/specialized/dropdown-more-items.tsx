import type { DropdownMenuRootProps } from "@kobalte/core/dropdown-menu";
import { EllipsisVertical } from "lucide-solid";
import type { Component, JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../navigation/dropdown-menu.tsx";

interface DropdownMoreItemsProps extends DropdownMenuRootProps {
  children: JSX.Element;
  triggerClass?: string;
  contentClass?: string;
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
 *   <DropdownMenuItem class="text-red-500" onClick={handleDelete}>Delete</DropdownMenuItem>
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
          "flex items-center justify-center cursor-pointer hover:bg-accent rounded p-0.5 h-6 w-6",
          local.triggerClass,
        )}
      >
        <EllipsisVertical size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent class={local.contentClass}>
        {local.children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { DropdownMoreItems };
export type { DropdownMoreItemsProps };
