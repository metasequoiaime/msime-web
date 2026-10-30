/**
 * 神经联想页「与其他开源模型比较」那两张条形图的数据，出自 chinese-ime-lm 的 docs/measurements.md「与开源通用模型比较」一节和 eval/open-models/results.json（2026-10-30，PR #88）：整句集 60 句里金标准落在候选池内的 52 句，每句池里 6 到 7 个候选，各打分器在池内选一个，选中金标准算对。
 *
 * To add a model to the charts, their tooltips and the data table, append one row to BENCHMARK_MODELS. Rows are drawn grouped in BENCHMARK_GROUPS order and by size inside a group, so the position of the new line does not matter. `sizeMb` is `weights_bytes` from results.json in decimal megabytes (1 GB = 1000 MB, as the measurements use).
 */
export const BENCHMARK_CASES = 52;

/** Identity groups in row and legend order. */
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
  /** Lowest and highest hits the same weights reach across the scoring variants in results.json `start_variants`; only the Qwen rows depend on that detail. */
  hitsRange?: readonly [number, number];
  sizeMb: number;
  /** A tokenizer file the model needs on top of its weights (results.json `tokenizer_bytes`). */
  tokenizerMb?: number;
};

/**
 * The Qwen rows use the `endoftext` variant of results.json `start_variants`: every candidate is prefixed with <|endoftext|>, so its first token is scored like the rest. The hits published on 2026-09-19 (42, 49, 49, 50) came from a scorer that never scored the first token; `hitsRange` spans all three variants, the published numbers included.
 */
export const BENCHMARK_MODELS: readonly BenchmarkModel[] = [
  { name: "快速模型（本项目 4.25M int8）", short: "快速模型", group: "project", hits: 49, sizeMb: 4.49 },
  { name: "高精度模型（本项目 24.9M int8）", short: "高精度模型", group: "project", hits: 52, sizeMb: 25.48 },
  { name: "Qwen2.5-0.5B-Instruct-4bit", short: "Qwen2.5-0.5B", group: "open", hits: 51, hitsRange: [42, 52], sizeMb: 278.06 },
  { name: "Qwen3-0.6B-8bit", short: "Qwen3-0.6B", group: "open", hits: 49, hitsRange: [49, 50], sizeMb: 633.44 },
  { name: "Qwen3.5-0.8B-8bit", short: "Qwen3.5-0.8B", group: "open", hits: 48, hitsRange: [48, 49], sizeMb: 1001.18 },
  { name: "Qwen3.5-2B-4bit", short: "Qwen3.5-2B", group: "open", hits: 45, hitsRange: [45, 51], sizeMb: 1722.27 },
  { name: "含章·通变 v1.0.0（青简输入法）", short: "青简 含章·通变", group: "ime", hits: 50, sizeMb: 46.14 },
  { name: "含章·知微 v1.0.0（青简输入法）", short: "青简 含章·知微", group: "ime", hits: 49, sizeMb: 56.04 },
  { name: "知意 1.4V2-Long-L12 int8 ONNX（知意输入法）", short: "知意 Long-L12", group: "ime", hits: 51, sizeMb: 84.4, tokenizerMb: 34.36 },
  { name: "知意 ML-pumpkin-1026 int8 ONNX（知意输入法 1.6.0 的默认模型）", short: "知意 pumpkin", group: "ime", hits: 49, sizeMb: 92.23, tokenizerMb: 34.36 },
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

/** 1.7 GB, 278 MB, 46.1 MB: three significant figures at most, as the measurements write them. */
export const formatSize = (megabytes: number) =>
  megabytes >= 1000 ? `${(megabytes / 1000).toFixed(1)} GB` : megabytes >= 100 ? `${Math.round(megabytes)} MB` : `${megabytes.toFixed(1)} MB`;
