import { loadTraditional } from "../../shared/translate.ts";
import { z } from "zod";
import { imageExtension, MAX_FEEDBACK_BYTES, screenshotBucket, screenshotError } from "../../shared/feedback-images.ts";
import { acceptsScreenshot, validateAnswers } from "../../shared/feedback-templates.ts";
import { loadFeedbackTemplates } from "../../shared/load-feedback-templates.ts";
import { feedbackSchema, formatIssue, targets } from "../../shared/feedback.ts";
import { githubAppConfig, installationToken } from "../../shared/github-app.ts";
import { verifyTurnstile } from "../../shared/turnstile.ts";

const configSchema = githubAppConfig.extend({
  TURNSTILE_SITE_KEY: z.string().trim().min(1),
  TURNSTILE_SECRET: z.string().trim().min(1),
  FEEDBACK_ORIGIN: z.url().refine(value => new URL(value).origin === value),
});
const requestSchema = feedbackSchema.extend({ token: z.string().min(1).max(2048) });
const json = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" },
});

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("empty");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > (request.headers.get("Content-Type")?.startsWith("multipart/form-data") ? MAX_FEEDBACK_BYTES : 64_000)) {
        await reader.cancel();
        throw new Error("large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const contentType = request.headers.get("Content-Type") ?? "";
  if (contentType.startsWith("multipart/form-data")) {
    const body = await new Response(bytes, { headers: { "Content-Type": contentType } }).formData();
    const payload = body.get("payload");
    if (typeof payload !== "string" || new TextEncoder().encode(payload).length > 64_000) throw new Error("payload");
    const files = body.getAll("screenshots");
    if (files.some(file => typeof file === "string")) throw new Error("file");
    return { input: JSON.parse(payload), files: files as File[] };
  }
  return { input: JSON.parse(new TextDecoder().decode(bytes)), files: [] as File[] };
}

export async function onRequest({ request, env }: { request: Request; env: Record<string, unknown> }) {
  if (!["GET", "POST"].includes(request.method)) {
    const response = json({ error: "不支持此请求方式" }, 405);
    response.headers.set("Allow", "GET, POST");
    return response;
  }
  const config = configSchema.safeParse(env);
  if (!config.success) return json({ error: "需求上报暂未开放，请稍后再试。" }, 503);
  const { TURNSTILE_SITE_KEY, TURNSTILE_SECRET, FEEDBACK_ORIGIN } = config.data;
  // 预览部署默认关闭，除非为其配置独立 origin 和凭据。
  if (new URL(request.url).origin !== FEEDBACK_ORIGIN) return json({ error: "此站点未开放需求上报。" }, 403);
  if (request.method === "GET") return json({ siteKey: TURNSTILE_SITE_KEY, screenshotsEnabled: Boolean(screenshotBucket(env)) });
  if (request.headers.get("Origin") !== FEEDBACK_ORIGIN) return json({ error: "请从官网表单提交。" }, 403);
  if (!["application/json", "multipart/form-data"].includes(request.headers.get("Content-Type")?.split(";")[0].trim() ?? "")) return json({ error: "请求格式不正确。" }, 415);
  let input: unknown;
  let files: File[];
  try { ({ input, files } = await readBody(request)); }
  catch { return json({ error: "内容过长或请求格式不正确。" }, 400); }
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const data = parsed.data;
  if (data.screenshotFields.length !== files.length) return json({ error: "截图字段与文件数量不符。" }, 400);
  const invalidImages = screenshotError(files);
  if (invalidImages) return json({ error: invalidImages }, 400);
  const bucket = screenshotBucket(env);
  if (files.length && !bucket) return json({ error: "截图上传暂不可用，请稍后再试或移除截图后提交。" }, 503);
  const images = [];
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const extension = imageExtension(new Uint8Array(bytes));
    if (!extension || file.type !== `image/${extension}`) return json({ error: "截图内容与图片格式不符。" }, 400);
    images.push({ bytes, extension, type: file.type });
  }
  const verification = await verifyTurnstile(TURNSTILE_SECRET, data.token, "feedback", new URL(FEEDBACK_ORIGIN).hostname);
  if (verification === "unavailable") return json({ error: "验证服务暂时不可用，请重新验证后再试。" }, 503);
  if (verification === "rejected") return json({ error: "验证已失效，请重新验证后提交。" }, 403);

  // 客户端只提供答案与版本，字段定义、必填项、标签必须重新从权威仓库读取。
  let templates: Awaited<ReturnType<typeof loadFeedbackTemplates>>;
  try { templates = await loadFeedbackTemplates(data.target, true); }
  catch { return json({ error: "暂时无法核对仓库模板，需求尚未创建，请稍后重试。" }, 503); }
  const template = templates.find(item => item.id === data.templateId);
  if (!template || template.revision !== data.templateRevision) return json({ error: "仓库模板已更新，请核对新模板的内容后再次提交。", templateChanged: true, templates }, 409);
  if (data.title.trim() === template.title.trim()) return json({ error: "请补充需求标题。" }, 400);
  const invalidAnswers = validateAnswers(template, data.answers, data.screenshotFields);
  if (invalidAnswers) return json({ error: invalidAnswers }, 400);
  for (const [index, file] of files.entries()) {
    const fieldId = data.screenshotFields[index];
    if (fieldId && !template.fields.some(field => field.id === fieldId && acceptsScreenshot(field, file.type))) return json({ error: "该字段不接受此截图格式。" }, 400);
  }

  const repo = targets[data.target].repo;
  let token: string;
  try { token = await installationToken(config.data, repo); }
  catch { return json({ error: "需求机器人暂时不可用，请稍后再试。" }, 503); }
  const keys: string[] = [];
  const cleanup = async () => {
    if (bucket && keys.length) await bucket.delete(keys.map(key => `feedback/${key}`)).catch(() => undefined);
  };
  try {
    for (const image of images) {
      const key = `${crypto.randomUUID()}.${image.extension}`;
      keys.push(key);
      if (!bucket) throw new Error("storage unavailable");
      await bucket.put(`feedback/${key}`, image.bytes, { httpMetadata: { contentType: image.type } });
    }
  } catch {
    await cleanup();
    return json({ error: "截图上传失败，需求尚未创建，请稍后重试。" }, 503);
  }
  // 不自动重试 GitHub 写请求：响应丢失时，Issue 可能已经创建。
  try {
    if (data.locale === "zh-TW") await loadTraditional();
    const response = await fetch(`https://api.github.com/repos/metasequoiaime/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "MSIME-Web-feedback",
      },
      body: JSON.stringify(formatIssue(data, template, keys.map((key, index) => ({ field: data.screenshotFields[index], url: `${FEEDBACK_ORIGIN}/api/feedback-images/${key}` })))),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      if (response.status < 500) await cleanup();
      if (response.status === 429 || response.status === 403) return json({ error: "GitHub 暂时限制提交，请稍后再试。" }, 503);
      if (response.status >= 500) throw new Error("uncertain");
      return json({ error: "GitHub 未能接收需求，请稍后再试。" }, 502);
    }
    const issue = z.object({ number: z.number().int().positive() }).parse(await response.json());
    return json({ url: `https://github.com/metasequoiaime/${repo}/issues/${issue.number}` }, 201);
  } catch {
    return json({ error: "暂时无法确认提交结果。请先查看仓库中的最新 Issue，确认未创建后再提交，避免重复。", uncertain: true, issuesUrl: `https://github.com/metasequoiaime/${repo}/issues` }, 502);
  }
}
