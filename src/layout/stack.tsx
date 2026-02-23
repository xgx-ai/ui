import { type JSX, type ParentProps, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "../cn";

/** Common spacing values */
type SpacingValue =
  | "0"
  | "0.5"
  | "1"
  | "1.5"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "8";

const marginTopClasses: Record<SpacingValue, string> = {
  "0": "mt-0",
  "0.5": "mt-0.5",
  "1": "mt-1",
  "1.5": "mt-1.5",
  "2": "mt-2",
  "3": "mt-3",
  "4": "mt-4",
  "5": "mt-5",
  "6": "mt-6",
  "8": "mt-8",
};

const marginBottomClasses: Record<SpacingValue, string> = {
  "0": "mb-0",
  "0.5": "mb-0.5",
  "1": "mb-1",
  "1.5": "mb-1.5",
  "2": "mb-2",
  "3": "mb-3",
  "4": "mb-4",
  "5": "mb-5",
  "6": "mb-6",
  "8": "mb-8",
};

const paddingYClasses: Record<SpacingValue, string> = {
  "0": "py-0",
  "0.5": "py-0.5",
  "1": "py-1",
  "1.5": "py-1.5",
  "2": "py-2",
  "3": "py-3",
  "4": "py-4",
  "5": "py-5",
  "6": "py-6",
  "8": "py-8",
};

export interface StackProps extends ParentProps {
  /** classList for conditional classes */
  classList?: Record<string, boolean>;
  class?: string;
  /** HTML id */
  id?: string;
  /** Gap size */
  gap?: SpacingValue;
  /** Alignment */
  align?: "start" | "center" | "end" | "stretch";
  /** Justification */
  justify?: "start" | "center" | "end" | "between" | "around";
  /** Margin top */
  mt?: SpacingValue;
  /** Margin bottom */
  mb?: SpacingValue;
  /** Padding Y */
  py?: SpacingValue;
  /** Show top border */
  borderTop?: boolean;
  /** Polymorphic element type */
  as?: "div" | "form" | "ul" | "ol" | "nav" | "section" | "article";
  /** Form submit handler (when as="form") */
  onSubmit?: (e: SubmitEvent) => void;
}

const gapClasses: Record<SpacingValue, string> = {
  "0": "gap-0",
  "0.5": "gap-0.5",
  "1": "gap-1",
  "1.5": "gap-1.5",
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "5": "gap-5",
  "6": "gap-6",
  "8": "gap-8",
};

const stackAlignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const stackJustifyClasses = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

/** Vertical stack with gap */
export function Stack(props: StackProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "classList",
    "id",
    "gap",
    "align",
    "justify",
    "mt",
    "mb",
    "py",
    "borderTop",
    "as",
    "onSubmit",
    "children",
  ]);
  return (
    <Dynamic
      component={local.as ?? "div"}
      id={local.id}
      class={cn(
        "flex flex-col",
        gapClasses[local.gap ?? "4"],
        local.align && stackAlignClasses[local.align],
        local.justify && stackJustifyClasses[local.justify],
        local.mt && marginTopClasses[local.mt],
        local.mb && marginBottomClasses[local.mb],
        local.py && paddingYClasses[local.py],
        local.borderTop && "border-t",
        local.class,
      )}
      classList={local.classList}
      onSubmit={local.onSubmit}
      {...rest}
    >
      {local.children}
    </Dynamic>
  );
}

export interface FlexProps extends ParentProps {
  class?: string;
  /** Inline styles */
  style?: JSX.CSSProperties;
  /** HTML id */
  id?: string;
  /** ARIA role */
  role?: JSX.AriaAttributes["role"];
  /** ARIA modal */
  "aria-modal"?: JSX.AriaAttributes["aria-modal"];
  /** Gap size */
  gap?: SpacingValue;
  /** Alignment */
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  /** Justification */
  justify?: "start" | "center" | "end" | "between" | "around";
  /** Wrap */
  wrap?: "wrap" | "nowrap" | "wrap-reverse";
  /** Polymorphic element type */
  as?: "div" | "form" | "nav" | "section" | "article" | "span" | "label";
  /** Form submit handler (when as="form") */
  onSubmit?: (e: SubmitEvent) => void;
  /** Event handlers */
  onPointerDown?: (e: PointerEvent) => void;
  onClick?: (e: MouseEvent) => void;
  onMouseDown?: (e: MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  /** Ref */
  ref?: (el: HTMLElement) => void;
}

const alignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const justifyClasses = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

const wrapClasses = {
  wrap: "flex-wrap",
  nowrap: "flex-nowrap",
  "wrap-reverse": "flex-wrap-reverse",
};

/** Horizontal flex container */
export function Flex(props: FlexProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "style",
    "id",
    "role",
    "gap",
    "align",
    "justify",
    "wrap",
    "as",
    "onSubmit",
    "onPointerDown",
    "onClick",
    "onMouseDown",
    "onMouseEnter",
    "onMouseLeave",
    "ref",
    "children",
  ]);
  return (
    <Dynamic
      component={local.as ?? "div"}
      id={local.id}
      role={local.role as JSX.HTMLAttributes<HTMLDivElement>["role"]}
      class={cn(
        "flex",
        gapClasses[local.gap ?? "0"],
        alignClasses[local.align ?? "stretch"],
        justifyClasses[local.justify ?? "start"],
        local.wrap && wrapClasses[local.wrap],
        local.class,
      )}
      style={local.style}
      onSubmit={local.onSubmit}
      onPointerDown={local.onPointerDown}
      onClick={local.onClick}
      onMouseDown={local.onMouseDown}
      onMouseEnter={local.onMouseEnter}
      onMouseLeave={local.onMouseLeave}
      ref={local.ref}
      {...rest}
    >
      {local.children}
    </Dynamic>
  );
}

type ColValue =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12";

export interface GridProps extends ParentProps {
  class?: string;
  /** Inline styles */
  style?: JSX.CSSProperties;
  /** Gap size */
  gap?: "0" | "1" | "2" | "3" | "4" | "6" | "8";
  /** Number of columns */
  cols?: ColValue;
  /** Number of columns at lg breakpoint */
  lgCols?: ColValue;
  /** Number of columns at md breakpoint */
  mdCols?: ColValue;
  /** Number of columns at sm breakpoint */
  smCols?: ColValue;
  /** Polymorphic element type */
  as?: "div" | "ul" | "ol" | "nav" | "section";
  /** Event handlers */
  onClick?: (e: MouseEvent) => void;
  onDblClick?: (e: MouseEvent) => void;
}

const colClasses: Record<ColValue, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-2",
  "3": "grid-cols-3",
  "4": "grid-cols-4",
  "5": "grid-cols-5",
  "6": "grid-cols-6",
  "7": "grid-cols-7",
  "8": "grid-cols-8",
  "9": "grid-cols-9",
  "10": "grid-cols-10",
  "11": "grid-cols-11",
  "12": "grid-cols-12",
};

const lgColClasses: Record<ColValue, string> = {
  "1": "lg:grid-cols-1",
  "2": "lg:grid-cols-2",
  "3": "lg:grid-cols-3",
  "4": "lg:grid-cols-4",
  "5": "lg:grid-cols-5",
  "6": "lg:grid-cols-6",
  "7": "lg:grid-cols-7",
  "8": "lg:grid-cols-8",
  "9": "lg:grid-cols-9",
  "10": "lg:grid-cols-10",
  "11": "lg:grid-cols-11",
  "12": "lg:grid-cols-12",
};

const mdColClasses: Record<ColValue, string> = {
  "1": "md:grid-cols-1",
  "2": "md:grid-cols-2",
  "3": "md:grid-cols-3",
  "4": "md:grid-cols-4",
  "5": "md:grid-cols-5",
  "6": "md:grid-cols-6",
  "7": "md:grid-cols-7",
  "8": "md:grid-cols-8",
  "9": "md:grid-cols-9",
  "10": "md:grid-cols-10",
  "11": "md:grid-cols-11",
  "12": "md:grid-cols-12",
};

const smColClasses: Record<ColValue, string> = {
  "1": "sm:grid-cols-1",
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-3",
  "4": "sm:grid-cols-4",
  "5": "sm:grid-cols-5",
  "6": "sm:grid-cols-6",
  "7": "sm:grid-cols-7",
  "8": "sm:grid-cols-8",
  "9": "sm:grid-cols-9",
  "10": "sm:grid-cols-10",
  "11": "sm:grid-cols-11",
  "12": "sm:grid-cols-12",
};

/** Grid layout */
export function Grid(props: GridProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "style",
    "gap",
    "cols",
    "lgCols",
    "mdCols",
    "smCols",
    "as",
    "onClick",
    "onDblClick",
    "children",
  ]);
  return (
    <Dynamic
      component={local.as ?? "div"}
      class={cn(
        "grid",
        gapClasses[local.gap ?? "4"],
        colClasses[local.cols ?? "1"],
        local.lgCols && lgColClasses[local.lgCols],
        local.mdCols && mdColClasses[local.mdCols],
        local.smCols && smColClasses[local.smCols],
        local.class,
      )}
      style={local.style}
      onClick={local.onClick}
      onDblClick={local.onDblClick}
      {...rest}
    >
      {local.children}
    </Dynamic>
  );
}

export interface CenterProps extends ParentProps {
  class?: string;
  /** Inline styles */
  style?: JSX.CSSProperties;
  /** Width */
  w?: "full" | "auto";
  /** Min height */
  minH?: "screen" | "full";
  /** Padding */
  p?: SpacingValue;
  /** Background */
  bg?: "background" | "muted" | "card";
}

const widthClasses = {
  full: "w-full",
  auto: "w-auto",
};

const minHeightClasses = {
  screen: "min-h-screen",
  full: "min-h-full",
};

const bgClasses = {
  background: "bg-background",
  muted: "bg-muted",
  card: "bg-card",
};

/** Centered content container */
export function Center(props: CenterProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "style",
    "w",
    "minH",
    "p",
    "bg",
    "children",
  ]);
  return (
    <div
      class={cn(
        "flex items-center justify-center",
        local.w && widthClasses[local.w],
        local.minH && minHeightClasses[local.minH],
        local.p && paddingClasses[local.p],
        local.bg && bgClasses[local.bg],
        local.class,
      )}
      style={local.style}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export interface BoxProps extends ParentProps {
  class?: string;
  /** classList for conditional classes */
  classList?: Record<string, boolean>;
  /** Inline styles */
  style?: JSX.CSSProperties;
  /** Polymorphic element type */
  as?:
    | "div"
    | "span"
    | "section"
    | "article"
    | "aside"
    | "header"
    | "footer"
    | "main"
    | "nav"
    | "form"
    | "ul"
    | "ol"
    | "li"
    | "input"
    | "label";
  /** Padding */
  p?: SpacingValue;
  /** Form submit handler (when as="form") */
  onSubmit?: (e: SubmitEvent) => void;
  onClick?: (e: MouseEvent) => void;
  /** Inner HTML */
  innerHTML?: string;
  /** Element ref */
  ref?:
    | HTMLDivElement
    | HTMLInputElement
    | ((el: HTMLDivElement | HTMLInputElement) => void);
  type?: string;
  accept?: string;
  multiple?: boolean;
  value?: string;
  onChange?: (e: Event) => void;
  onInput?: (e: InputEvent) => void;
}

const paddingClasses: Record<SpacingValue, string> = {
  "0": "p-0",
  "0.5": "p-0.5",
  "1": "p-1",
  "1.5": "p-1.5",
  "2": "p-2",
  "3": "p-3",
  "4": "p-4",
  "5": "p-5",
  "6": "p-6",
  "8": "p-8",
};

/** Generic box container - the basic building block for layouts */
export function Box(props: BoxProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "classList",
    "style",
    "as",
    "p",
    "onSubmit",
    "onClick",
    "onInput",
    "onChange",
    "innerHTML",
    "ref",
    "type",
    "accept",
    "multiple",
    "value",
    "children",
  ]);
  return (
    <Dynamic
      component={local.as ?? "div"}
      class={cn(local.p && paddingClasses[local.p], local.class)}
      classList={local.classList}
      style={local.style}
      onSubmit={local.onSubmit}
      onClick={local.onClick}
      onInput={local.onInput}
      onChange={local.onChange}
      innerHTML={local.innerHTML}
      ref={local.ref}
      type={local.type}
      accept={local.accept}
      multiple={local.multiple}
      value={local.value}
      {...rest}
    >
      {local.children}
    </Dynamic>
  );
}

export interface TextProps extends ParentProps {
  class?: string;
  /** Inline styles */
  style?: JSX.CSSProperties;
  /** Text size */
  size?: "xxs" | "xs" | "sm" | "base" | "lg" | "xl" | "2xs" | "3xs";
  /** Text colour variant */
  variant?: "default" | "muted" | "accent" | "destructive";
  /** Font weight */
  weight?: "normal" | "medium" | "semibold" | "bold";
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Margin top */
  mt?: SpacingValue;
  /** Margin bottom */
  mb?: SpacingValue;
  /** Polymorphic element type */
  as?: "span" | "p" | "div" | "label" | "pre";
  /** Event handlers */
  onPointerDown?: (e: PointerEvent) => void;
  onPointerUp?: (e: PointerEvent) => void;
  onPointerLeave?: (e: PointerEvent) => void;
  onClick?: (e: MouseEvent) => void;
}

const textSizeClasses = {
  "3xs": "text-3xs",
  "2xs": "text-2xs",
  xxs: "text-xxs",
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

const textVariantClasses = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  accent: "text-accent-foreground",
  destructive: "text-destructive",
};

const textWeightClasses = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const textAlignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/** Text component for inline and block text content */
export function Text(props: TextProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "style",
    "size",
    "variant",
    "weight",
    "align",
    "mt",
    "mb",
    "as",
    "onPointerDown",
    "onPointerUp",
    "onPointerLeave",
    "onClick",
    "children",
  ]);
  return (
    <Dynamic
      component={local.as ?? "span"}
      class={cn(
        textSizeClasses[local.size ?? "sm"],
        textVariantClasses[local.variant ?? "default"],
        local.weight && textWeightClasses[local.weight],
        local.align && textAlignClasses[local.align],
        local.mt && marginTopClasses[local.mt],
        local.mb && marginBottomClasses[local.mb],
        local.class,
      )}
      style={local.style}
      onPointerDown={local.onPointerDown}
      onPointerUp={local.onPointerUp}
      onPointerLeave={local.onPointerLeave}
      onClick={local.onClick}
      {...rest}
    >
      {local.children}
    </Dynamic>
  );
}

export interface SectionProps extends ParentProps {
  class?: string;
  /** Padding variant */
  padding?: "none" | "sm" | "md" | "lg";
  /** Visual variant */
  variant?: "default" | "muted" | "card";
}

const sectionPaddingClasses = {
  none: "",
  sm: "p-2",
  md: "p-3",
  lg: "p-4",
};

const sectionVariantClasses = {
  default: "",
  muted: "bg-muted/50 rounded-lg",
  card: "bg-card border rounded-lg shadow-sm",
};

/** Section container for grouping related content */
export function Section(props: SectionProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "padding",
    "variant",
    "children",
  ]);
  return (
    <div
      class={cn(
        sectionPaddingClasses[local.padding ?? "md"],
        sectionVariantClasses[local.variant ?? "default"],
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export interface HeadingProps extends ParentProps {
  class?: string;
  /** Heading level - determines semantic tag and default styling */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Size override - independent of semantic level */
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
}

const headingSizeClasses = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
};

const headingLevelDefaults: Record<number, string> = {
  1: "text-xl font-semibold tracking-tight",
  2: "text-base font-semibold tracking-tight",
  3: "text-sm font-semibold tracking-tight",
  4: "text-xs font-medium tracking-tight",
  5: "text-xs font-medium",
  6: "text-2xs font-medium",
};

/** Semantic heading component with flexible sizing */
export function Heading(props: HeadingProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "level",
    "size",
    "children",
  ]);
  const level = local.level ?? 2;
  const tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

  return (
    <Dynamic
      component={tag}
      class={cn(
        "text-foreground",
        local.size
          ? cn(headingSizeClasses[local.size], "font-semibold tracking-tight")
          : headingLevelDefaults[level],
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </Dynamic>
  );
}
