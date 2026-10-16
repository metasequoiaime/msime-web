import { zipSync } from "fflate";
import { parse } from "smol-toml";
import { z } from "zod";
import { accountCall } from "../data/account.ts";
import { communitySkinIdSchema } from "../data/schemas.ts";

// 与客户端 candidate_community 的传输上限一致；打包时不改变清单和图片内容。
const MAX_MANIFEST_BYTES = 65_536;
const MAX_FILE_BYTES = 1 << 20;
const MAX_PACKAGE_BYTES = 2 << 20;
const MAX_BASE64_LENGTH = 4 * Math.ceil(MAX_FILE_BYTES / 3);
const encoder = new TextEncoder();

const safePath = (path: string) => path.length <= 256 && path.split("/").every(part => /^[A-Za-z0-9_.-]+$/.test(part) && part !== "." && part !== "..");
const packageSchema = z.object({
  id: communitySkinIdSchema,
  package_id: z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9_.-]*$/),
  manifest: z.string().min(1).max(MAX_MANIFEST_BYTES),
  files: z.record(z.string(), z.string().max(MAX_BASE64_LENGTH)),
});

/** 将后端返回的皮肤包封装成以皮肤 ID 命名的文件夹，解压后可以直接放入客户端皮肤目录。 */
export function candidateSkinArchive(value: unknown, expectedId: string) {
  const pack = packageSchema.parse(value);
  const manifest = encoder.encode(pack.manifest);
  const entries = Object.entries(pack.files);
  if (pack.id.toLowerCase() !== expectedId.toLowerCase() || manifest.length > MAX_MANIFEST_BYTES || parse(pack.manifest).id !== pack.package_id || entries.length < 1 || entries.length > 3) throw new Error("Invalid candidate skin package");
  const files: Record<string, Uint8Array> = { [`${pack.package_id}/skin.toml`]: manifest };
  let total = 0;
  for (const [path, data] of entries) {
    if (!safePath(path) || !/\.(png|jpe?g)$/i.test(path) || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) throw new Error("Invalid candidate skin file");
    const bytes = Uint8Array.from(atob(data), character => character.charCodeAt(0));
    total += bytes.length;
    if (!bytes.length || bytes.length > MAX_FILE_BYTES || total > MAX_PACKAGE_BYTES) throw new Error("Candidate skin package too large");
    files[`${pack.package_id}/${path}`] = bytes;
  }
  // 图片已经压缩，使用 ZIP 的存储模式，避免在主线程重复压缩。
  return { filename: `${pack.package_id}.zip`, bytes: zipSync(files, { level: 0 }) };
}

/** 复用账号代理的权限校验、会话刷新与下载计数；仅用户点击后发起一次 POST。 */
export async function downloadCandidateSkin(id: string) {
  const skinId = communitySkinIdSchema.parse(id);
  const archive = await accountCall(`/api/v1/community/candidate-skins/${skinId}/download`, value => candidateSkinArchive(value, skinId), { method: "POST" });
  const url = URL.createObjectURL(new Blob([archive.bytes], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = archive.filename;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // 留出浏览器接管下载的时间，随后释放内存。
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
