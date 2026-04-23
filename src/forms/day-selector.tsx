import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

interface Props {
  selected: string[];
  setSelected: (value: string[]) => void;
  class?: string;
}

export default function DaySelector(props: Props) {
  return (
    <ToggleGroup
      multiple
      value={props.selected}
      onChange={props.setSelected}
      class={props.class}
    >
      <ToggleGroupItem value="1" class=" data-[pressed]:bg-primary/10! ">
        M
      </ToggleGroupItem>
      <ToggleGroupItem value="2" class=" data-[pressed]:bg-primary/10! ">
        T
      </ToggleGroupItem>
      <ToggleGroupItem value="3" class=" data-[pressed]:bg-primary/10! ">
        W
      </ToggleGroupItem>
      <ToggleGroupItem value="4" class=" data-[pressed]:bg-primary/10! ">
        T
      </ToggleGroupItem>
      <ToggleGroupItem value="5" class=" data-[pressed]:bg-primary/10! ">
        F
      </ToggleGroupItem>
      <ToggleGroupItem
        value="6"
        class="text-destructive data-[pressed]:text-destructive hover:text-destructive/50 data-[pressed]:bg-primary/10!"
      >
        S
      </ToggleGroupItem>
      <ToggleGroupItem
        value="0"
        class="text-destructive data-[pressed]:text-destructive hover:text-destructive/50 data-[pressed]:bg-primary/10!"
      >
        S
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
