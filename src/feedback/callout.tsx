import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { Component, ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../cn";

const calloutVariants = cva("rounded-md p-2 pl-4 text-sm", {
  variants: {
    variant: {
      default: "border-info-foreground bg-info text-info-foreground",
      success: "border-success-foreground bg-success text-success-foreground",
      warning: "border-warning-foreground bg-warning text-warning-foreground",
      error: "border-error-foreground bg-error text-error-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type CalloutProps = ComponentProps<"div"> &
  VariantProps<typeof calloutVariants>;

const Callout: Component<CalloutProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "variant"]);
  return (
    <div
      class={cn(calloutVariants({ variant: local.variant }), local.class)}
      {...others}
    />
  );
};

const CalloutTitle: Component<ComponentProps<"h3">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return <h3 class={cn("font-semibold text-sm", local.class)} {...others} />;
};

const CalloutContent: Component<ComponentProps<"div">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("mt-2 text-xs", local.class)} {...others} />;
};

/**
 * # Callout
 *
 * Highlighted information blocks with variants.
 *
 * @example
 * ```
 * <div class="space-y-4 max-w-md">
 *   <Callout>
 *     <CalloutTitle>Information</CalloutTitle>
 *     <CalloutContent>This is a default informational callout.</CalloutContent>
 *   </Callout>
 *   <Callout variant="success">
 *     <CalloutTitle>Success</CalloutTitle>
 *     <CalloutContent>Your changes have been saved.</CalloutContent>
 *   </Callout>
 *   <Callout variant="warning">
 *     <CalloutTitle>Warning</CalloutTitle>
 *     <CalloutContent>Please review before proceeding.</CalloutContent>
 *   </Callout>
 *   <Callout variant="error">
 *     <CalloutTitle>Error</CalloutTitle>
 *     <CalloutContent>Something went wrong.</CalloutContent>
 *   </Callout>
 * </div>
 * ```
 */
export { Callout, CalloutContent, CalloutTitle };
