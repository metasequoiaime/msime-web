import { type CSSProperties, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { barX, type ChartPoint, defineChart, ruleX, text } from "@tanstack/charts";
import { decorative } from "@tanstack/charts/mark/decorative";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import {
  BENCHMARK_BASELINE,
  BENCHMARK_CASES,
  BENCHMARK_GROUP_LABELS,
  BENCHMARK_GROUPS,
  type BenchmarkGroup,
  benchmarkRows,
  formatSize,
  percent,
  wilsonInterval,
} from "./model-benchmark";
import { cx } from "./ui";
import { useLocale } from "./use-locale";

/**
 * Identity colours, one per group and the same hex in light and dark: green is the site's summer --hero-c, the muted violet keeps the open models recessive, amber marks the other input methods' models. Validated with the dataviz skill's validate_palette.js as an adjacent-pair (bar) palette in this order against every season's page background and the panel colour, light and dark. Row names carry identity as well, so nothing depends on colour alone.
 */
const GROUP_COLORS: Record<BenchmarkGroup, string> = { project: "#3E9F63", open: "#8C76B8", ime: "#C8792E" };

/** The tokenizer part of a size bar: the row's own hue, lighter, so it reads as the same model's extra file rather than a fourth identity. */
const TOKENIZER_OPACITY = 0.5;

/** Row pitch, bar thickness and the extra space between groups, in pixels and rows. */
const ROW_PX = 30;
const BAR_PX = 16;
const GROUP_GAP_ROWS = 0.35;

/** Fixed top and bottom margins so the two charts' rows line up side by side; the hits chart writes its reference label in the bottom one. Left and right stay automatic, so the library measures the row names and the end labels and never clips them. */
const MARGIN_TOP = 4;
const MARGIN_BOTTOM = 26;
const MARGIN_BOTTOM_ALONE = 6;

/** A size bar is never thinner than this; the 4.5 MB model is under a pixel at true scale next to 1.7 GB. Its label still states the exact size. */
const MIN_BAR_PX = 3;
/** Gap between a weights bar and its tokenizer segment. */
const SEGMENT_GAP_PX = 2;
/** Upper bound for the width the automatic margins take (row names plus the widest end label), used only to turn the two pixel sizes above into data units before layout. Overestimating it errs towards a slightly wider minimum bar. */
const GUIDE_ESTIMATE_PX = 210;

/** Side by side the hits chart also carries the row names, so it gets more than half the width. Below 34rem of container width (phones) the two stack. */
const PANELS = "grid gap-x-7 gap-y-7 @min-[34rem]:grid-cols-[calc(50%_+_3.5rem)_minmax(0,1fr)]";

/** The library's tooltip reads these custom properties; they point it at the site's panel, hairline and ink tokens so it follows the theme and season like the rest of the page. */
const CHART_STYLE = {
  color: "var(--ink)",
  "--ts-chart-tooltip-background": "var(--panel)",
  "--ts-chart-tooltip-color": "var(--ink)",
  "--ts-chart-tooltip-border": "1px solid var(--hair-2)",
  "--ts-chart-tooltip-border-radius": "10px",
  "--ts-chart-tooltip-shadow": "var(--shadow)",
  "--ts-chart-tooltip-padding": "8px 12px",
} as CSSProperties;

type Row = {
  name: string;
  short: string;
  group: BenchmarkGroup;
  hits: number;
  hitsRange?: readonly [number, number];
  low: number;
  high: number;
  sizeMb: number;
  tokenizerMb?: number;
  size: string;
  /** Vertical position in row units, with a gap between groups. */
  y: number;
};

/** The models with their rates, intervals and row positions, translated once for both charts, the tooltips and the table. */
function useRows(): Row[] {
  const { t } = useLocale();
  return useMemo(() => {
    let gaps = 0;
    return benchmarkRows().map((model, index, all) => {
      if (index > 0 && all[index - 1].group !== model.group) gaps += 1;
      const [low, high] = wilsonInterval(model.hits, BENCHMARK_CASES);
      return {
        name: t(model.name),
        short: t(model.short),
        group: model.group,
        hits: model.hits,
        hitsRange: model.hitsRange,
        low,
        high,
        sizeMb: model.sizeMb,
        tokenizerMb: model.tokenizerMb,
        size: formatSize(model.sizeMb),
        y: index + gaps * GROUP_GAP_ROWS,
      };
    });
  }, [t]);
}

/** Whether the second panel has wrapped under the first. Read from the laid-out panels, so it follows the same container query that stacks them; before hydration it is false and the static HTML shows the side-by-side layout. */
function useStacked(ref: RefObject<HTMLDivElement | null>) {
  const [stacked, setStacked] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const [first, second] = element.children as HTMLCollectionOf<HTMLElement>;
      setStacked(second.offsetTop > first.offsetTop);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return stacked;
}

/** One tooltip for both charts: every value in it is also in the data table, so it adds the full name and the interval without gating anything. */
function useTooltip() {
  const { t } = useLocale();
  return useMemo(
    () => ({
      use: tooltip,
      content: (points: readonly ChartPoint<Row, number, number>[]) => {
        const row = points[0].datum;
        return {
          title: row.name,
          color: GROUP_COLORS[row.group],
          rows: [
            { label: t(`挑对的句数（${percent(row.hits / BENCHMARK_CASES)}）`), value: `${row.hits} / ${BENCHMARK_CASES}` },
            ...(row.hitsRange ? [{ label: t("随打分细节变动"), value: `${row.hitsRange[0]}–${row.hitsRange[1]}` }] : []),
            { label: t("95% 置信区间"), value: `${percent(row.low)} – ${percent(row.high)}` },
            { label: t("模型体积"), value: row.size },
            ...(row.tokenizerMb ? [{ label: t("另需分词表"), value: formatSize(row.tokenizerMb) }] : []),
          ],
        };
      },
    }),
    [t]
  );
}

type PanelProps = {
  rows: Row[];
  /** Draw the row names; the size chart drops them while it sits right of the hits chart. */
  names: boolean;
  bottom: number;
};

const plotHeight = (rows: Row[]) => ROW_PX * (rows[rows.length - 1].y + 1);

/** Shared scales and guides: a linear row axis whose ticks are the row names, and no value axis, since every bar carries its value at the end. */
function rowScale(rows: Row[], names: boolean) {
  const byPosition = new Map(rows.map((row) => [row.y, row.short]));
  return {
    scale: scaleLinear().domain([-0.5, rows[rows.length - 1].y + 0.5]),
    reverse: true,
    axis: names
      ? { line: false, ticks: { values: rows.map((row) => row.y), size: 0, padding: 10, format: (value: number) => byPosition.get(value) ?? "" }, tickLabels: { fontSize: 13.5, opacity: 1, thin: false } }
      : (false as const),
  };
}

/** Value labels right after the bar end, in text ink rather than the bar colour. */
const valueLabel = { anchor: "start" as const, dx: 6, fill: "var(--body)", fontSize: 13 };

/** 「52 句里挑对了几句」: bars from zero to 52 and the engine's own order as a labelled reference line. */
function HitsChart({ rows, names, bottom }: PanelProps) {
  const { t } = useLocale();
  const content = useTooltip();
  const definition = useMemo(() => {
    const last = rows[rows.length - 1].y;
    const reference = [{ hits: BENCHMARK_BASELINE.hits, label: t(`${BENCHMARK_BASELINE.short} ${BENCHMARK_BASELINE.hits}`) }];
    const base = defineChart({
      marks: [
        ruleX([0], { stroke: "var(--hair-2)", strokeOpacity: 1, strokeWidth: 1 }),
        barX(rows, { x1: 0, x2: "hits", y: "y", key: "name", fill: (row) => GROUP_COLORS[row.group], maxThickness: BAR_PX, radius: { end: 4 } }),
        // Drawn over the bars so it stays visible through all of them, as the line every model is measured against.
        ruleX(reference, { x: "hits", stroke: "var(--muted)", strokeOpacity: 1, strokeWidth: 2 }),
        decorative(text(reference, { x: "hits", y: () => last, dy: ROW_PX / 2 + 13, text: "label", anchor: "middle", fill: "var(--muted)", fontSize: 12.5 })),
        // Qwen's hits move with a scoring detail; the asterisk points at the note under the figure.
        decorative(text(rows, { x: "hits", y: "y", key: "name", text: (row) => `${row.hits} / ${BENCHMARK_CASES}${row.hitsRange ? " *" : ""}`, ...valueLabel })),
      ],
      scales: { x: { scale: scaleLinear().domain([0, BENCHMARK_CASES]), axis: false }, y: rowScale(rows, names) },
      margin: { top: MARGIN_TOP, bottom },
    });
    return defineChart(base, { tooltip: content });
  }, [rows, names, bottom, t, content]);
  return (
    <Chart
      definition={definition}
      height={plotHeight(rows) + MARGIN_TOP + bottom}
      initialWidth={420}
      idPrefix="model-benchmark-hits"
      style={CHART_STYLE}
      ariaLabel={t(`${BENCHMARK_CASES} 句里挑对了几句`)}
      ariaDescription={t(`横向条形图，从零画起，竖线是${BENCHMARK_BASELINE.name}的 ${BENCHMARK_BASELINE.hits} 句。${rows.map((row) => `${row.short} ${row.hits}`).join("，")}。`)}
    />
  );
}

/** 「模型体积」: linear from zero, so the small models are slivers; a minimum width keeps them visible and the tokenizer a model also needs is a lighter segment after its weights. */
function SizeChart({ rows, names, bottom }: PanelProps) {
  const { t } = useLocale();
  const content = useTooltip();
  const definition = useMemo(() => {
    const totals = rows.map((row) => row.sizeMb + (row.tokenizerMb ?? 0));
    const max = Math.max(...totals);
    const base = defineChart(({ width }) => {
      // Data units per pixel at this width; the plot is the width less the guides, which are not resolved yet when the builder runs.
      const perPixel = max / Math.max(1, width - (names ? GUIDE_ESTIMATE_PX : GUIDE_ESTIMATE_PX - 110));
      const end = (row: Row) => Math.max(row.sizeMb, MIN_BAR_PX * perPixel);
      const tokenized = rows.filter((row) => row.tokenizerMb);
      const tokenStart = (row: Row) => end(row) + SEGMENT_GAP_PX * perPixel;
      return {
        marks: [
          ruleX([0], { stroke: "var(--hair-2)", strokeOpacity: 1, strokeWidth: 1 }),
          barX(rows, { x1: 0, x2: end, y: "y", key: "name", fill: (row) => GROUP_COLORS[row.group], maxThickness: BAR_PX, radius: { end: 4 } }),
          decorative(
            barX(tokenized, {
              x1: tokenStart,
              x2: (row) => tokenStart(row) + (row.tokenizerMb ?? 0),
              y: "y",
              key: "name",
              fill: (row) => GROUP_COLORS[row.group],
              fillOpacity: TOKENIZER_OPACITY,
              maxThickness: BAR_PX,
              radius: { end: 4 },
            })
          ),
          decorative(
            text(rows, {
              x: (row) => (row.tokenizerMb ? tokenStart(row) + row.tokenizerMb : end(row)),
              y: "y",
              key: "name",
              text: (row) => (row.tokenizerMb ? `${formatSize(row.sizeMb)} + ${formatSize(row.tokenizerMb)}` : row.size),
              ...valueLabel,
            })
          ),
        ],
        scales: { x: { scale: scaleLinear().domain([0, max]), axis: false as const }, y: rowScale(rows, names) },
        margin: { top: MARGIN_TOP, bottom },
      };
    });
    return defineChart(base, { tooltip: content });
  }, [rows, names, bottom, content]);
  return (
    <Chart
      definition={definition}
      height={plotHeight(rows) + MARGIN_TOP + bottom}
      initialWidth={330}
      idPrefix="model-benchmark-size"
      style={CHART_STYLE}
      ariaLabel={t("模型体积")}
      ariaDescription={t(`横向条形图，线性刻度从零画起。${rows.map((row) => `${row.short} ${row.size}${row.tokenizerMb ? `，另需 ${formatSize(row.tokenizerMb)} 分词表` : ""}`).join("；")}。`)}
    />
  );
}

/**
 * Two horizontal bar charts sharing their rows: how many of the 52 sentences each model picked right, and how large it is. Both are TanStack Charts SVG, server-rendered into the static page. Side by side the size chart reads its rows off the hits chart's names; the two use the same row scale, height and top and bottom margins, so the rows line up. Stacked on a phone each chart names its own rows.
 */
export function ModelBenchmarkChart() {
  const { t } = useLocale();
  const rows = useRows();
  const panels = useRef<HTMLDivElement>(null);
  const stacked = useStacked(panels);
  const groups = BENCHMARK_GROUPS.filter((group) => rows.some((row) => row.group === group));
  const title = "m-0 mb-2 text-[14.5px] leading-[1.5] font-semibold text-ink";
  return (
    <div className="@container" data-chart-visual="model-benchmark">
      <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-[13.5px] leading-[1.6] text-body" aria-label={t("图例")}>
        {groups.map((group) => (
          <li key={group} className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ background: GROUP_COLORS[group] }} />
            {t(BENCHMARK_GROUP_LABELS[group])}
          </li>
        ))}
      </ul>
      <div ref={panels} className={cx("mt-4", PANELS)}>
        <div className="min-w-0">
          <p className={title}>{t(`${BENCHMARK_CASES} 句里挑对了几句`)}</p>
          <HitsChart rows={rows} names bottom={MARGIN_BOTTOM} />
        </div>
        <div className="min-w-0">
          <p className={title}>{t("模型体积")}</p>
          <SizeChart rows={rows} names={stacked} bottom={stacked ? MARGIN_BOTTOM_ALONE : MARGIN_BOTTOM} />
        </div>
      </div>
    </div>
  );
}

/** The charts' exact values as an ordinary table, with the 95% intervals the charts leave out; collapsed so it does not repeat the charts for sighted readers. */
export function ModelBenchmarkTable() {
  const { t } = useLocale();
  const rows = useRows();
  const [baselineLow, baselineHigh] = wilsonInterval(BENCHMARK_BASELINE.hits, BENCHMARK_CASES);
  const cells = [
    ...rows.map((row) => ({
      name: row.name,
      kind: t(BENCHMARK_GROUP_LABELS[row.group]),
      hits: row.hits,
      range: row.hitsRange && t(`（随打分细节 ${row.hitsRange[0]}–${row.hitsRange[1]}）`),
      low: row.low,
      high: row.high,
      size: row.tokenizerMb ? t(`${row.size}，另需分词表 ${formatSize(row.tokenizerMb)}`) : row.size,
    })),
    { name: t(BENCHMARK_BASELINE.name), kind: t("参照（不用模型）"), hits: BENCHMARK_BASELINE.hits, range: undefined, low: baselineLow, high: baselineHigh, size: t("无权重") },
  ];
  return (
    <details className="mt-3 text-[14.5px]">
      <summary className="w-fit cursor-pointer text-muted transition-colors hover:text-ink">{t("图表数据")}</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-left leading-[1.7]" data-chart-table="model-benchmark">
          <caption className="sr-only">{t(`各模型在同一候选池 ${BENCHMARK_CASES} 句上挑对的句数、95% 置信区间（Wilson 方法）与权重体积`)}</caption>
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
            {cells.map((cell) => (
              <tr key={cell.name} className="shadow-divider-t">
                <th scope="row" className="min-w-[11em] py-2.5 pr-4 font-normal text-ink">{cell.name}</th>
                <td className="py-2.5 pr-4 whitespace-nowrap text-muted">{cell.kind}</td>
                <td className="py-2.5 pr-4 whitespace-nowrap text-ink tabular-nums">
                  {cell.hits} <span className="text-muted">({percent(cell.hits / BENCHMARK_CASES)})</span>
                  {cell.range && <span className="block text-[13px] text-muted">{cell.range}</span>}
                </td>
                <td className="py-2.5 pr-4 whitespace-nowrap text-ink tabular-nums">
                  {percent(cell.low)} – {percent(cell.high)}
                </td>
                <td className="py-2.5 whitespace-nowrap text-ink tabular-nums">{cell.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
