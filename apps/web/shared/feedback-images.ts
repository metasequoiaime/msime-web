export const MAX_SCREENSHOTS = 3;
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const screenshotTypes = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_FEEDBACK_BYTES = MAX_SCREENSHOTS * MAX_SCREENSHOT_BYTES + 100_000;

// 仅包含此功能使用的 R2 binding 接口。
export interface ScreenshotBucket {
  put(key: string, value: ArrayBuffer, options: { httpMetadata: { contentType: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
  delete(keys: string[]): Promise<void>;
}
export function screenshotBucket(env: Record<string, unknown>): ScreenshotBucket | undefined {
  const bucket = env.FEEDBACK_SCREENSHOTS as ScreenshotBucket | undefined;
  return bucket && typeof bucket.put === "function" && typeof bucket.get === "function" && typeof bucket.delete === "function" ? bucket : undefined;
}
export function screenshotError(files: File[]): string | undefined {
  if (files.length > MAX_SCREENSHOTS) return `最多上传 ${MAX_SCREENSHOTS} 张截图。`;
  for (const file of files) {
    if (!screenshotTypes.some(type => type === file.type)) return "截图仅支持 PNG、JPEG 或 WebP。";
    if (!file.size || file.size > MAX_SCREENSHOT_BYTES) return "每张截图须大于 0 字节且不超过 5 MiB。";
  }
}
export function imageExtension(bytes: Uint8Array): string | undefined {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)) return "png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpeg";
  if (new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") return "webp";
}
