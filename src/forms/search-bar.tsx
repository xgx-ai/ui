import type { PolymorphicProps } from "@kobalte/core";
import * as TextFieldPrimitive from "@kobalte/core/text-field";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { Search } from "lucide-solid";
import type { JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "../cn.ts";

const searchBarVariants = cva(
  "flex items-center rounded-full border border-black/10 bg-slate-50/50 text-xs ring-offset-background focus-within:ring-1 focus-within:ring-ring/30 focus-within:ring-offset-1",
  {
    variants: {
      size: {
        default: "h-10",
        sm: "h-8",
        lg: "h-11",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  },
);

type SearchBarProps<T extends ValidComponent = "div"> =
  TextFieldPrimitive.TextFieldRootProps<T> &
    VariantProps<typeof searchBarVariants> & {
      class?: string;
      inputClass?: string;
      placeholder?: string;
      value?: string;
      onInput?: JSX.EventHandler<HTMLInputElement, InputEvent>;
      onChange?: (value: string) => void;
      icon?: JSX.Element;
    };

const SearchBar = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SearchBarProps<T>>,
) => {
  const [local, others] = splitProps(props as SearchBarProps, [
    "class",
    "inputClass",
    "size",
    "placeholder",
    "value",
    "onInput",
    "onChange",
    "icon",
  ]);

  return (
    <TextFieldPrimitive.Root
      class={cn("flex flex-col", local.class)}
      value={local.value}
      onChange={local.onChange}
      {...others}
    >
      <div class={cn(searchBarVariants({ size: local.size }))}>
        <span class="flex items-center justify-center pl-3 text-muted-foreground">
          {local.icon ?? <Search class="size-4" />}
        </span>
        <TextFieldPrimitive.Input
          type="search"
          placeholder={local.placeholder ?? "Search..."}
          class={cn(
            "w-full bg-transparent px-2 py-2 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
            local.inputClass,
          )}
          onInput={local.onInput}
        />
      </div>
    </TextFieldPrimitive.Root>
  );
};

export { SearchBar, searchBarVariants };
export type { SearchBarProps };
