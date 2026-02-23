import * as ButtonPrimitive from "@kobalte/core/button";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { JSX, ValidComponent } from "solid-js";
import { Show, splitProps } from "solid-js";

import { cn } from "../cn.ts";
import { Spinner } from "../feedback/spinner.tsx";

const buttonVariants = cva(
  "cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-destructive text-background hover:bg-destructive/90",
        outline:
          "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-muted text-muted-foreground hover:bg-muted/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        text: "hover:text-accent-foreground",
        link: "text-primary underline-offset-4 ",
        gradient:
          "bg-gradient-to-r from-purple-700/90 to-pink-500 bg-clip-text text-transparent border border-1 ",
        listItem:
          "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
        black: "bg-foreground text-background hover:bg-foreground/90",
        blackSecondary: "bg-foreground text-background hover:bg-foreground/90",
        card: "flex-col border-2 border-border bg-background hover:border-primary/50 data-[selected]:border-primary data-[selected]:bg-primary/5",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-8",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

type ButtonProps<T extends ValidComponent = "button"> =
  ButtonPrimitive.ButtonRootProps<T> &
    VariantProps<typeof buttonVariants> & {
      class?: string | undefined;
      children?: JSX.Element;
      loading?: boolean;
    };

const Button = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, ButtonProps<T>>,
) => {
  const [local, others] = splitProps(props as ButtonProps, [
    "variant",
    "size",
    "class",
    "loading",
    "children",
    "disabled",
  ]);
  return (
    <ButtonPrimitive.Root
      class={cn(
        buttonVariants({ variant: local.variant, size: local.size }),
        local.class,
      )}
      disabled={local.disabled || local.loading}
      {...others}
    >
      <Show when={local.loading}>
        <Spinner class="w-4 h-4 mr-2" />
      </Show>
      {local.children}
    </ButtonPrimitive.Root>
  );
};
/**
 * # Button
 *
 * A clickable button with multiple variants and sizes.
 *
 * @example
 * ```
 * <div class="space-y-4">
 *   <div class="flex flex-wrap gap-2">
 *     <Button variant="default">Default</Button>
 *     <Button variant="secondary">Secondary</Button>
 *     <Button variant="outline">Outline</Button>
 *     <Button variant="ghost">Ghost</Button>
 *     <Button variant="destructive">Destructive</Button>
 *     <Button variant="black">Black</Button>
 *   </div>
 *   <div class="flex flex-wrap gap-2">
 *     <Button size="sm">Small</Button>
 *     <Button size="default">Default</Button>
 *     <Button size="lg">Large</Button>
 *   </div>
 *   <div class="flex flex-wrap gap-2">
 *     <Button loading>Loading</Button>
 *     <Button disabled>Disabled</Button>
 *   </div>
 * </div>
 * ```
 */
export { Button, buttonVariants };
export type { ButtonProps };
