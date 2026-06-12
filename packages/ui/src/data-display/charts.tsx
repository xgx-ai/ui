import { createMountEffect } from "../utils/lifecycle";
import type { Ref } from "../utils/refs";
import { mergeRefs } from "../utils/refs";
import type {
  ChartComponent,
  ChartData,
  ChartItem,
  ChartOptions,
  Plugin as ChartPlugin,
  ChartType,
  ChartTypeRegistry,
  TooltipModel,
} from "chart.js";
import {
  ArcElement,
  BarController,
  BarElement,
  BubbleController,
  CategoryScale,
  Chart,
  Colors,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PieController,
  PointElement,
  PolarAreaController,
  RadarController,
  RadialLinearScale,
  ScatterController,
  Tooltip,
} from "chart.js";
import type { Component } from "solid-js";
import { createRenderEffect, createSignal, merge as mergeProps, onCleanup } from "solid-js";
import { snapshot as unwrap } from "solid-js";

type TypedChartProps = {
  data: ChartData;
  options?: ChartOptions;
  plugins?: ChartPlugin[];
  ref?: Ref<HTMLCanvasElement | null>;
  width?: number | undefined;
  height?: number | undefined;
};

type ChartProps = TypedChartProps & {
  type: ChartType;
  components?: ChartComponent[];
};

type ChartContext = {
  chart: Chart;
  tooltip: TooltipModel<keyof ChartTypeRegistry>;
};

const registeredChartTypes = new Set<string>();

function ensureChartRegistered(type: ChartType, components: ChartComponent[] = []) {
  if (registeredChartTypes.has(type)) return;
  Chart.register(Colors, Filler, Legend, Tooltip, ...components);
  registeredChartTypes.add(type);
}

function readChartToken(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const BaseChart: Component<ChartProps> = (rawProps) => {
  const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement | null>();
  const [chart, setChart] = createSignal<Chart>();

  const props = mergeProps(
    {
      width: 512,
      height: 512,
      options: { responsive: true } as ChartOptions,
      plugins: [] as ChartPlugin[],
    },
    rawProps,
  );

  const init = () => {
    ensureChartRegistered(props.type, props.components);
    const ctx = canvasRef()?.getContext("2d") as ChartItem;
    const config = unwrap(props);
    const chart = new Chart(ctx, {
      type: config.type,
      data: config.data,
      options: config.options,
      plugins: config.plugins,
    });
    setChart(chart);
  };

  createMountEffect(() => init());

  createRenderEffect(
    () => props.data,
    () => {
      chart()!.data = props.data;
      chart()!.update();
    },
    { defer: true },
  );

  createRenderEffect(
    () => props.options,
    () => {
      chart()!.options = props.options;
      chart()!.update();
    },
    { defer: true },
  );

  createRenderEffect(
    () => [props.width, props.height] as const,
    () => {
      chart()!.resize(props.width, props.height);
    },
    { defer: true },
  );

  createRenderEffect(
    () => props.type,
    () => {
      const dimensions = [chart()!.width, chart()!.height] as const;
      chart()!.destroy();
      init();
      chart()!.resize(...dimensions);
    },
    { defer: true },
  );

  onCleanup(() => {
    chart()?.destroy();
    mergeRefs(props.ref, null);
  });

  return (
    <canvas
      ref={mergeRefs(props.ref, (el) => setCanvasRef(el))}
      height={props.height}
      width={props.width}
    />
  );
};

function showTooltip(context: ChartContext) {
  let el = document.getElementById("chartjs-tooltip");
  if (!el) {
    el = document.createElement("div");
    el.id = "chartjs-tooltip";
    document.body.appendChild(el);
  }

  const model = context.tooltip;
  if (model.opacity === 0 || !model.body) {
    el.style.opacity = "0";
    return;
  }

  el.className = `p-2 bg-card text-card-foreground rounded-lg border shadow-sm text-sm ${
    model.yAlign ?? `no-transform`
  }`;

  el.replaceChildren();
  model.title.forEach((title) => {
    const titleEl = document.createElement("h3");
    titleEl.className = "font-semibold leading-none tracking-tight";
    titleEl.textContent = title;
    el.appendChild(titleEl);
  });

  const bodyEl = document.createElement("div");
  bodyEl.className = "mt-1 text-muted-foreground";
  const body = model.body.flatMap((body) => body.lines);
  body.forEach((line, i) => {
    const colors = model.labelColors[i];
    const rowEl = document.createElement("div");
    rowEl.className = "flex items-center";

    const swatchEl = document.createElement("span");
    swatchEl.className = "inline-block h-2 w-2 mr-1 rounded-full border";
    swatchEl.style.background = String(colors.backgroundColor);
    swatchEl.style.borderColor = String(colors.borderColor);

    const labelEl = document.createElement("span");
    labelEl.textContent = line;

    rowEl.append(swatchEl, labelEl);
    bodyEl.appendChild(rowEl);
  });
  el.appendChild(bodyEl);

  const pos = context.chart.canvas.getBoundingClientRect();
  el.style.opacity = "1";
  el.style.position = "absolute";
  el.style.left = `${pos.left + window.scrollX + model.caretX}px`;
  el.style.top = `${pos.top + window.scrollY + model.caretY}px`;
  el.style.pointerEvents = "none";
}

function createTypedChart(
  type: ChartType,
  components: ChartComponent[],
): Component<TypedChartProps> {
  const chartsWithScales: ChartType[] = ["bar", "line", "scatter"];
  const chartsWithLegends: ChartType[] = ["bar"];

  const options = (): ChartOptions => {
    const gridColor = readChartToken(
      "--chart-grid-color",
      "color-mix(in oklch, var(--muted-foreground) 18%, transparent)",
    );
    const labelColor = readChartToken("--chart-label-color", "var(--muted-foreground)");

    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: chartsWithScales.includes(type)
        ? {
            x: {
              border: { display: false },
              grid: { display: false },
            },
            y: {
              beginAtZero: true,
              min: 0,
              border: {
                dash: [3],
                dashOffset: 3,
                display: false,
              },
              grid: {
                color: gridColor,
              },
              ticks: {
                stepSize: 1,
                precision: 0,
              },
            },
          }
        : {},
      plugins: {
        legend: chartsWithLegends.includes(type)
          ? {
              display: true,
              align: "end",
              labels: {
                usePointStyle: true,
                boxWidth: 6,
                boxHeight: 6,
                color: labelColor,
                font: { size: 14 },
              },
            }
          : { display: false },
        tooltip: {
          enabled: false,
          external: (context: any) => showTooltip(context),
        },
      },
    };
  };

  return (props) => (
    <BaseChart
      type={type}
      components={components}
      options={props.options ?? options()}
      {...props}
    />
  );
}

const BarChart = /* #__PURE__ */ createTypedChart("bar", [
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
]);
const BubbleChart = /* #__PURE__ */ createTypedChart("bubble", [
  BubbleController,
  PointElement,
  LinearScale,
]);
const DonutChart = /* #__PURE__ */ createTypedChart("doughnut", [DoughnutController, ArcElement]);
const LineChart = /* #__PURE__ */ createTypedChart("line", [
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
]);
const PieChart = /* #__PURE__ */ createTypedChart("pie", [PieController, ArcElement]);
const PolarAreaChart = /* #__PURE__ */ createTypedChart("polarArea", [
  PolarAreaController,
  ArcElement,
  RadialLinearScale,
]);
const RadarChart = /* #__PURE__ */ createTypedChart("radar", [
  RadarController,
  LineElement,
  PointElement,
  RadialLinearScale,
]);
const ScatterChart = /* #__PURE__ */ createTypedChart("scatter", [
  ScatterController,
  PointElement,
  LinearScale,
]);

export {
  BarChart,
  BaseChart as Chart,
  BubbleChart,
  DonutChart,
  LineChart,
  PieChart,
  PolarAreaChart,
  RadarChart,
  ScatterChart,
};
