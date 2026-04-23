import type { Component, ComponentProps } from "solid-js";
import { Show, splitProps } from "solid-js";

import { cn } from "../cn";

type LabelProps = ComponentProps<"label"> & {
  required?: boolean;
};

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
 *   <Label required>Required field</Label>
 * </div>
 * ```
 */
const Label: Component<LabelProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "required", "children"]);
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Generic label component - consumer provides htmlFor or wraps control
    <label
      class={cn(
        "text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        local.class,
      )}
      {...others}
    >
      {local.children}
      <Show when={local.required}>
        {" "}
        <span class="text-destructive">*</span>
      </Show>
    </label>
  );
};

export { Label };
