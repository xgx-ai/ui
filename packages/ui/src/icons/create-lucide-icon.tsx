import type { ComponentProps, JSX } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import { For, omit } from "solid-js";

export type IconNode = readonly (readonly [
  keyof JSX.IntrinsicElements,
  Record<string, string | number>,
])[];

export type LucideIconProps = ComponentProps<"svg"> & {
  absoluteStrokeWidth?: boolean;
  color?: string;
  size?: number | string;
  strokeWidth?: number | string;
};

export type LucideIcon = (props: LucideIconProps) => JSX.Element;

type InternalIconProps = LucideIconProps & {
  iconNode: IconNode;
  name?: string;
};

function toKebabCase(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function hasA11yProp(props: Record<PropertyKey, unknown>) {
  for (const prop of Reflect.ownKeys(props)) {
    if (
      typeof prop === "string" &&
      (prop.startsWith("aria-") || prop === "role" || prop === "title")
    ) {
      return true;
    }
  }
  return false;
}

function collectClasses(value: unknown, classes: string[]) {
  if (!value) return;
  if (typeof value === "string" || typeof value === "number") {
    classes.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectClasses(item, classes);
    return;
  }
  if (typeof value === "object") {
    for (const [className, enabled] of Object.entries(value)) {
      if (enabled) classes.push(className);
    }
  }
}

function mergeClasses(...values: unknown[]) {
  const classes: string[] = [];
  for (const value of values) collectClasses(value, classes);
  return classes
    .filter(
      (className, index, array) => className.trim() !== "" && array.indexOf(className) === index,
    )
    .join(" ")
    .trim();
}

export function Icon(props: InternalIconProps) {
  const local = props;
  const rest = omit(
    props,
    "absoluteStrokeWidth",
    "children",
    "class",
    "color",
    "iconNode",
    "name",
    "size",
    "strokeWidth",
  );

  const size = () => local.size ?? 24;
  const strokeWidth = () =>
    local.absoluteStrokeWidth
      ? (Number(local.strokeWidth ?? 2) * 24) / Number(size())
      : (local.strokeWidth ?? 2);
  const className = () =>
    mergeClasses(
      "lucide",
      "lucide-icon",
      local.name ? `lucide-${toKebabCase(local.name)}` : undefined,
      local.class,
    );

  return (
    <svg
      fill="none"
      height={size()}
      stroke={local.color ?? "currentColor"}
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width={strokeWidth()}
      viewBox="0 0 24 24"
      width={size()}
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
      aria-hidden={!local.children && !hasA11yProp(rest) ? "true" : undefined}
      class={className()}
    >
      <For each={local.iconNode}>
        {([elementName, attrs]) => <Dynamic component={elementName} {...attrs} />}
      </For>
      {local.children}
    </svg>
  );
}

export function createLucideIcon(name: string, iconNode: IconNode): LucideIcon {
  return (props) => <Icon {...props} iconNode={iconNode} name={name} />;
}
