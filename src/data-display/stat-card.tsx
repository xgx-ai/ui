import { type JSX, type ParentProps, splitProps } from "solid-js";
import { cn } from "../cn";
import { Card, CardContent } from "../layout/card";

export interface StatCardProps {
  class?: string;
  label: string;
  value: string | number;
}

/** Stat card for dashboards */
export function StatCard(props: StatCardProps): JSX.Element {
  const [local] = splitProps(props, ["class", "label", "value"]);
  return (
    <Card class={local.class}>
      <CardContent class="pt-6">
        <p class="text-sm text-muted-foreground">{local.label}</p>
        <p class="text-3xl font-bold">{local.value}</p>
      </CardContent>
    </Card>
  );
}

export interface StatCardGroupProps extends ParentProps {
  class?: string;
  cols?: "2" | "3" | "4";
}

const colClasses = {
  "2": "grid-cols-2",
  "3": "grid-cols-3",
  "4": "grid-cols-4",
};

/** Grid container for stat cards */
export function StatCardGroup(props: StatCardGroupProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "cols", "children"]);
  return (
    <div
      class={cn("grid gap-4", colClasses[local.cols ?? "3"], local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
}
