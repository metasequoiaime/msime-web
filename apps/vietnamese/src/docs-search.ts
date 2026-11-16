import { GUIDE_NAMES } from "../shared/site-seo.ts";

type Guide = keyof typeof GUIDE_NAMES;

/** 路由启动时只校验一个平台参数；未知值回落到默认指南。 */
export function docsSearchSchema(search: Record<string, unknown>): { platform?: Guide } {
  const value = search.platform;
  return typeof value === "string" && Object.hasOwn(GUIDE_NAMES, value) ? { platform: value as Guide } : {};
}
