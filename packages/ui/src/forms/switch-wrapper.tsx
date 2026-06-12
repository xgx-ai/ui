import { Switch, SwitchControl, SwitchHiddenInput, SwitchThumb } from "./switch";
import { Show } from "solid-js";
import { Label } from "./label";

interface SwitchWrapperProps {
  label?: string;
  value: boolean;
  layout?: "inline" | "stacked";
  onChange: (checked: boolean) => void;
  required?: boolean;
  description?: string;
  disabled?: boolean;
}

export default function SwitchWrapper(props: SwitchWrapperProps) {
  const layout = () => props.layout ?? "inline";
  const flexClass = () =>
    layout() === "stacked" ? "flex flex-col-reverse items-start gap-2 " : "flex items-center gap-2";

  return (
    <Switch
      class={`${flexClass()} text-xs ${props.disabled ? "opacity-60" : ""}`}
      required={props.required}
      disabled={props.disabled}
      onChange={(checked) => {
        props.onChange(checked);
      }}
      checked={props.value}
    >
      <SwitchControl>
        <SwitchThumb />
      </SwitchControl>
      <Show when={props.label}>
        <div class="flex flex-col gap-1">
          <Label required={props.required}>{props.label}</Label>
          <Show when={props.description}>
            <p class="text-[10px] text-muted-foreground">{props.description}</p>
          </Show>
        </div>
      </Show>
      <SwitchHiddenInput />
    </Switch>
  );
}
