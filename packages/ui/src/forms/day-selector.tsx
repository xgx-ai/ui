import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const days = [
  { value: "1", label: "M" },
  { value: "2", label: "T" },
  { value: "3", label: "W" },
  { value: "4", label: "T" },
  { value: "5", label: "F" },
  { value: "6", label: "S" },
  { value: "0", label: "S" },
];

interface Props {
  selected: string[];
  setSelected: (value: string[]) => void;
  class?: string;
}

export default function DaySelector(props: Props) {
  return (
    <ToggleGroup multiple value={props.selected} onChange={props.setSelected} class={props.class}>
      {days.map((day) => (
        <ToggleGroupItem value={day.value}>{day.label}</ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
