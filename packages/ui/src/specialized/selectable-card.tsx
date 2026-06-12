import type { ComponentProps } from "@solidjs/web";
import { splitProps } from "../utils/split-props";
import { cn } from "../cn";
import { Check } from "../icons.index";

import { Show } from "solid-js";

interface SelectableCardProps extends Omit<ComponentProps<"div">, "onSelect"> {
  selected?: boolean;
  showIndicator?: boolean;
  onSelect?: () => void;
}

export function SelectableCard(props: SelectableCardProps) {
  const [local, rest] = splitProps(props, [
    "selected",
    "showIndicator",
    "onSelect",
    "class",
    "children",
  ]);

  return (
    <div
      class={cn(
        "relative cursor-pointer rounded-lg border bg-card p-4 text-card-foreground shadow-elevation-low transition-all",
        local.selected
          ? "border-selected ring-1 ring-selected/30"
          : "border-border-subtle hover:border-border-strong hover:bg-hover hover:text-hover-foreground",
        local.class,
      )}
      onClick={() => local.onSelect?.()}
      {...rest}
    >
      <Show when={local.showIndicator && local.selected}>
        <div class="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-selected text-selected-foreground">
          <Check class="size-3" />
        </div>
      </Show>
      {local.children}
    </div>
  );
}
