import { traditionalMarkdown } from "./translate.ts";
import { z } from "zod";
import type { IssueTemplate, Screenshot } from "./feedback-templates.ts";

export const targets = {
  windows: { label: "Windows 输入法", repo: "MSIME-Windows" },
  // MSIME-Apple 改名为 msime 并成为多平台仓库；MSIME-Linux 与 MSIME-Engine 已归档并关闭 Issues，Linux 前端和公共引擎的开发与反馈都并入 msime。
  apple: { label: "macOS / iOS 输入法", repo: "msime" },
  linux: { label: "Linux 输入法", repo: "msime" },
  engine: { label: "公共引擎、输入方案与词库", repo: "msime" },
  backend: { label: "公共 API", repo: "MSIME-Backend" },
  docs: { label: "使用文档", repo: "MSIME-Docs" },
  web: { label: "官网", repo: "MSIME-Web" },
} as const;
export const targetSchema = z.enum(["windows", "apple", "linux", "engine", "backend", "docs", "web"]);
export const contactFields = [
  { name: "qq", label: "QQ 号码", placeholder: "QQ 号码", type: "text", max: 100 },
  { name: "qqNickname", label: "QQ 昵称", placeholder: "QQ 显示昵称", type: "text", max: 100 },
  { name: "wechat", label: "微信", placeholder: "微信号", type: "text", max: 100 },
  { name: "github", label: "GitHub 用户名", placeholder: "例如 octocat，无需 @ 或链接", type: "text", max: 39 },
  { name: "email", label: "Email", placeholder: "name@example.com", type: "email", max: 254 },
] as const;
const contactText = (max: number) => z.string().trim().max(max, `联系方式最多 ${max} 个字`).refine(value => !/[\r\n]/.test(value), "联系方式不能换行").default("");
export const feedbackSchema = z.object({
  locale: z.enum(["zh-CN", "zh-TW"]).optional(),
  target: targetSchema,
  title: z.string().trim().min(5, "请用至少 5 个字概括需求").max(100, "标题最多 100 个字").refine(value => !/[\r\n]/.test(value), "标题不能换行"),
  templateId: z.string().min(1).max(300),
  templateRevision: z.string().regex(/^[a-f0-9]{40}$/),
  answers: z.record(z.string().max(100), z.union([z.string().max(6000), z.array(z.string().max(2000)).max(100)])).refine(value => Object.keys(value).length <= 50, "表单字段过多"),
  screenshotFields: z.array(z.string().max(100)).max(3).default([]),
  qq: contactText(100),
  qqNickname: contactText(100),
  wechat: contactText(100),
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
  const contacts = contactFields.filter(field => field.name !== "qq" && field.name !== "qqNickname").flatMap(field => {
    const value = data[field.name]?.trim();
    return value ? [`| ${label(field.label)} | ${contactLiteral(value)} |`] : [];
  });
  const qq = [data.qq?.trim(), data.qqNickname?.trim()].filter((value): value is string => Boolean(value)).map(contactLiteral);
  if (qq.length) contacts.unshift(`| QQ | ${qq.join(" · ")} |`);
  return {
    title: data.title.replaceAll("@", "@\u200b"),
    labels: template.labels,
    ...(template.issueType ? { type: template.issueType } : {}),
    body: [
      ...sections,
      ...(screenshots.some(image => !image.field) ? [label("### 截图"), screenshots.filter(image => !image.field).map((image, i) => `![${label("截图")} ${i + 1}](${image.url})`).join("\n\n")] : []),
      ...(contacts.length ? [label("### 联系方式"), [label("| 渠道 | 联系方式 |"), "| --- | --- |", ...contacts].join("\n"), label("*联系方式由提交者自愿公开，未经验证。*")] : []),
      "---", label(`由[官网需求表单](https://msime.app/${data.locale === "zh-TW" ? "zh-TW/" : ""}feedback/)自动创建 · ${targets[data.target].label}。提交者已同意公开以上内容，需求待维护者评估。`),
    ].join("\n\n"),
  };
}
