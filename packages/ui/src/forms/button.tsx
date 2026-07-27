/**
 * # Button
 *
 * Renders an action button with project variants and sizes.
 *
 * @example
 * ```tsx
 * <Button variant="outline" loading={saving()}>
 *   Save changes
 * </Button>
 * ```
 */
import type { JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { omit, Show } from "solid-js";
import { cn } from "../cn.ts";
import { Spinner } from "../feedback/spinner.tsx";
import type { PolymorphicProps } from "../utils/polymorphic";

const buttonVariants = cva(
  "cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-danger text-danger-foreground hover:bg-danger/90",
        outline:
          "border border-input bg-transparent text-foreground hover:bg-hover hover:text-hover-foreground",
        secondary:
          "border border-input bg-transparent text-foreground hover:bg-hover hover:text-hover-foreground",
        black: "bg-foreground text-background hover:bg-foreground/90",
        blackSecondary: "bg-foreground text-background hover:bg-foreground/90",
        gradient:
          "border border-input bg-gradient-to-r from-purple-700/90 to-pink-500 bg-clip-text text-transparent",
        ghost: "text-foreground hover:bg-hover hover:text-hover-foreground",
        text: "text-foreground hover:text-hover-foreground",
        link: "text-primary underline-offset-4",
        listItem: "text-muted-foreground hover:bg-hover hover:text-hover-foreground",
        card: "flex-col border-2 border-border-subtle bg-card text-card-foreground hover:border-border-strong hover:bg-hover hover:text-hover-foreground data-[selected]:border-selected data-[selected]:bg-selected data-[selected]:text-selected-foreground",
      },
      size: {
        default: "xgx-control-text-md h-10 px-4 py-2",
        sm: "xgx-control-text-sm h-8 px-3",
        lg: "xgx-control-text-md h-11 px-8",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonOwnProps = VariantProps<typeof buttonVariants> & {
  class?: string | undefined;
  children?: JSX.Element;
  loading?: boolean;
  disabled?: boolean;
};

type ButtonProps<T extends ValidComponent = "button"> = PolymorphicProps<T, ButtonOwnProps>;

const Button = <T extends ValidComponent = "button">(props: ButtonProps<T>) => {
  const local = props as ButtonProps;
  const others = omit(
    props as ButtonProps,
    "as",
    "variant",
    "size",
    "class",
    "loading",
    "children",
    "disabled",
    "onClick",
    "type",
  );

  const disabled = () => Boolean(local.disabled || local.loading);
  const content = () => (
    <>
      <Show when={local.loading}>
        <Spinner class="mr-2 size-4" />
      </Show>
      {local.children}
    </>
  );

  if (!local.as) {
    return (
      <button
        type={local.type ?? "button"}
        class={cn(buttonVariants({ variant: local.variant, size: local.size }), local.class)}
        disabled={disabled()}
        data-disabled={disabled() ? "" : undefined}
        aria-disabled={disabled() ? "true" : undefined}
        {...others}
        onClick={local.onClick}
      >
        {content()}
      </button>
    );
  }

  return (
    <Dynamic
      component={local.as}
      type={local.type}
      class={cn(buttonVariants({ variant: local.variant, size: local.size }), local.class)}
      disabled={disabled()}
      data-disabled={disabled() ? "" : undefined}
      aria-disabled={disabled() ? "true" : undefined}
      {...others}
      onClick={local.onClick}
    >
      {content()}
    </Dynamic>
  );
};

export type { ButtonProps };
export { Button, buttonVariants };
