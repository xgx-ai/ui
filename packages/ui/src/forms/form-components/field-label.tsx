import { splitProps } from "../../utils/split-props";
import { cva } from "class-variance-authority";

import { cn } from "../../cn.ts";

const labelVariants = cva(
  "text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        label: "data-invalid:text-error text-xs",
        description: "font-normal text-muted-foreground text-xs",
        error: "text-xs text-error text-xs",
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
  children?: string;
};

export const FieldLabel = <T extends "label">(props: LabelProps<T>) => {
  const [local, others] = splitProps(props, ["class", "required", "children"]);
  return (
    <div class={cn(labelVariants(), local.class)} {...others}>
      {local.children} {local.required && <span class="text-error">*</span>}
    </div>
  );
};
