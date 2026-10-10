import { traditionalMarkdown } from "./translate.ts";
import { z } from "zod";
import type { SitePlatform } from "../src/data/platforms.ts";
import type { IssueTemplate, Screenshot } from "./feedback-templates.ts";

// MSIME-Apple 改名为 msime 并成为多平台仓库；MSIME-Linux 与 MSIME-Engine 已归档并关闭 Issues，Linux 前端和公共引擎的开发与反馈都并入 msime。官网面向普通用户，只按输入法平台分流（与站点六个平台一致，同一仓库的平台也分开选，Issue 正文首节写明平台，共用仓库的平台另打 platform/* 标签；Web 引擎不是输入法，不在其列），引擎、API、文档和官网的问题留给贡献者直接去 GitHub 提。
export const targets = {
  windows: { label: "Windows 输入法", repo: "MSIME-Windows" },
  macos: { label: "macOS 输入法", repo: "msime", issueLabel: "platform/macos" },
  linux: { label: "Linux 输入法", repo: "msime", issueLabel: "platform/linux" },
  android: { label: "Android 输入法", repo: "msime", issueLabel: "platform/android" },
  ios: { label: "iOS 输入法", repo: "msime", issueLabel: "platform/ios" },
  harmony: { label: "HarmonyOS 输入法", repo: "msime", issueLabel: "platform/harmony" },
} as const satisfies Partial<Record<SitePlatform, { label: string; repo: string; issueLabel?: string }>>;
export const targetSchema = z.enum(["windows", "macos", "linux", "android", "ios", "harmony"]);
export const contactFields = [
  { name: "github", label: "GitHub 用户名", placeholder: "例如 octocat，无需 @ 或链接", type: "text", max: 39 },
  { name: "email", label: "Email", placeholder: "name@example.com", type: "email", max: 254 },
] as const;
export const feedbackSchema = z.object({
  locale: z.enum(["zh-CN", "zh-TW"]).optional(),
  target: targetSchema,
  title: z.string().trim().min(5, "请用至少 5 个字概括需求").max(100, "标题最多 100 个字").refine(value => !/[\r\n]/.test(value), "标题不能换行"),
  templateId: z.string().min(1).max(300),
  templateRevision: z.string().regex(/^[a-f0-9]{40}$/),
  answers: z.record(z.string().max(100), z.union([z.string().max(6000), z.array(z.string().max(2000)).max(100)])).refine(value => Object.keys(value).length <= 50, "表单字段过多"),
  screenshotFields: z.array(z.string().max(100)).max(3).default([]),
  github: z.string().trim().max(39, "GitHub 用户名最多 39 个字符").refine(value => value === "" || /^[a-z\d]+(?:-[a-z\d]+)*$/i.test(value), "请填写 GitHub 用户名，无需 @ 或个人主页链接").default(""),
  email: z.string().trim().max(254, "Email 最多 254 个字符").refine(value => value === "" || z.email().safeParse(value).success, "请填写有效的 Email 地址").default(""),
  consent: z.literal(true, { error: "请确认内容将公开发布到 GitHub" }),
});
export type Feedback = z.infer<typeof feedbackSchema>;

// 保留用户 Markdown 的段落和列表；打断 @ 提及，避免匿名表单触发批量通知。
const content = (value: string) => value.trim().replaceAll("@", "@\u200b");
// 联系方式按代码字面量展示，保留可复制的 @，也不触发 GitHub 提及或解释 Markdown。
const contactLiteral = (value: string) => {
  const delimiter = "`".repeat(Math.max(0, ...(value.match(/`+/g) ?? []).map(part => part.length)) + 1);
  return `${delimiter} ${value.replaceAll("|", "\\|")} ${delimiter}`;
};
export function formatIssue(data: Feedback, template: IssueTemplate, screenshots: Screenshot[] = []) {
  const label = (text: string) => data.locale === "zh-TW" ? traditionalMarkdown(text) : text;
  const sections = template.fields.filter(field => field.type !== "markdown").flatMap(field => {
    const value = data.answers[field.id];
    let answer = typeof value === "string" ? content(value) : Array.isArray(value) ? value.map(item => content(label(item))).join(", ") : "";
    if (field.type === "checkboxes") answer = field.options.map(option => `- [${Array.isArray(value) && value.includes(option.label) ? "x" : " "}] ${content(label(option.label))}`).join("\n");
    if (field.render && answer) {
      const fence = "`".repeat(Math.max(3, ...[...(answer.matchAll(/`+/g))].map(match => match[0].length + 1)));
      answer = `${fence}${field.render}\n${answer}\n${fence}`;
    }
    const attached = screenshots.filter(image => image.field === field.id).map((image, i) => `![${label("截图")} ${i + 1}](${image.url})`);
    return [`### ${content(label(field.label))}`, [answer, ...attached].filter(Boolean).join("\n\n") || "_No response_"];
  });
  const contacts = contactFields.flatMap(field => {
    const value = data[field.name]?.trim();
    return value ? [`| ${label(field.label)} | ${contactLiteral(value)} |`] : [];
  });
  // 模板的标题前缀（如 "[Bug]:"）只在仓库里有意义，表单不让用户看到它，创建 Issue 时再补上；旧草稿里已带前缀的不重复添加。
  const title = data.title.trim();
  const prefix = template.title.trim();
  // msime 一个仓库承载多个平台，仓库模板里没有平台字段；平台由表单的归属选择决定，写成正文首节并打上仓库已有的 platform/* 标签，维护者不用翻到页脚才知道是哪个平台。
  const target = targets[data.target];
  return {
    title: (!title || !prefix || title.startsWith(prefix) ? title : `${prefix} ${title}`).replaceAll("@", "@\u200b"),
    labels: "issueLabel" in target && !template.labels.includes(target.issueLabel) ? [...template.labels, target.issueLabel] : template.labels,
    ...(template.issueType ? { type: template.issueType } : {}),
    body: [
      label("### 平台"), label(target.label),
      ...sections,
      ...(screenshots.some(image => !image.field) ? [label("### 截图"), screenshots.filter(image => !image.field).map((image, i) => `![${label("截图")} ${i + 1}](${image.url})`).join("\n\n")] : []),
      ...(contacts.length ? [label("### 联系方式"), [label("| 渠道 | 联系方式 |"), "| --- | --- |", ...contacts].join("\n"), label("*联系方式由提交者自愿公开，未经验证。*")] : []),
      "---", label(`由[官网需求表单](https://msime.app/${data.locale === "zh-TW" ? "zh-TW/" : ""}feedback/)自动创建 · ${target.label}。提交者已同意公开以上内容，需求待维护者评估。`),
    ].join("\n\n"),
  };
}
