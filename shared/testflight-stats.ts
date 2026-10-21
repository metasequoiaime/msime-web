/** 只含可公开汇总，不保存构建标识、测试者资料或 Apple 凭据。 */
export type TestFlightStats = {
  schemaVersion: 1;
  generatedAt: string;
  installs: number;
  buildCount: number;
  periodStart: string;
  periodEnd: string;
};

const validDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

/** 接收事件、静态文件与浏览器使用同一校验，并显式选择输出字段。 */
export function parseTestFlightStats(value: unknown): TestFlightStats | null {
  if (value === null) return null;
  if (typeof value !== "object" || !value) throw new Error("Invalid TestFlight snapshot");
  const data = value as Record<string, unknown>;
  const { schemaVersion, generatedAt, installs, buildCount, periodStart, periodEnd } = data;
  if (schemaVersion !== 1 || typeof generatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(generatedAt) || !Number.isFinite(Date.parse(generatedAt)) || new Date(generatedAt).toISOString() !== generatedAt || typeof installs !== "number" || !Number.isSafeInteger(installs) || installs < 0 || typeof buildCount !== "number" || !Number.isSafeInteger(buildCount) || buildCount < 1 || !validDate(periodStart) || !validDate(periodEnd) || periodStart > periodEnd) {
    throw new Error("Invalid TestFlight snapshot");
  }
  return { schemaVersion, generatedAt, installs, buildCount, periodStart, periodEnd };
}
