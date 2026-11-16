import { targetSchema } from "../../shared/feedback.ts";
import { loadFeedbackTemplates } from "../../shared/load-feedback-templates.ts";

export async function onRequest({ request }: { request: Request }) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (request.method !== "GET") return Response.json({ error: "不支持此请求方式" }, { status: 405, headers: { ...headers, Allow: "GET" } });
  const target = targetSchema.safeParse(new URL(request.url).searchParams.get("target"));
  if (!target.success) return Response.json({ error: "请选择需求归属。" }, { status: 400, headers });
  try { return Response.json({ templates: await loadFeedbackTemplates(target.data) }, { headers }); }
  catch { return Response.json({ error: "暂时无法读取仓库模板，请重试或前往 GitHub 提交。" }, { status: 503, headers }); }
}
