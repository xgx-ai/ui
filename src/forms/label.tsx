import type { Component, ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "../cn";

/**
 * # Label
 *
 * Form label for input fields.
 *
 * @example
 * ```
 * <div class="space-y-2">
 *   <Label for="email">Email address</Label>
 *   <Label class="text-muted-foreground">Optional label</Label>
 * </div>
 * ```
 */
const Label: Component<ComponentProps<"label">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Generic label component - consumer provides htmlFor or wraps control
    <label
      class={cn(
        "text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        local.class,
      )}
      {...others}
    />
  );
};

export { Label };
