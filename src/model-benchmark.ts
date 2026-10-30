/**
 * 神经联想页「与开源通用模型比较」那两张条形图的数据，出自 chinese-ime-lm 的 docs/measurements.md 同名一节：整句集 60 句里金标准落在候选池内的 52 句，每句池里 6 到 7 个候选，各打分器在池内选一个，选中金标准算对。
 *
 * To add a model to the charts, their tooltips and the data table, append one row to BENCHMARK_MODELS. Rows are drawn grouped in BENCHMARK_GROUPS order and by size inside a group, so the position of the new line does not matter. `sizeMb` is the published weight size in decimal megabytes (1 GB = 1000 MB, as the measurements use).
 */
export const BENCHMARK_CASES = 52;

/** Identity groups in row and legend order. 「其他输入法的模型」 has no rows yet; its colour is validated with the other two so its first model needs only a data line. */
export const BENCHMARK_GROUPS = ["project", "open", "ime"] as const;
export type BenchmarkGroup = (typeof BENCHMARK_GROUPS)[number];

export const BENCHMARK_GROUP_LABELS: Record<BenchmarkGroup, string> = { project: "本项目模型", open: "开源通用模型", ime: "其他输入法的模型" };

export type BenchmarkModel = {
  /** Full name, shown in the tooltip and the table. */
  name: string;
  /** Row label written at the start of each bar row; short enough for a 390 px phone. */
  short: string;
  group: BenchmarkGroup;
  /** First choices that matched the gold sentence, out of BENCHMARK_CASES. */
  hits: number;
  sizeMb: number;
};

export const BENCHMARK_MODELS: readonly BenchmarkModel[] = [
  { name: "快速模型（本项目 4.25M int8）", short: "快速模型", group: "project", hits: 49, sizeMb: 4.5 },
  { name: "高精度模型（本项目 24.9M int8）", short: "高精度模型", group: "project", hits: 52, sizeMb: 25.5 },
  { name: "Qwen2.5-0.5B-Instruct-4bit", short: "Qwen2.5-0.5B", group: "open", hits: 42, sizeMb: 278 },
  { name: "Qwen3-0.6B-8bit", short: "Qwen3-0.6B", group: "open", hits: 49, sizeMb: 633 },
  { name: "Qwen3.5-0.8B-8bit", short: "Qwen3.5-0.8B", group: "open", hits: 49, sizeMb: 1000 },
  { name: "Qwen3.5-2B-4bit", short: "Qwen3.5-2B", group: "open", hits: 50, sizeMb: 1700 },
];

/** The engine's own order without reranking. It has no weights, so it is a reference line on the hits chart rather than a row. */
export const BENCHMARK_BASELINE = { name: "引擎原序（不重排）", short: "引擎原序", hits: 41 };

/** The models in drawing order: by group, then by size. */
export const benchmarkRows = (): BenchmarkModel[] =>
  [...BENCHMARK_MODELS].sort((a, b) => BENCHMARK_GROUPS.indexOf(a.group) - BENCHMARK_GROUPS.indexOf(b.group) || a.sizeMb - b.sizeMb);

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
