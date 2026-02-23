import { cva, type VariantProps } from "class-variance-authority";
import type { Component, ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "../cn";

const cardVariants = cva(
  "rounded-xl border border-black/[0.06] bg-card text-card-foreground shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]",
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

export type CardProps = ComponentProps<"div"> &
  VariantProps<typeof cardVariants>;

const Card: Component<CardProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "padding"]);
  return (
    <div
      class={cn(cardVariants({ padding: local.padding }), local.class)}
      {...others}
    />
  );
};

const CardHeader: Component<ComponentProps<"div">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div class={cn("flex flex-col space-y-1.5 p-6", local.class)} {...others} />
  );
};

const CardTitle: Component<ComponentProps<"h3">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <h3
      class={cn(
        "text-lg font-semibold leading-none tracking-tight",
        local.class,
      )}
      {...others}
    />
  );
};

const CardDescription: Component<ComponentProps<"p">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <p class={cn("text-sm text-muted-foreground", local.class)} {...others} />
  );
};

const CardContent: Component<ComponentProps<"div">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("p-6 pt-0", local.class)} {...others} />;
};

const CardFooter: Component<ComponentProps<"div">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div class={cn("flex items-center p-6 pt-0", local.class)} {...others} />
  );
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
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
