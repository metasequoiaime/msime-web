/**
 * 神经联想页「与开源通用模型比较」那张图的数据，出自 chinese-ime-lm 的 docs/measurements.md 同名一节：整句集 60 句里金标准落在候选池内的 52 句，每句池里 6 到 7 个候选，各打分器在池内选一个，选中金标准算对。
 *
 * To add a scorer to the chart, its table and its tooltip, append one row here. `sizeMb` is the published weight size in decimal megabytes (1 GB = 1000 MB, as the measurements use); `null` means the scorer has no weights, which only the engine baseline may be, and it is drawn as the reference line instead of a point.
 */
export const BENCHMARK_CASES = 52;

/** Identity groups, in legend order. A new scorer joins one of these; a fourth group would exceed the three colours validated for an all-pairs scatter. */
export const BENCHMARK_GROUPS = ["project", "open", "engine"] as const;
export type BenchmarkGroup = (typeof BENCHMARK_GROUPS)[number];

export type BenchmarkScorer = {
  /** Full name, shown in the tooltip and the table. */
  name: string;
  group: BenchmarkGroup;
  /** First choices that matched the gold sentence, out of BENCHMARK_CASES. */
  hits: number;
  sizeMb: number | null;
  /** Direct label beside the point; only the few the text is about get one. */
  label?: string;
};

export const BENCHMARK_SCORERS: readonly BenchmarkScorer[] = [
  { name: "引擎原序（不重排）", group: "engine", hits: 41, sizeMb: null, label: "引擎原序" },
  { name: "快速模型（本项目 4.25M int8）", group: "project", hits: 49, sizeMb: 4.5, label: "快速模型" },
  { name: "高精度模型（本项目 24.9M int8）", group: "project", hits: 52, sizeMb: 25.5, label: "高精度模型" },
  { name: "Qwen2.5-0.5B-Instruct-4bit", group: "open", hits: 42, sizeMb: 278 },
  { name: "Qwen3-0.6B-8bit", group: "open", hits: 49, sizeMb: 633 },
  { name: "Qwen3.5-0.8B-8bit", group: "open", hits: 49, sizeMb: 1000 },
  { name: "Qwen3.5-2B-4bit", group: "open", hits: 50, sizeMb: 1700 },
];

/** Two-sided 95% normal quantile. */
const Z = 1.959963984540054;

/** Wilson score interval for `hits` successes out of `cases`. Unlike the normal approximation it stays inside [0, 1] and does not collapse to zero width at 52/52. */
export function wilsonInterval(hits: number, cases: number): [number, number] {
  const rate = hits / cases;
  const z2 = Z * Z;
  const denominator = 1 + z2 / cases;
  const centre = (rate + z2 / (2 * cases)) / denominator;
  const half = (Z * Math.sqrt((rate * (1 - rate)) / cases + z2 / (4 * cases * cases))) / denominator;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

export const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export const formatSize = (megabytes: number) => (megabytes >= 1000 ? `${(megabytes / 1000).toFixed(1)} GB` : `${megabytes} MB`);
