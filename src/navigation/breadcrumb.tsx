import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import type { Component } from "solid-js";
import { Show } from "solid-js";
import { ChevronRight, MoreHorizontal } from "../icons.index";
import { cn } from "../cn";
import { splitProps } from "../utils/split-props";

const Breadcrumb: Component<ComponentProps<"nav">> = (props) => (
  <nav aria-label="Breadcrumb" {...props} />
);

const BreadcrumbList: Component<ComponentProps<"ol">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <ol
      class={cn(
        "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
        local.class,
      )}
      {...others}
    />
  );
};

const BreadcrumbItem: Component<ComponentProps<"li">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return <li class={cn("inline-flex items-center gap-1.5", local.class)} {...others} />;
};

type BreadcrumbLinkProps<T extends ValidComponent = "a"> = ComponentProps<"a"> & {
  as?: T;
  current?: boolean;
};

const BreadcrumbLink = <T extends ValidComponent = "a">(props: BreadcrumbLinkProps<T>) => {
  const [local, others] = splitProps(props, ["as", "class", "current"]);
  return (
    <Dynamic
      component={local.as ?? "a"}
      aria-current={local.current ? "page" : undefined}
      data-current={local.current ? "" : undefined}
      class={cn(
        "transition-colors hover:text-foreground data-[current]:font-normal data-[current]:text-foreground",
        local.class,
      )}
      {...others}
    />
  );
};

type BreadcrumbSeparatorProps<T extends ValidComponent = "span"> = ComponentProps<"span"> & {
  as?: T;
  children?: JSX.Element;
};

const BreadcrumbSeparator = <T extends ValidComponent = "span">(
  props: BreadcrumbSeparatorProps<T>,
) => {
  const [local, others] = splitProps(props, ["as", "class", "children"]);
  return (
    <Dynamic
      component={local.as ?? "span"}
      role="presentation"
      aria-hidden="true"
      class={cn("[&>svg]:size-3.5", local.class)}
      {...others}
    >
      <Show when={local.children} fallback={<ChevronRight aria-hidden="true" />}>
        {local.children}
      </Show>
    </Dynamic>
  );
};

const BreadcrumbEllipsis: Component<ComponentProps<"span">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span class={cn("flex size-9 items-center justify-center", local.class)} {...others}>
      <MoreHorizontal aria-hidden="true" class="size-4" />
      <span class="sr-only">More</span>
    </span>
  );
};

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
};
export type { BreadcrumbLinkProps, BreadcrumbSeparatorProps };
