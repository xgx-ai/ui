import type { ComponentProps } from "@solidjs/web";
import { cn } from "../cn";
import { splitProps } from "../utils/split-props";

type SkeletonProps = ComponentProps<"div"> & {
  animate?: boolean;
  height?: number | string;
  radius?: number | string;
  width?: number | string;
};

const toCssSize = (value: number | string | undefined) =>
  typeof value === "number" ? `${value}px` : value;

const Skeleton = (props: SkeletonProps) => {
  const [local, others] = splitProps(props, [
    "class",
    "animate",
    "height",
    "radius",
    "style",
    "width",
  ]);

  return (
    <div
      aria-hidden="true"
      data-animate={local.animate ? "true" : undefined}
      class={cn("bg-surface-muted data-[animate='true']:animate-pulse", local.class)}
      style={{
        height: toCssSize(local.height),
        "border-radius": toCssSize(local.radius),
        width: toCssSize(local.width),
        ...(typeof local.style === "object" ? local.style : undefined),
      }}
      {...others}
    />
  );
};

export { Skeleton };
export type { SkeletonProps };
