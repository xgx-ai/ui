import type { ComponentProps, JSX } from "@solidjs/web";
import { createUniqueId, omit, type ParentProps, Show } from "solid-js";
import { cn } from "../cn";
import { Badge } from "../feedback/badge";
import { Skeleton } from "../feedback/skeleton";
import { Button } from "../forms/button";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarRange } from "../icons.index";
import { ToolbarToggleGroup, ToolbarToggleItem } from "../shell-controls";

type TrendDirection = "up" | "down" | "flat";
type TrendTone = "positive" | "negative" | "neutral";

const trendToneClasses: Record<TrendTone, string> = {
  positive: "bg-success text-success-foreground",
  negative: "bg-error text-error-foreground",
  neutral: "bg-surface-muted text-surface-muted-foreground",
};

export type TrendIndicatorProps = ComponentProps<"span"> & {
  direction?: TrendDirection;
  tone?: TrendTone;
  value: string;
};

export function TrendIndicator(props: TrendIndicatorProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "direction", "tone", "value");
  const direction = () => local.direction ?? "flat";
  const tone = () => local.tone ?? "neutral";

  return (
    <span
      class={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-semibold",
        trendToneClasses[tone()],
        local.class,
      )}
      {...rest}
    >
      <Show
        when={direction() === "up"}
        fallback={
          <Show
            when={direction() === "down"}
            fallback={<ArrowRight aria-hidden="true" class="size-3" />}
          >
            <ArrowDownRight aria-hidden="true" class="size-3" />
          </Show>
        }
      >
        <ArrowUpRight aria-hidden="true" class="size-3" />
      </Show>
      {local.value}
    </span>
  );
}

export type MetricCardProps = ComponentProps<"article"> & {
  description?: JSX.Element;
  footer?: JSX.Element;
  icon?: JSX.Element;
  label: string;
  trend?: string;
  trendDirection?: TrendDirection;
  trendTone?: TrendTone;
  value: JSX.Element;
};

export function MetricCard(props: MetricCardProps): JSX.Element {
  const local = props;
  const rest = omit(
    props,
    "class",
    "description",
    "footer",
    "icon",
    "label",
    "trend",
    "trendDirection",
    "trendTone",
    "value",
  );

  return (
    <article
      class={cn(
        "rounded-lg border border-border-subtle bg-card p-4 text-card-foreground shadow-elevation-low",
        local.class,
      )}
      {...rest}
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 space-y-1">
          <div class="truncate text-xs font-medium text-muted-foreground">{local.label}</div>
          <div class="text-2xl font-semibold tracking-tight">{local.value}</div>
        </div>
        <Show when={local.icon}>
          <div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
            {local.icon}
          </div>
        </Show>
      </div>
      <div class="mt-3 flex min-h-5 flex-wrap items-center gap-2">
        <Show when={local.trend}>
          <TrendIndicator
            value={local.trend!}
            direction={local.trendDirection}
            tone={local.trendTone}
          />
        </Show>
        <Show when={local.description}>
          <div class="text-xs text-muted-foreground">{local.description}</div>
        </Show>
      </div>
      <Show when={local.footer}>
        <div class="mt-3 border-t border-border-subtle pt-3 text-xs text-muted-foreground">
          {local.footer}
        </div>
      </Show>
    </article>
  );
}

export type MetricGridProps = ParentProps<
  ComponentProps<"div"> & {
    columns?: "2" | "3" | "4";
  }
>;

const metricGridColumns = {
  "2": "grid-cols-1 sm:grid-cols-2",
  "3": "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  "4": "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
};

export function MetricGrid(props: MetricGridProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children", "columns");

  return (
    <div class={cn("grid gap-3", metricGridColumns[local.columns ?? "4"], local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export type ReportHeaderProps = ParentProps<
  ComponentProps<"section"> & {
    actions?: JSX.Element;
    description?: JSX.Element;
    eyebrow?: JSX.Element;
    meta?: JSX.Element;
    title: JSX.Element;
  }
>;

export function ReportHeader(props: ReportHeaderProps): JSX.Element {
  const local = props;
  const rest = omit(
    props,
    "actions",
    "children",
    "class",
    "description",
    "eyebrow",
    "meta",
    "title",
  );

  return (
    <section
      class={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border-subtle bg-surface p-4 text-surface-foreground",
        local.class,
      )}
      {...rest}
    >
      <div class="min-w-0 space-y-1">
        <Show when={local.eyebrow}>
          <div class="text-xs font-medium uppercase text-muted-foreground">{local.eyebrow}</div>
        </Show>
        <h2 class="text-lg font-semibold tracking-tight">{local.title}</h2>
        <Show when={local.description}>
          <p class="max-w-2xl text-sm text-muted-foreground">{local.description}</p>
        </Show>
        <Show when={local.meta}>
          <div class="pt-1 text-xs text-muted-foreground">{local.meta}</div>
        </Show>
        {local.children}
      </div>
      <Show when={local.actions}>
        <div class="flex flex-wrap items-center gap-2">{local.actions}</div>
      </Show>
    </section>
  );
}

export type ReportToolbarProps = ParentProps<ComponentProps<"div">>;

export function ReportToolbar(props: ReportToolbarProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");

  return (
    <div
      class={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-surface-foreground",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export type ReportDateRangeOption = {
  label: string;
  value: string;
};

export type ReportDateRangeControlProps = Omit<ComponentProps<"div">, "onChange"> & {
  label?: string;
  onChange?: (value: string) => void;
  options?: ReadonlyArray<ReportDateRangeOption>;
  value?: string;
};

const defaultDateRanges: ReadonlyArray<ReportDateRangeOption> = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
];

export function ReportDateRangeControl(props: ReportDateRangeControlProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "label", "onChange", "options", "value");
  const options = () => local.options ?? defaultDateRanges;
  const optionValues = () => new Set(options().map((option) => option.value));
  const normalizeValue = (next: unknown) => {
    const candidate = Array.isArray(next) ? next[0] : next;
    return typeof candidate === "string" && optionValues().has(candidate) ? candidate : undefined;
  };
  const value = () => normalizeValue(local.value) ?? options()[0]?.value;

  return (
    <div class={cn("flex items-center gap-2", local.class)} {...rest}>
      <Badge variant="outline" class="hidden gap-1 sm:inline-flex">
        <CalendarRange class="size-3" />
        {local.label ?? "Range"}
      </Badge>
      <ToolbarToggleGroup
        value={value()}
        aria-label={local.label ?? "Report date range"}
        onChange={(next) => {
          const value = normalizeValue(next);
          if (value) {
            local.onChange?.(value);
          }
        }}
        size="sm"
      >
        {options().map((option) => (
          <ToolbarToggleItem value={option.value}>{option.label}</ToolbarToggleItem>
        ))}
      </ToolbarToggleGroup>
    </div>
  );
}

export type ChartPanelState = "ready" | "loading" | "empty" | "error";

export type ChartPanelProps = ParentProps<
  ComponentProps<"section"> & {
    actions?: JSX.Element;
    description?: JSX.Element;
    emptyDescription?: JSX.Element;
    errorDescription?: JSX.Element;
    height?: string;
    legend?: JSX.Element;
    state?: ChartPanelState;
    summary?: JSX.Element;
    title: JSX.Element;
  }
>;

export function ChartPanel(props: ChartPanelProps): JSX.Element {
  const id = createUniqueId();
  const local = props;
  const rest = omit(
    props,
    "actions",
    "children",
    "class",
    "description",
    "emptyDescription",
    "errorDescription",
    "height",
    "legend",
    "state",
    "summary",
    "title",
  );
  const state = () => local.state ?? "ready";

  return (
    <section
      aria-describedby={local.summary ? id : undefined}
      class={cn(
        "rounded-lg border border-border-subtle bg-card text-card-foreground shadow-elevation-low",
        local.class,
      )}
      {...rest}
    >
      <div class="flex flex-wrap items-start justify-between gap-3 p-4">
        <div class="min-w-0 space-y-1">
          <h3 class="text-base font-semibold tracking-tight">{local.title}</h3>
          <Show when={local.description}>
            <p class="text-sm text-muted-foreground">{local.description}</p>
          </Show>
        </div>
        <Show when={local.actions}>
          <div class="flex flex-wrap items-center gap-2">{local.actions}</div>
        </Show>
      </div>
      <div class="px-4 pb-4">
        <div
          class="relative min-h-48 overflow-hidden rounded-md border border-border-subtle bg-surface p-3"
          style={{ height: local.height ?? "18rem" }}
        >
          <Show
            when={state() === "ready"}
            fallback={
              <Show
                when={state() === "loading"}
                fallback={
                  <div class="flex size-full min-h-48 flex-col items-center justify-center gap-2 text-center">
                    <div class="text-sm font-medium">
                      {state() === "empty" ? "No report data" : "Report unavailable"}
                    </div>
                    <p class="max-w-xs text-xs text-muted-foreground">
                      {state() === "empty"
                        ? (local.emptyDescription ?? "Adjust filters or select another date range.")
                        : (local.errorDescription ??
                          "Refresh the report or retry the export later.")}
                    </p>
                    <Show when={state() === "error"}>
                      <Button type="button" variant="outline" size="sm">
                        Retry
                      </Button>
                    </Show>
                  </div>
                }
              >
                <div class="space-y-3 p-2">
                  <Skeleton animate class="h-5 w-1/3 rounded" />
                  <Skeleton animate class="h-40 rounded-md" />
                  <Skeleton animate class="h-4 w-2/3 rounded" />
                </div>
              </Show>
            }
          >
            <div class="size-full">{local.children}</div>
          </Show>
        </div>
        <Show when={local.legend}>
          <div class="mt-3">{local.legend}</div>
        </Show>
        <Show when={local.summary}>
          <p id={id} class="mt-3 text-xs text-muted-foreground">
            {local.summary}
          </p>
        </Show>
      </div>
    </section>
  );
}

export type ReportDashboardGridProps = ParentProps<ComponentProps<"div">>;

export function ReportDashboardGrid(props: ReportDashboardGridProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");

  return (
    <div class={cn("grid gap-4 xl:grid-cols-12", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export type ReportDrilldownLayoutProps = ParentProps<ComponentProps<"div">>;

export function ReportDrilldownLayout(props: ReportDrilldownLayoutProps): JSX.Element {
  const local = props;
  const rest = omit(props, "class", "children");

  return (
    <div class={cn("grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]", local.class)} {...rest}>
      {local.children}
    </div>
  );
}
