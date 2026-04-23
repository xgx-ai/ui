import { cn } from "../cn";
import { Check } from "lucide-solid";
import type { ComponentProps } from "solid-js";
import { Show, splitProps } from "solid-js";

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
        "relative cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-all",
        local.selected
          ? "border-primary ring-1 ring-primary/30"
          : "border-gray-200 hover:border-gray-300",
        local.class,
      )}
      onClick={() => local.onSelect?.()}
      {...rest}
    >
      <Show when={local.showIndicator && local.selected}>
        <div class="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-white">
          <Check class="size-3" />
        </div>
      </Show>
      {local.children}
    </div>
  );
}
