import { parseDocument } from "yaml";
import { z } from "zod";
import { issueTemplateSchema } from "./feedback-templates.ts";
import type { IssueTemplate } from "./feedback-templates.ts";
import { targets } from "./feedback.ts";

const headers = { Accept: "application/vnd.github+json", "User-Agent": "MSIME-Web-feedback", "X-GitHub-Api-Version": "2022-11-28" };
const directorySchema = z.array(z.object({ name: z.string(), path: z.string(), sha: z.string().regex(/^[a-f0-9]{40}$/), type: z.string() })).max(100);
const sourceSchema = z.object({
  name: z.string(), description: z.string().optional(), title: z.string().optional(),
  labels: z.union([z.string(), z.array(z.string())]).optional(), type: z.string().optional(),
  body: z.array(z.object({
    id: z.string().regex(/^[\w-]+$/).optional(), type: z.string(),
    attributes: z.record(z.string(), z.unknown()),
    validations: z.object({ required: z.boolean().optional(), accept: z.string().optional() }).optional(),
  })).min(1).max(50),
});
async function github(path: string, fresh: boolean) {
  const options: RequestInit & { cf: { cacheEverything: boolean; cacheTtl: number } } = {
    headers, signal: AbortSignal.timeout(10_000), cf: { cacheEverything: true, cacheTtl: fresh ? 0 : 300 },
  };
  return fetch(`https://api.github.com/repos/metasequoiaime/${path}`, options);
}
export function parseTemplate(source: string, metadata: { id: string; revision: string; sourceUrl: string }): IssueTemplate {
  if (source.length > 64_000) throw new Error("template too large");
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length) throw new Error("invalid YAML");
  const raw = sourceSchema.parse(document.toJS({ maxAliasCount: 50 }));
  const template = issueTemplateSchema.parse({
    ...metadata, name: raw.name, description: raw.description, title: raw.title,
    labels: typeof raw.labels === "string" ? raw.labels.split(",").map(label => label.trim()).filter(Boolean) : raw.labels,
    issueType: raw.type,
    fields: raw.body.map((field, index) => ({
      ...field.attributes, id: field.id ?? `field-${index}`, type: field.type,
      required: field.validations?.required, accept: field.validations?.accept,
      options: Array.isArray(field.attributes.options) ? field.attributes.options.map(option => typeof option === "string" ? { label: option } : option) : undefined,
    })),
  });
  const ids = template.fields.map(field => field.id);
  if (new Set(ids).size !== ids.length) throw new Error("duplicate field id");
  for (const field of template.fields) {
    if (field.type !== "markdown" && (!field.label || /[\r\n]/.test(field.label))) throw new Error("missing field label");
    if (["dropdown", "checkboxes"].includes(field.type) && (!field.options.length || new Set(field.options.map(option => option.label)).size !== field.options.length)) throw new Error("invalid options");
    if (field.default !== undefined && field.default >= field.options.length) throw new Error("invalid default");
  }
  return template;
}

export async function loadFeedbackTemplates(target: keyof typeof targets, fresh = false) {
  let repo: string = targets[target].repo;
  let response = await github(`${repo}/contents/.github/ISSUE_TEMPLATE`, fresh);
  // 仅在本仓没有模板目录时继承组织默认；网络错误不能伪装成缺少模板。
  if (response.status === 404) { repo = ".github"; response = await github(`${repo}/contents/.github/ISSUE_TEMPLATE`, fresh); }
  if (!response.ok) throw new Error("template directory unavailable");
  const files = directorySchema.parse(await response.json()).filter(file => file.type === "file" && /\.ya?ml$/i.test(file.name) && !/^config\.ya?ml$/i.test(file.name));
  if (files.length > 20) throw new Error("too many templates");
  const templates = await Promise.all(files.map(async file => {
    if (file.path !== `.github/ISSUE_TEMPLATE/${file.name}` || file.name.includes("/")) throw new Error("invalid path");
    // 用目录给出的 blob SHA 读取精确内容，避免目录与正文来自两个版本。
    const blob = await github(`${repo}/git/blobs/${file.sha}`, fresh);
    if (!blob.ok) throw new Error("template unavailable");
    const data = z.object({ content: z.string().max(100_000), encoding: z.literal("base64"), size: z.number().max(64_000) }).parse(await blob.json());
    const source = new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\s/g, "")), char => char.charCodeAt(0)));
    return parseTemplate(source, { id: `${repo}/${file.name}`, revision: file.sha, sourceUrl: `https://github.com/metasequoiaime/${repo}/blob/HEAD/${file.path}` });
  }));
  if (!templates.length) throw new Error("no supported templates");
  // 优先展示功能建议；没有时保留仓库实际提供的模板，用户可自行选择。
  return templates.sort((a, b) => Number(b.labels.includes("enhancement")) - Number(a.labels.includes("enhancement")) || a.name.localeCompare(b.name));
}
