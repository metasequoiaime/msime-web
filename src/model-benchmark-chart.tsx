import { useId, useMemo } from "react";
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
 * Identity colours, one per group and the same hex in light and dark: green is the site's summer --hero-c, the muted violet keeps the open models recessive, amber is reserved for the other input methods' models. Validated with the dataviz skill's validate_palette.js as an adjacent-pair (bar) palette in this order against every season's page background and the panel colour, light and dark: worst CVD ΔE 13.8 (deutan, green and violet), worst normal-vision ΔE 20.6, every colour inside the lightness band and at least 3:1 against the surface. Row names carry identity as well, so nothing depends on colour alone.
 */
const GROUP_COLORS: Record<BenchmarkGroup, string> = { project: "#3E9F63", open: "#8C76B8", ime: "#C8792E" };

/** Width of the row-name column and the gap after it; the side-by-side column split below is derived from the two. */
const NAME_COLUMN = "grid-cols-[7.25rem_minmax(0,1fr)] gap-x-3";

/**
 * Side by side the size chart drops its name column and reads its rows off the hits chart's names, so the hits chart gets that column's width on top of an equal half: 50% − gap/2 + (7.25rem + 0.75rem)/2 with a 1.75rem gap. Below 34rem of container width (phones) the two stack and each keeps its names.
 */
const PANELS = "grid gap-x-7 gap-y-7 @min-[34rem]:grid-cols-[calc(50%_+_3.125rem)_minmax(0,1fr)]";

/** Space kept right of the longest bar for its value label ("25.5 MB", "49 / 52"). */
const LABEL_RESERVE = "right-[4.5rem]";

/** A bar this small would vanish; the 4.5 MB model is under a pixel wide at true scale on a phone. */
const MIN_BAR_PX = 3;

type Row = {
  name: string;
  short: string;
  group: BenchmarkGroup;
  hits: number;
  low: number;
  high: number;
  sizeMb: number;
  size: string;
  /** First row of a group after the first group; it gets a little space above. */
  groupStart: boolean;
};

/** The models with their rates and intervals, translated once for both charts, the tooltips and the table. */
function useRows(): Row[] {
  const { t } = useLocale();
  return useMemo(
    () =>
      benchmarkRows().map((model, index, all) => {
        const [low, high] = wilsonInterval(model.hits, BENCHMARK_CASES);
        return {
          name: t(model.name),
          short: t(model.short),
          group: model.group,
          hits: model.hits,
          low,
          high,
          sizeMb: model.sizeMb,
          size: formatSize(model.sizeMb),
          groupStart: index > 0 && all[index - 1].group !== model.group,
        };
      }),
    [t]
  );
}

/** Bar length and the label's left edge right after it, both as CSS lengths of the plot width. */
function barGeometry(value: number, max: number) {
  const fraction = `${((value / max) * 100).toFixed(3)}%`;
  const width = `max(${MIN_BAR_PX}px, ${fraction})`;
  return { width, label: `calc(${width} + 6px)` };
}

/** Per-row detail on hover and keyboard focus, under the row: from the plot's left edge side by side, from the row's left edge on a phone so it stays inside the screen. Every value in it is also in the data table, so it adds the full name and the interval without gating anything. */
function RowTooltip({ row }: { row: Row }) {
  const { t } = useLocale();
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-full left-0 z-20 mt-1 hidden w-max max-w-full @min-[34rem]:left-[var(--plot-left)] @min-[34rem]:max-w-[18rem] rounded-[10px] border border-hair-2 bg-panel px-3 py-2 text-[13px] leading-[1.6] text-body shadow-[var(--shadow)] group-hover:block group-focus-visible:block"
    >
      <span className="flex items-center gap-2 font-semibold text-ink">
        <span className="h-[3px] w-3 flex-none rounded-full" style={{ background: GROUP_COLORS[row.group] }} />
        {row.name}
      </span>
      <span className="mt-1 grid grid-cols-[auto_auto] gap-x-3 tabular-nums">
        <span className="font-semibold text-ink">
          {row.hits} / {BENCHMARK_CASES}
        </span>
        <span className="text-muted">{t(`挑对的句数（${percent(row.hits / BENCHMARK_CASES)}）`)}</span>
        <span className="font-semibold text-ink">
          {percent(row.low)} – {percent(row.high)}
        </span>
        <span className="text-muted">{t("95% 置信区间")}</span>
        <span className="font-semibold text-ink">{row.size}</span>
        <span className="text-muted">{t("模型体积")}</span>
      </span>
    </span>
  );
}

type PanelProps = {
  title: string;
  rows: Row[];
  value: (row: Row) => number;
  max: number;
  label: (row: Row) => string;
  /** The second chart: side by side it shares the first chart's row names and keeps them only for screen readers. */
  secondary?: boolean;
  /** A labelled vertical reference line across the rows, in value units. */
  reference?: { value: number; label: string };
};

/** One horizontal bar chart: a row per model, the name at the start, a bar from zero and its value right after the bar end. */
function BarPanel({ title, rows, value, max, label, secondary = false, reference }: PanelProps) {
  const titleId = useId();
  const referenceAt = reference && `${((reference.value / max) * 100).toFixed(3)}%`;
  return (
    // --plot-left is where the bars start inside the panel: after the name column (7.25rem + 0.75rem gap), or at the edge when a side-by-side size chart drops it.
    <div className={cx("relative [--plot-left:8rem]", secondary && "@min-[34rem]:[--plot-left:0px]")}>
      <p id={titleId} className="m-0 text-[14.5px] leading-[1.5] font-semibold text-ink">
        {title}
      </p>
      <div className="relative mt-2">
        {/* The zero baseline and the reference line, under the bars; they run through the footer so the reference label hangs off its line. */}
        <div aria-hidden="true" className={cx("pointer-events-none absolute inset-y-0 left-[var(--plot-left)]", LABEL_RESERVE)}>
          <span className="absolute inset-y-0 left-0 w-px bg-hair-2" />
          {referenceAt && <span className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-muted" style={{ left: referenceAt }} />}
        </div>
        <ul aria-labelledby={titleId} className="relative m-0 list-none p-0">
          {rows.map((row) => {
            const bar = barGeometry(value(row), max);
            return (
              <li
                key={row.name}
                // biome-ignore lint/a11y/noNoninteractiveTabindex: a focusable row is the keyboard route to the same tooltip a pointer gets on hover.
                tabIndex={0}
                className={cx("group relative grid h-[30px] items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent-ring", NAME_COLUMN, secondary && "@min-[34rem]:grid-cols-[minmax(0,1fr)]", row.groupStart && "mt-2.5")}
              >
                <span
                  className={cx(
                    "truncate text-[13.5px] leading-none text-ink",
                    secondary && "@min-[34rem]:sr-only"
                  )}
                >
                  {row.short}
                </span>
                <span className="relative h-full">
                  <span className={cx("absolute inset-y-0 left-0", LABEL_RESERVE)}>
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 left-0 h-4 -translate-y-1/2 rounded-r-[4px] transition-[filter] group-hover:brightness-110 group-focus-visible:brightness-110"
                      style={{ width: bar.width, background: GROUP_COLORS[row.group] }}
                    />
                    <span className="absolute top-1/2 -translate-y-1/2 text-[13px] leading-none whitespace-nowrap text-body tabular-nums" style={{ left: bar.label }}>
                      {label(row)}
                    </span>
                  </span>
                </span>
                <RowTooltip row={row} />
              </li>
            );
          })}
        </ul>
        {reference && referenceAt && (
          <div aria-hidden="true" className={cx("grid h-6", NAME_COLUMN)}>
            <span />
            <span className="relative">
              <span className={cx("absolute inset-y-0 left-0", LABEL_RESERVE)}>
                <span className="absolute bottom-0 -translate-x-full pr-1.5 text-[12.5px] leading-none whitespace-nowrap text-muted" style={{ left: referenceAt }}>
                  {reference.label}
                </span>
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Two horizontal bar charts sharing their rows: how many of the 52 sentences each model picked right, and how large it is. Both scales are linear from zero, so the project models' size bars are slivers next to the open models'; that difference is the point of the figure. The engine's own order has no weights, so it is a reference line on the hits chart instead of a row. Plain HTML, so it is in the static page, its text never clips, and the stacking for phones is a container query rather than measured JavaScript.
 */
export function ModelBenchmarkChart() {
  const { t } = useLocale();
  const rows = useRows();
  const maxSize = Math.max(...rows.map((row) => row.sizeMb));
  const groups = BENCHMARK_GROUPS.filter((group) => rows.some((row) => row.group === group));
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
      <div className={cx("mt-4", PANELS)}>
        <BarPanel
          title={t(`${BENCHMARK_CASES} 句里挑对了几句`)}
          rows={rows}
          value={(row) => row.hits}
          max={BENCHMARK_CASES}
          label={(row) => `${row.hits} / ${BENCHMARK_CASES}`}
          reference={{ value: BENCHMARK_BASELINE.hits, label: t(`${BENCHMARK_BASELINE.short} ${BENCHMARK_BASELINE.hits}`) }}
        />
        <BarPanel title={t("模型体积")} rows={rows} value={(row) => row.sizeMb} max={maxSize} label={(row) => row.size} secondary />
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
    ...rows.map((row) => ({ name: row.name, kind: t(BENCHMARK_GROUP_LABELS[row.group]), hits: row.hits, low: row.low, high: row.high, size: row.size })),
    { name: t(BENCHMARK_BASELINE.name), kind: t("参照（不用模型）"), hits: BENCHMARK_BASELINE.hits, low: baselineLow, high: baselineHigh, size: t("无权重") },
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
