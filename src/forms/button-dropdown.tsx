import { ChevronDown } from "lucide-solid";
import type { JSX, ParentProps } from "solid-js";
import { Show } from "solid-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../navigation/dropdown-menu.tsx";
import { Button } from "./button.tsx";

interface ButtonDropdownProps extends ParentProps {
  label: string;
  onClick: () => void;
  varient?: "outline" | "default";
  disabled?: boolean;
  loading?: boolean;
  icon?: JSX.Element;
}

export function ButtonDropdown(props: ButtonDropdownProps) {
  return (
    <div class="flex">
      <Button
        size="sm"
        class="w-32 text-xs rounded-r-none border-r"
        onClick={props.onClick}
        variant={props.varient}
        disabled={props.disabled}
        loading={props.loading}
      >
        <Show when={props.icon}>{props.icon}</Show>
        {props.label}
      </Button>
      <DropdownMenu placement="bottom-end">
        <DropdownMenuTrigger
          class="flex items-center justify-center"
          disabled={props.disabled}
        >
          <Button
            size="sm"
            class="text-xs rounded-l-none"
            variant={props.varient}
            disabled={props.disabled}
          >
            <ChevronDown size={18} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>{props.children}</DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
