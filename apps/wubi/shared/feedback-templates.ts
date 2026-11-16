import { z } from "zod";

const text = z.string().max(12_000);
const option = z.object({ label: z.string().min(1).max(2000), required: z.boolean().default(false) });
export const templateFieldSchema = z.object({
  id: z.string().regex(/^[\w-]+$/),
  type: z.enum(["markdown", "input", "textarea", "dropdown", "checkboxes", "upload"]),
  label: z.string().max(500).default(""),
  description: text.default(""),
  placeholder: text.default(""),
  value: text.default(""),
  render: z.string().regex(/^[\w+.#-]*$/).default(""),
  required: z.boolean().default(false),
  multiple: z.boolean().default(false),
  options: z.array(option).max(100).default([]),
  default: z.number().int().nonnegative().optional(),
  accept: z.string().max(1000).default(""),
});
export const issueTemplateSchema = z.object({
  id: z.string().min(1).max(300),
  revision: z.string().regex(/^[a-f0-9]{40}$/),
  sourceUrl: z.url(),
  name: z.string().min(1).max(300),
  description: text.default(""),
  title: z.string().max(256).default(""),
  labels: z.array(z.string().min(1).max(100)).max(30).default([]),
  issueType: z.string().max(100).optional(),
  fields: z.array(templateFieldSchema).min(1).max(50),
});
export type IssueTemplate = z.infer<typeof issueTemplateSchema>;
export type TemplateField = z.infer<typeof templateFieldSchema>;
export type Answers = Record<string, string | string[]>;
export type Screenshot = { field: string; url: string };
export const MAX_ANSWER_LENGTH = 6000;

export function initialAnswers(template: IssueTemplate): Answers {
  return Object.fromEntries(template.fields.filter(field => field.type !== "markdown" && field.type !== "upload").map(field => [field.id,
    field.type === "checkboxes" ? [] : field.type === "dropdown" ? (field.default === undefined ? [] : [field.options[field.default].label]) : field.value,
  ]));
}
export function canAttach(field: TemplateField) {
  return field.type === "upload" || (field.type === "textarea" && !field.render);
}
export function acceptsScreenshot(field: TemplateField, type: string) {
  if (!canAttach(field)) return false;
  if (field.type !== "upload" || !field.accept) return true;
  const extensions = type === "image/jpeg" ? [".jpg", ".jpeg"] : [type === "image/png" ? ".png" : ".webp"];
  return field.accept.toLowerCase().split(",").some(value => extensions.includes(value.trim()));
}
export function validateAnswers(template: IssueTemplate, answers: Answers, screenshotFields: string[] = []): string | undefined {
  if (Object.keys(answers).some(id => !template.fields.some(field => field.id === id && field.type !== "markdown" && field.type !== "upload"))) return "表单包含已不在模板中的字段，请重新选择模板。";
  if (screenshotFields.some(id => id !== "" && !template.fields.some(field => field.id === id && canAttach(field)))) return "截图所属字段已变化，请重新选择。";
  for (const field of template.fields) {
    if (field.type === "markdown") continue;
    const value = answers[field.id];
    const attached = screenshotFields.includes(field.id);
    if (field.type === "upload") {
      if (field.required && !attached) return `请上传：${field.label}`;
    } else if (field.type === "input" || field.type === "textarea") {
      if (value !== undefined && typeof value !== "string") return `${field.label}的内容格式不正确。`;
      const text = typeof value === "string" ? value.trim() : "";
      if (field.required && !text && !attached) return `请填写：${field.label}`;
      if (text.length > MAX_ANSWER_LENGTH) return `${field.label}最多 ${MAX_ANSWER_LENGTH} 个字。`;
      if (field.type === "input" && /[\r\n]/.test(text)) return `${field.label}不能换行。`;
    } else {
      if (value !== undefined && !Array.isArray(value)) return `请选择：${field.label}`;
      const selected = Array.isArray(value) ? value : [];
      if (new Set(selected).size !== selected.length || selected.some(item => !field.options.some(option => option.label === item))) return `${field.label}的选项已变化，请重新选择。`;
      if (field.type === "dropdown" && !field.multiple && selected.length > 1) return `${field.label}只能选择一项。`;
      if (field.required && !selected.length) return `请选择：${field.label}`;
      if (field.type === "checkboxes" && field.options.some(option => option.required && !selected.includes(option.label))) return `请完成确认：${field.label}`;
    }
  }
}
