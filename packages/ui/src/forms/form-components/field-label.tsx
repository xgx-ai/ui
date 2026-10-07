import { Dynamic } from "@solidjs/web";
import { cva } from "class-variance-authority";
import { omit } from "solid-js";

import { cn } from "../../cn.ts";

const labelVariants = cva(
  "text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        label: "data-invalid:text-error-foreground",
        description: "font-normal text-muted-foreground",
        error: "text-error-foreground",
      },
    },
    defaultVariants: {
      variant: "label",
    },
  },
);
type LabelProps<_T> = {
  class?: string | undefined;
  required?: boolean;
  for?: string;
  children?: string;
};

export const FieldLabel = <T extends "label">(props: LabelProps<T>) => {
  const local = props;
  const others = omit(props, "class", "required", "children", "for");
  return (
    <Dynamic
      component={local.for !== undefined ? "label" : "div"}
      class={cn(labelVariants(), local.class)}
      for={local.for}
      {...others}
    >
      {local.children} {local.required && <span class="text-error-foreground">*</span>}
    </Dynamic>
  );
};
