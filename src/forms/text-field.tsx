import type { PolymorphicProps } from "@kobalte/core";
import * as TextFieldPrimitive from "@kobalte/core/text-field";
import { cva } from "class-variance-authority";
import type { ValidComponent } from "solid-js";
import { mergeProps, Suspense, splitProps } from "solid-js";

import { cn } from "../cn.ts";
import { Skeleton } from "../feedback/skeleton.tsx";

type TextFieldRootProps<T extends ValidComponent = "div"> =
  TextFieldPrimitive.TextFieldRootProps<T> & {
    class?: string | undefined;
  };

const TextField = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, TextFieldRootProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldRootProps, ["class"]);
  return (
    <TextFieldPrimitive.Root
      class={cn("flex flex-col ", local.class)}
      {...others}
    />
  );
};

export type TextFieldInputProps<T extends ValidComponent = "input"> =
  TextFieldPrimitive.TextFieldInputProps<T> & {
    class?: string | undefined;
    readOnly?: boolean;
    type?:
      | "button"
      | "checkbox"
      | "color"
      | "date"
      | "datetime-local"
      | "email"
      | "file"
      | "hidden"
      | "image"
      | "month"
      | "number"
      | "password"
      | "radio"
      | "range"
      | "reset"
      | "search"
      | "submit"
      | "tel"
      | "text"
      | "time"
      | "url"
      | "week";
  };

const TextFieldInput = <T extends ValidComponent = "input">(
  rawProps: PolymorphicProps<T, TextFieldInputProps<T>>,
) => {
  const props = mergeProps<TextFieldInputProps<T>[]>(
    { type: "text" },
    rawProps,
  );
  const [local, others] = splitProps(props as TextFieldInputProps, [
    "type",
    "class",
    "readOnly",
  ]);

  return (
    <Suspense fallback={<Skeleton radius={4} height={40} />}>
      <TextFieldPrimitive.Input
        type={local.type}
        readOnly={local.readOnly}
        class={cn(
          "read-only:bg-muted/30 cursor-text flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ring-inset",
          local.readOnly &&
            "bg-muted text-muted-foreground opacity-100 focus-visible:ring-0",
          local.class,
        )}
        {...others}
      />
    </Suspense>
  );
};

type TextFieldTextAreaProps<T extends ValidComponent = "textarea"> =
  TextFieldPrimitive.TextFieldTextAreaProps<T> & {
    class?: string | undefined;
    readOnly?: boolean;
  };

const TextFieldTextArea = <T extends ValidComponent = "textarea">(
  props: PolymorphicProps<T, TextFieldTextAreaProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldTextAreaProps, [
    "class",
    "readOnly",
  ]);
  return (
    <TextFieldPrimitive.TextArea
      class={cn(
        "flex min-h-[120px] read-only:bg-muted/30 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        local.readOnly &&
          "bg-muted text-muted-foreground opacity-100 focus-visible:ring-0",
        local.class,
      )}
      {...others}
    />
  );
};

const labelVariants = cva(
  "text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        label: "data-invalid:text-destructive",
        description: "font-normal text-muted-foreground",
        error: "text-xs text-destructive",
      },
    },
    defaultVariants: {
      variant: "label",
    },
  },
);

type TextFieldLabelProps<T extends ValidComponent = "label"> =
  TextFieldPrimitive.TextFieldLabelProps<T> & { class?: string | undefined };

const TextFieldLabel = <T extends ValidComponent = "label">(
  props: PolymorphicProps<T, TextFieldLabelProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldLabelProps, ["class"]);
  return (
    <TextFieldPrimitive.Label
      class={cn(labelVariants(), local.class)}
      {...others}
    />
  );
};

type TextFieldDescriptionProps<T extends ValidComponent = "div"> =
  TextFieldPrimitive.TextFieldDescriptionProps<T> & {
    class?: string | undefined;
  };

const TextFieldDescription = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, TextFieldDescriptionProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldDescriptionProps, [
    "class",
  ]);
  return (
    <TextFieldPrimitive.Description
      class={cn(labelVariants({ variant: "description" }), local.class)}
      {...others}
    />
  );
};

type TextFieldErrorMessageProps<T extends ValidComponent = "div"> =
  TextFieldPrimitive.TextFieldErrorMessageProps<T> & {
    class?: string | undefined;
  };

const TextFieldErrorMessage = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, TextFieldErrorMessageProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldErrorMessageProps, [
    "class",
  ]);
  return (
    <TextFieldPrimitive.ErrorMessage
      class={cn(labelVariants({ variant: "error" }), local.class)}
      {...others}
    />
  );
};

/**
 * # TextField
 *
 * Text input with label, description, and error states.
 *
 * @example
 * ```
 * <div class="space-y-4 max-w-sm">
 *   <TextField>
 *     <TextFieldLabel>Username</TextFieldLabel>
 *     <TextFieldInput placeholder="Enter username" />
 *   </TextField>
 *   <TextField>
 *     <TextFieldLabel>Email</TextFieldLabel>
 *     <TextFieldInput type="email" placeholder="you@example.com" />
 *     <TextFieldDescription>We'll never share your email.</TextFieldDescription>
 *   </TextField>
 *   <TextField validationState="invalid">
 *     <TextFieldLabel>Password</TextFieldLabel>
 *     <TextFieldInput type="password" />
 *     <TextFieldErrorMessage>Password is required</TextFieldErrorMessage>
 *   </TextField>
 *   <TextField>
 *     <TextFieldLabel>Bio</TextFieldLabel>
 *     <TextFieldTextArea placeholder="Tell us about yourself" />
 *   </TextField>
 * </div>
 * ```
 */
export {
  TextField,
  TextFieldDescription,
  TextFieldErrorMessage,
  TextFieldInput,
  TextFieldLabel,
  TextFieldTextArea,
};
