import type { JSX } from "@solidjs/web";
import { splitProps } from "../utils/split-props";
import type { ParentProps } from "solid-js";

import { cn } from "../cn";

type HeadingProps = ParentProps<JSX.HTMLAttributes<HTMLHeadingElement>>;
type ParagraphProps = ParentProps<JSX.HTMLAttributes<HTMLParagraphElement>>;
type SpanProps = ParentProps<JSX.HTMLAttributes<HTMLSpanElement>>;
type DivProps = ParentProps<JSX.HTMLAttributes<HTMLDivElement>>;

const H1 = (props: HeadingProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <h1
      class={cn("xgx-text-page-title font-semibold tracking-tight text-foreground", local.class)}
      {...others}
    >
      {local.children}
    </h1>
  );
};

const H2 = (props: HeadingProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <h2
      class={cn("xgx-text-title font-semibold tracking-tight text-foreground", local.class)}
      {...others}
    >
      {local.children}
    </h2>
  );
};

const H3 = (props: HeadingProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <h3 class={cn("xgx-text-body-tight font-medium text-foreground", local.class)} {...others}>
      {local.children}
    </h3>
  );
};

const H4 = (props: HeadingProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <h4 class={cn("xgx-text-body-tight font-medium text-foreground", local.class)} {...others}>
      {local.children}
    </h4>
  );
};

const P = (props: ParagraphProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <p class={cn("xgx-text-body text-foreground", local.class)} {...others}>
      {local.children}
    </p>
  );
};

const Small = (props: SpanProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <span class={cn("xgx-text-caption text-muted-foreground", local.class)} {...others}>
      {local.children}
    </span>
  );
};

const Muted = (props: ParagraphProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <p class={cn("xgx-text-body text-muted-foreground", local.class)} {...others}>
      {local.children}
    </p>
  );
};

const Lead = (props: ParagraphProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <p class={cn("xgx-text-title text-muted-foreground", local.class)} {...others}>
      {local.children}
    </p>
  );
};

const Large = (props: DivProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("xgx-text-title font-semibold text-foreground", local.class)} {...others}>
      {local.children}
    </div>
  );
};

const Label = (props: SpanProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <span
      class={cn("xgx-text-caption uppercase tracking-wide text-muted-foreground", local.class)}
      {...others}
    >
      {local.children}
    </span>
  );
};

export const Typography = {
  H1,
  H2,
  H3,
  H4,
  P,
  Small,
  Muted,
  Lead,
  Large,
  Label,
};

/**
 * # Typography
 *
 * Text styling components for headings and paragraphs.
 *
 * @example
 * ```
 * <div class="space-y-4">
 *   <H1>Heading 1</H1>
 *   <H2>Heading 2</H2>
 *   <H3>Heading 3</H3>
 *   <H4>Heading 4</H4>
 *   <P>This is a paragraph with normal text styling.</P>
 *   <Lead>This is lead text, larger and muted.</Lead>
 *   <Large>This is large text.</Large>
 *   <Small>This is small text.</Small>
 *   <Muted>This is muted text.</Muted>
 *   <Label>THIS IS A LABEL</Label>
 * </div>
 * ```
 */
export { H1, H2, H3, H4, Label, Large, Lead, Muted, P, Small };
