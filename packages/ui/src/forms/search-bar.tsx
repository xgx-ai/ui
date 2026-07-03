import type { ComponentProps, JSX } from "@solidjs/web";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { Search } from "../icons.index";
import { cn } from "../cn.ts";
import { splitProps } from "../utils/split-props";

const searchBarVariants = cva(
  "xgx-control-text-md flex items-center rounded-full border border-border-subtle bg-surface-muted ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
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

type SearchBarProps = Omit<ComponentProps<"div">, "onChange"> &
  VariantProps<typeof searchBarVariants> & {
    icon?: JSX.Element;
    inputClass?: string;
    onChange?: (value: string) => void;
    onInput?: JSX.EventHandler<HTMLInputElement, InputEvent>;
    placeholder?: string;
    value?: string;
  };

const SearchBar = (props: SearchBarProps) => {
  const [local, others] = splitProps(props, [
    "class",
    "icon",
    "inputClass",
    "onChange",
    "onInput",
    "placeholder",
    "size",
    "value",
  ]);
  const onInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    local.onChange?.(event.currentTarget.value);
    const handler = local.onInput as JSX.EventHandler<HTMLInputElement, InputEvent> | undefined;
    handler?.(event);
  };

  return (
    <div class={cn("flex flex-col", local.class)} {...others}>
      <div class={cn(searchBarVariants({ size: local.size }))}>
        <span class="flex items-center justify-center pl-3 text-muted-foreground">
          {local.icon ?? <Search class="size-4" />}
        </span>
        <input
          type="search"
          value={local.value}
          placeholder={local.placeholder ?? "Search..."}
          class={cn(
            "w-full bg-transparent px-2 py-2 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
            local.inputClass,
          )}
          onInput={onInput}
        />
      </div>
    </div>
  );
};

export { SearchBar, searchBarVariants };
export type { SearchBarProps };
