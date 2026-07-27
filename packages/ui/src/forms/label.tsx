import type { ComponentProps } from "@solidjs/web";
import type { Component } from "solid-js";
import { omit, Show } from "solid-js";

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
  const local = props;
  const others = omit(props, "class", "required", "children");
  return (
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
        <span class="text-error">*</span>
      </Show>
    </label>
  );
};

export { Label };
