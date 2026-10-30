import { type CSSProperties, useMemo } from "react";
import { type ChartPoint, colorLegend, colorLegendItems, defineChart, dot, link, rect, ruleY, text, tickY } from "@tanstack/charts";
import { decorative } from "@tanstack/charts/mark/decorative";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scaleOrdinal } from "@tanstack/charts/scales/ordinal";
import { tooltip } from "@tanstack/charts/tooltip";
import { scaleLog } from "d3-scale";
import { BENCHMARK_CASES, BENCHMARK_GROUPS, BENCHMARK_SCORERS, type BenchmarkGroup, formatSize, percent, wilsonInterval } from "./model-benchmark";
import { useLocale } from "./use-locale";

/**
 * Identity colours, one per group and the same hex in light and dark: green is the site's summer --hero-c, violet a series colour of the star-history chart, red the --seal stamp (deliberately not --warn, which is a status colour). Validated with the dataviz skill's validate_palette.js as an all-pairs (scatter) palette against the page background of every season in both modes: worst CVD ΔE 9.5 (deutan, green and red), worst normal-vision ΔE 21.7, contrast at least 3.07:1 light and 3.30:1 dark.
 */
const GROUP_COLORS: Record<BenchmarkGroup, string> = { project: "#3E9F63", open: "#9B6BC7", engine: "#B0482A" };

const GROUP_LABELS: Record<BenchmarkGroup, string> = { project: "本项目模型", open: "开源通用模型", engine: "引擎原序（无权重）" };

/** The library's tooltip reads these custom properties; they point it at the site's panel, hairline and ink tokens so it follows the theme and season like the rest of the page. */
const TOOLTIP_STYLE = {
  "--ts-chart-tooltip-background": "var(--panel)",
  "--ts-chart-tooltip-color": "var(--ink)",
  "--ts-chart-tooltip-border": "1px solid var(--hair-2)",
  "--ts-chart-tooltip-border-radius": "10px",
  "--ts-chart-tooltip-shadow": "var(--shadow)",
  "--ts-chart-tooltip-padding": "8px 12px",
} as CSSProperties;

/**
 * Axis domains are set here rather than inferred, so the baseline band can span the whole plot. They open on 2 MB to 3 GB and 60% to 100%, and widen when a scorer added to the data falls outside: half a point's size below, twice its size above, and down to the tenth under the lowest interval.
 */
function domains(rows: readonly Row[]) {
  const sizes = rows.flatMap((row) => (row.sizeMb === null ? [] : [row.sizeMb]));
  const x: [number, number] = [Math.min(2, Math.min(...sizes) / 2), Math.max(3000, Math.max(...sizes) * 2)];
  const y: [number, number] = [Math.min(0.6, Math.floor(Math.min(...rows.map((row) => row.low)) * 10) / 10), 1];
  const xTicks: number[] = [];
  for (let tick = 10 ** Math.ceil(Math.log10(x[0])); tick <= x[1]; tick *= 10) xTicks.push(tick);
  const yTicks: number[] = [];
  for (let tenth = Math.round(y[0] * 10); tenth <= 10; tenth += 1) yTicks.push(tenth / 10);
  return { x, y, xTicks, yTicks };
}

/** Below this scene width the chart drops to compact labels; 390 px phones land here, the desktop column does not. */
const COMPACT_WIDTH = 520;

type Row = {
  name: string;
  group: BenchmarkGroup;
  hits: number;
  rate: number;
  low: number;
  high: number;
  sizeMb: number | null;
  size: string;
  label?: string;
};

/** The scorers with their rates and intervals, translated once for the chart, the tooltip and the table. */
function useRows() {
  const { t } = useLocale();
  return useMemo(
    () =>
      BENCHMARK_SCORERS.map((scorer): Row => {
        const [low, high] = wilsonInterval(scorer.hits, BENCHMARK_CASES);
        return {
          name: t(scorer.name),
          group: scorer.group,
          hits: scorer.hits,
          rate: scorer.hits / BENCHMARK_CASES,
          low,
          high,
          sizeMb: scorer.sizeMb,
          size: scorer.sizeMb === null ? t("无权重") : formatSize(scorer.sizeMb),
          label: scorer.label && t(scorer.label),
        };
      }),
    [t]
  );
}

/** Weight size against first-choice hit rate on the shared candidate pool, with 95% Wilson intervals; the engine's own order is a reference band because it has no weights to place on the x axis. Server-rendered as SVG, so the figure is in the static HTML. */
export function ModelBenchmarkChart() {
  const { t } = useLocale();
  const rows = useRows();

  const definition = useMemo(() => {
    const points = rows.filter((row): row is Row & { sizeMb: number } => row.sizeMb !== null);
    const baseline = rows.filter((row) => row.sizeMb === null);
    const color = scaleOrdinal<BenchmarkGroup, string>()
      .domain(BENCHMARK_GROUPS)
      .range(BENCHMARK_GROUPS.map((group) => GROUP_COLORS[group]));
    const caseCount = t(`命中 / ${BENCHMARK_CASES}`);
    const { x: xDomain, y: yDomain, xTicks, yTicks } = domains(rows);

    const base = defineChart(({ width }) => {
      const compact = width < COMPACT_WIDTH;
      const labelled = points.filter((row) => row.label);
      return {
        marks: [
          // The baseline's interval as a wash across the whole plot, and its rate as a rule: a point inside the band is not distinguishable from not reranking at all.
          decorative(rect(baseline, { x1: () => xDomain[0], x2: () => xDomain[1], y1: "low", y2: "high", fill: GROUP_COLORS.engine, fillOpacity: 0.1, inset: 0 })),
          ruleY(baseline, { y: "rate", color: "group", strokeWidth: 2, strokeOpacity: 1 }),
          decorative(link(points, { x1: "sizeMb", x2: "sizeMb", y1: "low", y2: "high", color: "group", strokeWidth: 2, lineCap: "butt", key: "name" })),
          decorative(tickY(points, { x: "sizeMb", y: "low", color: "group", strokeWidth: 2, length: 8, key: "name" })),
          decorative(tickY(points, { x: "sizeMb", y: "high", color: "group", strokeWidth: 2, length: 8, key: "name" })),
          dot(points, { x: "sizeMb", y: "rate", color: "group", r: 5, stroke: "var(--bg)", strokeWidth: 2, key: "name" }),
          decorative(
            text(labelled, {
              x: "sizeMb",
              y: "rate",
              text: "label",
              anchor: "start",
              dx: 12,
              fill: "var(--ink)",
              fontSize: compact ? 12 : 13,
              key: "name",
            })
          ),
          // The baseline's label sits at the left edge just under its rule, clear of the 80% gridline, and is the baseline's focus target for the tooltip and the keyboard.
          text(baseline, { x: () => xDomain[0], y: "rate", text: "label", anchor: "start", dx: 6, dy: 12, fill: "var(--muted)", fontSize: compact ? 12 : 13, key: "name" }),
        ],
        scales: {
          x: {
            scale: scaleLog().domain(xDomain),
            axis: {
              label: t(compact ? "权重体积（对数）" : "权重体积（对数刻度）"),
              ticks: { values: xTicks, format: (value: number) => formatSize(value) },
            },
          },
          y: {
            scale: scaleLinear().domain(yDomain),
            grid: { stroke: "var(--hair-2)", strokeOpacity: 1, strokeWidth: 1 },
            axis: {
              label: t(`首选命中率（${BENCHMARK_CASES} 句）`),
              ticks: { values: yTicks, format: (value: number) => `${Math.round(value * 100)}%` },
            },
          },
        },
        color: {
          scale: color,
          legend: colorLegend<BenchmarkGroup>({
            items: colorLegendItems<BenchmarkGroup>({
              justify: "start",
              gap: compact ? 14 : 22,
              indicator: { shape: (group) => (group === "engine" ? "line" : "dot") },
              label: { format: (group) => t(GROUP_LABELS[group]), fontSize: compact ? 12 : 13, fill: "var(--body)" },
            }),
          }),
        },
      };
    });
    // A responsive builder takes its interaction options through the two-argument form.
    return defineChart(base, {
      tooltip: {
        use: tooltip,
        className: "model-benchmark-tooltip",
        content: (points: readonly ChartPoint<Row, number, number>[]) => {
          const row = points[0].datum;
          return {
            title: row.name,
            color: GROUP_COLORS[row.group],
            rows: [
              { label: caseCount, value: String(row.hits) },
              { label: t("命中率"), value: percent(row.rate) },
              { label: t("95% 置信区间"), value: `${percent(row.low)} – ${percent(row.high)}` },
              { label: t("权重体积"), value: row.size },
            ],
          };
        },
      },
    });
  }, [rows, t]);

  const summary = rows.map((row) => `${row.name} ${row.hits}/${BENCHMARK_CASES}，${row.size}`).join("；");

  return (
    <Chart
      definition={definition}
      height={360}
      initialWidth={760}
      idPrefix="model-benchmark"
      className="model-benchmark-chart"
      style={TOOLTIP_STYLE}
      ariaLabel={t("权重体积与首选命中率：本项目模型、开源通用模型和引擎原序")}
      ariaDescription={t(`横轴为权重体积（对数刻度），纵轴为 ${BENCHMARK_CASES} 句里首选命中的比例，竖线为 95% Wilson 置信区间。${summary}。完整数值见图下的数据表。`)}
    />
  );
}

/** The chart's exact values as an ordinary table, the accessible twin of the figure; collapsed so it does not repeat the chart for sighted readers. */
export function ModelBenchmarkTable() {
  const { t } = useLocale();
  const rows = useRows();
  return (
    <details className="mt-3 text-[14.5px]">
      <summary className="w-fit cursor-pointer text-muted transition-colors hover:text-ink">{t("图表数据")}</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-left leading-[1.7]" data-chart-table="model-benchmark">
          <caption className="sr-only">{t(`各打分器在同一候选池 ${BENCHMARK_CASES} 句上的首选命中与权重体积`)}</caption>
          <thead>
            <tr className="text-muted">
              <th scope="col" className="py-2 pr-4 font-semibold">{t("打分器")}</th>
              <th scope="col" className="py-2 pr-4 font-semibold">{t("类别")}</th>
              <th scope="col" className="py-2 pr-4 font-semibold whitespace-nowrap">{t(`命中 / ${BENCHMARK_CASES}`)}</th>
              <th scope="col" className="py-2 pr-4 font-semibold whitespace-nowrap">{t("95% 置信区间")}</th>
              <th scope="col" className="py-2 font-semibold whitespace-nowrap">{t("权重体积")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="shadow-divider-t">
                <th scope="row" className="min-w-[11em] py-2.5 pr-4 font-normal text-ink">{row.name}</th>
                <td className="py-2.5 pr-4 whitespace-nowrap text-muted">{t(GROUP_LABELS[row.group])}</td>
                <td className="py-2.5 pr-4 whitespace-nowrap text-ink tabular-nums">
                  {row.hits} <span className="text-muted">({percent(row.rate)})</span>
                </td>
                <td className="py-2.5 pr-4 whitespace-nowrap text-ink tabular-nums">
                  {percent(row.low)} – {percent(row.high)}
                </td>
                <td className="py-2.5 whitespace-nowrap text-ink tabular-nums">{row.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
