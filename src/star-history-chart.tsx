import { useId, useMemo, useState, type PointerEvent } from "react";
import type { Community } from "./data/schemas";
import { useLocale } from "./use-locale";
import { cx } from "./ui";

/** One cumulative star curve: points in time order, `time` in epoch milliseconds. */
export type StarCurve = { name: string; points: { time: number; stars: number }[] };

/** The design's series palette; the largest repository takes the season accent. Hex values are shared by both themes, as in the design. */
const COLORS = ["var(--accent)", "#E0913A", "#3C8DBC", "#9B6BC7", "#D35D7A", "#3AA89A", "#A39A3A", "#6B7C93"];

/** The curves are resampled at this many equal steps between the first star and the snapshot time. */
const SAMPLES = 120;

/** Gridline steps; the first one that fits the maximum in at most four steps wins. */
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 250, 500, 1000, 2000, 5000];

/** Repositories left off the per-repository chart: documentation and an early prototype, not products whose stars say anything about the input method. Their stars still count in the organisation total. */
const HIDDEN_SERIES = new Set(["MSIME-Docs", "Google-PinyinIME-Rev"]);

const VIEW_W = 1000;
const VIEW_H = 300;
const DAY = 86_400_000;

export const groupThousands = (value: number) => Math.round(value).toLocaleString("en-US");

/** YYYY-MM-DD in UTC, so the server and the browser print the same label whatever the visitor's time zone. */
const utcDate = (time: number) => new Date(time).toISOString().slice(0, 10);

/**
 * The curves the community data can draw. Per-repository series when the live endpoint supplied them; otherwise the organisation's monthly total as one curve, each month plotted at its last day (or the snapshot time for the current month). Sorted largest first, which fixes each curve's colour.
 */
export function starCurves(community: Community): { curves: StarCurve[]; perRepository: boolean; end: number } {
  const end = Date.parse(community.generatedAt);
  const series = community.starSeries?.filter((item) => item.points.length > 0 && !HIDDEN_SERIES.has(item.repo));
  if (series?.length) {
    const curves = series.map((item) => ({
      name: item.repo,
      points: item.points.map((point) => ({ time: Math.min(Date.parse(`${point.date}T00:00:00Z`), end), stars: point.stars })),
    }));
    curves.sort((left, right) => (right.points.at(-1)?.stars ?? 0) - (left.points.at(-1)?.stars ?? 0));
    return { curves, perRepository: true, end };
  }
  const points = community.starHistory.map(({ month, stars }) => {
    const [year, index] = month.split("-").map(Number);
    return { time: Math.min(Date.UTC(year, index, 0, 23, 59, 59), end), stars };
  });
  return { curves: [{ name: "metasequoiaime", points }], perRepository: false, end };
}

/** Piecewise-linear value of a curve at `time`: zero before its first point, flat after its last. */
const valueAt = (points: StarCurve["points"], time: number) => {
  if (!points.length || time < points[0].time) return 0;
  for (let index = 1; index < points.length; index += 1) {
    const after = points[index];
    if (time <= after.time) {
      const before = points[index - 1];
      return before.stars + ((after.stars - before.stars) * (time - before.time)) / Math.max(1, after.time - before.time);
    }
  }
  return points[points.length - 1].stars;
};

/** Catmull-Rom through the samples, written as cubic Béziers and clamped to the plot so the smoothing never dips below the axis. */
const smoothPath = (points: [number, number][]) => {
  const clamp = (y: number) => Math.min(VIEW_H, Math.max(0, y));
  let path = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = clamp(p1[1] + (p2[1] - p0[1]) / 6);
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = clamp(p2[1] - (p3[1] - p1[1]) / 6);
    path += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return path;
};

type StarHistoryChartProps = {
  curves: StarCurve[];
  /** Snapshot time; the x axis runs from the first star to here. */
  end: number;
  /** Show the toggleable legend. Only meaningful with more than the single organisation curve. */
  legend: boolean;
};

/**
 * Cumulative GitHub stars over time, drawn as the design's community chart: dashed gridlines with the scale on the right, a gradient under the largest curve, an end dot per curve, and a crosshair tooltip listing every visible curve. Hiding a curve through the legend rescales the y axis.
 *
 * Everything derives from the data and the snapshot time, never from the clock, so the prerendered chart and the hydrated one are identical.
 */
export function StarHistoryChart({ curves, end, legend }: StarHistoryChartProps) {
  const { t } = useLocale();
  const gradientId = useId();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const [hovered, setHovered] = useState<number | null>(null);

  const coloured = useMemo(() => curves.map((curve, index) => ({ ...curve, color: COLORS[index % COLORS.length], last: curve.points.at(-1)?.stars ?? 0 })), [curves]);

  const chart = useMemo(() => {
    const start = Math.min(...coloured.map((curve) => curve.points[0]?.time ?? end));
    const times = Array.from({ length: SAMPLES + 1 }, (_, index) => start + ((end - start) * index) / SAMPLES);
    const visible = coloured.filter((curve) => !hidden.has(curve.name)).map((curve) => ({ ...curve, values: times.map((time) => valueAt(curve.points, time)) }));

    const max = Math.max(1, ...visible.flatMap((curve) => curve.values));
    const step = STEPS.find((candidate) => max / candidate <= 4) ?? 10 ** Math.ceil(Math.log10(max / 4));
    const top = Math.ceil((max * 1.08) / step) * step || step;
    const y = (value: number) => VIEW_H - (value / top) * VIEW_H;

    const lines = visible.map((curve, index) => ({
      name: curve.name,
      color: curve.color,
      values: curve.values,
      width: index === 0 ? 3 : 2.2,
      dot: index === 0 ? 12 : 8,
      path: smoothPath(curve.values.map((value, sample) => [(sample / SAMPLES) * VIEW_W, y(value)])),
      endTop: (1 - curve.values[SAMPLES] / top) * 100,
    }));

    const grid: { value: number; top: number }[] = [];
    for (let value = 0; value <= top; value += step) grid.push({ value, top: (1 - value / top) * 100 });

    const ticks = [0, 1 / 3, 2 / 3, 1].map((fraction) => ({ fraction, label: utcDate(start + (end - start) * fraction).slice(0, 7) }));

    return { times, lines, grid, ticks, top, area: lines[0] ? `${lines[0].path} L${VIEW_W} ${VIEW_H} L0 ${VIEW_H} Z` : "" };
  }, [coloured, hidden, end]);

  const toggle = (name: string) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      // At least one curve stays visible, or the chart would have nothing to scale to.
      else if (coloured.length - next.size > 1) next.add(name);
      return next;
    });

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const index = Math.max(0, Math.min(SAMPLES, Math.round(((event.clientX - box.left) / box.width) * SAMPLES)));
    setHovered(index);
  };

  const lead = chart.lines[0];
  const hover =
    hovered === null || !lead
      ? null
      : {
          left: (hovered / SAMPLES) * 100,
          top: (1 - lead.values[hovered] / chart.top) * 100,
          date: utcDate(chart.times[hovered]),
        };

  const summary = t(
    `GitHub Star 累计趋势，${chart.ticks[0].label} 至 ${chart.ticks[3].label}：${chart.lines.map((line) => `${line.name} ${groupThousands(line.values[SAMPLES])}`).join("，")}`
  );

  return (
    <>
      {legend && (
        <div className="flex flex-wrap gap-1.5 px-[clamp(22px,3vw,34px)] pt-[clamp(18px,2.4vw,24px)]">
          {coloured.map((curve) => {
            const shown = !hidden.has(curve.name);
            return (
              <button
                key={curve.name}
                type="button"
                className={cx(
                  "inline-flex h-8 cursor-pointer items-center gap-[7px] rounded-full border-0 px-3 text-[13px] text-ink shadow-ring-2 transition-[opacity,background-color]",
                  shown ? "bg-panel-2" : "bg-transparent opacity-45"
                )}
                aria-pressed={shown}
                onClick={() => toggle(curve.name)}
              >
                <span className="size-[9px] rounded-full" style={{ background: curve.color }} aria-hidden="true" />
                {curve.name}
                <span className="text-muted tabular-nums">{groupThousands(curve.last)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="relative mt-[clamp(14px,2vw,20px)] h-[clamp(220px,28vw,340px)]" role="img" aria-label={summary}>
        <div className="absolute top-3.5 right-[clamp(64px,7vw,96px)] bottom-[34px] left-[clamp(22px,3vw,34px)]" aria-hidden="true">
          {chart.grid.map((line) => (
            <div key={line.value}>
              <div className="absolute inset-x-0 border-t border-dashed border-hair-2" style={{ top: `${line.top}%` }} />
              <span
                className="absolute right-0 translate-x-[calc(100%+10px)] -translate-y-1/2 text-xs text-muted tabular-nums"
                style={{ top: `${line.top}%` }}
              >
                {groupThousands(line.value)}
              </span>
            </div>
          ))}

          <svg className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                {/* SVG presentation attributes do not resolve var(), so the stop colours go through style. */}
                <stop offset="0" style={{ stopColor: "var(--accent)", stopOpacity: 0.34 }} />
                <stop offset="0.7" style={{ stopColor: "var(--accent)", stopOpacity: 0.06 }} />
                <stop offset="1" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            {chart.area && <path d={chart.area} fill={`url(#${gradientId})`} />}
            {chart.lines.map((line) => (
              <path
                key={line.name}
                d={line.path}
                fill="none"
                strokeWidth={line.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                style={{ stroke: line.color }}
              />
            ))}
          </svg>

          {chart.lines.map((line) => (
            <span
              key={line.name}
              className="absolute left-full -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_3px_var(--panel)]"
              style={{ top: `${line.endTop}%`, width: line.dot, height: line.dot, background: line.color }}
            />
          ))}

          {hover && hovered !== null && (
            <>
              <div className="pointer-events-none absolute inset-y-0 border-l border-hair-2" style={{ left: `${hover.left}%` }} />
              <span
                className="pointer-events-none absolute -mt-[5px] -ml-[5px] size-2.5 rounded-full bg-panel shadow-[0_0_0_2.5px_var(--accent)]"
                style={{ left: `${hover.left}%`, top: `${hover.top}%` }}
              />
              <div
                className="pointer-events-none absolute z-10 rounded-tab bg-ink px-3 py-2 text-[13px] leading-normal whitespace-nowrap text-bg tabular-nums"
                style={{
                  left: `${hover.left}%`,
                  top: `${hover.top}%`,
                  // Flip away from the edges, and drop below the point when it sits in the upper part of the plot so the box stays inside the card.
                  transform: `translate(${hovered > SAMPLES * 0.75 ? "calc(-100% - 12px)" : hovered < SAMPLES * 0.2 ? "12px" : "-50%"}, ${hover.top < 45 ? "14px" : "calc(-100% - 14px)"})`,
                }}
              >
                <div className="mb-1 opacity-75">{hover.date}</div>
                {chart.lines.map((line) => (
                  <div key={line.name} className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: line.color }} />
                    <span className="flex-1 opacity-85">{line.name}</span>
                    <span className="ml-3.5 font-bold">{groupThousands(line.values[hovered])}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="absolute inset-0 cursor-crosshair touch-pan-y" onPointerMove={track} onPointerDown={track} onPointerLeave={() => setHovered(null)} />

          <div className="absolute inset-x-0 -bottom-[26px] flex justify-between text-[12.5px] text-muted tabular-nums">
            {chart.ticks.map((tick) => (
              <span key={tick.fraction}>{tick.label}</span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/** Whole days between the first star and the snapshot, at least one. */
export const daysTracked = (curves: StarCurve[], end: number) => {
  const start = Math.min(...curves.map((curve) => curve.points[0]?.time ?? end));
  return Math.max(1, Math.round((end - start) / DAY));
};
