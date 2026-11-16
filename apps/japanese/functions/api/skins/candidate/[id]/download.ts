import { candidateSkinArchive } from "../../../../../src/skins/candidate-archive.ts";
import { communitySkinIdSchema } from "../../../../../src/data/schemas.ts";
import { sameOrigin, withSession, type SessionContext } from "../../../../../shared/site-session.ts";

/** 由原生表单提交下载附件，使异步请求和打包不再丢失下载所需的用户点击手势。 */
export async function serveCandidateDownload({ request, env, params }: SessionContext & { params: { id: string } }, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const id = communitySkinIdSchema.safeParse(params.id);
  if (!id.success) return new Response(null, { status: 404 });
  const response = await withSession(env, request, { method: "POST", path: `/v1/community/candidate-skins/${id.data}/download` }, fetcher);
  if (!response.ok) return response;
  try {
    const archive = candidateSkinArchive(await response.json(), id.data);
    const headers = new Headers({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${archive.filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const cookie of response.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
    return new Response(archive.bytes, { status: 200, headers });
  } catch {
    const error = Response.json({ error: "invalid_skin_package" }, { status: 502, headers: { "Cache-Control": "no-store" } });
    for (const cookie of response.headers.getSetCookie()) error.headers.append("Set-Cookie", cookie);
    return error;
  }
}

export const onRequest = (context: SessionContext & { params: { id: string } }) => serveCandidateDownload(context);
