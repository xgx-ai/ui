import type { ComponentProps } from "@solidjs/web";
import { cva, type VariantProps } from "class-variance-authority";
import type { Component } from "solid-js";
import { omit } from "solid-js";

import { cn } from "../cn";

const cardVariants = cva(
  "rounded-lg border border-border-subtle bg-card text-card-foreground shadow-elevation-low",
  {
    variants: {
      padding: {
        none: "",
        sm: "p-2",
        md: "p-4",
        lg: "p-6",
      },
    },
    defaultVariants: {
      padding: "none",
    },
  },
);

export type CardProps = ComponentProps<"div"> & VariantProps<typeof cardVariants>;

const Card: Component<CardProps> = (props) => {
  const local = props;
  const others = omit(props, "class", "padding");
  return <div class={cn(cardVariants({ padding: local.padding }), local.class)} {...others} />;
};

const CardHeader: Component<ComponentProps<"div">> = (props) => {
  const local = props;
  const others = omit(props, "class");
  return <div class={cn("flex flex-col space-y-1 p-4", local.class)} {...others} />;
};

const CardTitle: Component<ComponentProps<"h3">> = (props) => {
  const local = props;
  const others = omit(props, "class");
  return <h3 class={cn("xgx-text-title font-semibold tracking-tight", local.class)} {...others} />;
};

const CardDescription: Component<ComponentProps<"p">> = (props) => {
  const local = props;
  const others = omit(props, "class");
  return <p class={cn("xgx-text-body text-muted-foreground", local.class)} {...others} />;
};

const CardContent: Component<ComponentProps<"div">> = (props) => {
  const local = props;
  const others = omit(props, "class");
  return <div class={cn("p-4 pt-0", local.class)} {...others} />;
};

const CardFooter: Component<ComponentProps<"div">> = (props) => {
  const local = props;
  const others = omit(props, "class");
  return <div class={cn("flex items-center p-4 pt-0", local.class)} {...others} />;
};

/**
 * # Card
 *
 * A container component for grouping related content.
 *
 * @example
 * ```
 * <Card class="w-[350px]">
 *   <CardHeader>
 *     <CardTitle>Card Title</CardTitle>
 *     <CardDescription>Card description goes here.</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     <p>Card content with any elements you need.</p>
 *   </CardContent>
 *   <CardFooter>
 *     <p class="text-sm text-muted-foreground">Card footer</p>
 *   </CardFooter>
 * </Card>
 * ```
 */
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
