import { traditionalMarkdown } from "../shared/translate";
import { useLocale } from "./use-locale";
import type { ReactNode } from "react";
import { MAX_ANSWER_LENGTH } from "../shared/feedback-templates";
import type { Answers, IssueTemplate } from "../shared/feedback-templates";
import { markdown } from "./markdown";
import { cx } from "./ui";
import { checkClass, fieldLabelClass, hintClass, inputClass, markdownClass, optionRowClass, requiredMarkClass, textareaClass } from "./feedback/styles";

export function TemplateMarkdown({ source, inline = false, className }: { source: string; inline?: boolean; className?: string }) {
  const { tw } = useLocale();
  const text = tw ? traditionalMarkdown(source) : source;
  const html = inline ? markdown.renderInline(text) : markdown.render(text);
  const Tag = inline ? "span" : "div";
  // biome-ignore lint/security/noDangerouslySetInnerHtml: markdown-it 禁用 HTML 透传并校验链接协议。
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function FeedbackFields({ template, answers, onChange, upload }: {
  template: IssueTemplate;
  answers: Answers;
  onChange: (id: string, value: string | string[]) => void;
  upload: (id: string) => ReactNode;
}) {
  const { t } = useLocale();
  return template.fields.map(field => {
    if (field.type === "markdown") return <TemplateMarkdown key={field.id} source={field.value} className={cx(markdownClass, "mt-5 rounded-field bg-panel-2 px-4 py-3 text-[13.5px] leading-[1.75]")} />;
    const selected = Array.isArray(answers[field.id]) ? answers[field.id] as string[] : [];
    const text = typeof answers[field.id] === "string" ? answers[field.id] as string : "";
    const toggle = (label: string, checked: boolean) => onChange(field.id, checked ? [...selected, label] : selected.filter(item => item !== label));
    const id = `answer-${field.id}`;
    const hint = `${id}-hint`;
    const required = field.required || field.options.some(option => option.required);
    const label = <>
      {t(field.label)}
      {required
        ? <><span className={requiredMarkClass} aria-hidden="true">*</span><span className="sr-only">{t("（必填）")}</span></>
        : <span className="ml-1 text-[13px] text-muted">{t("（可选）")}</span>}
    </>;
    const choiceHint = field.type === "dropdown" ? (field.multiple ? "可选择多项" : "请选择一项") : field.type === "checkboxes" ? (field.options.some(option => option.required) ? "请逐项阅读并确认带 * 的项目" : "可选择多项，也可以跳过") : "";
    const description = <div id={hint} className={cx(hintClass, "mt-1 empty:hidden")}>
      {field.description && <TemplateMarkdown source={field.description} className={cx(markdownClass, "text-[13.5px] leading-[1.75] text-muted")} />}
      {choiceHint && <span className="block">{t(choiceHint)}</span>}
    </div>;
    if (field.type === "checkboxes" || (field.type === "dropdown" && field.multiple)) return <fieldset className="m-0 mt-5 min-w-0 border-0 p-0" key={field.id} data-feedback-field={field.id} aria-describedby={hint}>
      <legend className={cx(fieldLabelClass, "p-0")}>{label}</legend>{description}
      <div className="mt-2.5 grid gap-2">
        {field.options.map(option => <label className={optionRowClass} key={option.label}>
          <input className={checkClass} type="checkbox" checked={selected.includes(option.label)} required={field.type === "checkboxes" && option.required} onChange={event => toggle(option.label, event.target.checked)} />
          <span className="min-w-0 [overflow-wrap:anywhere]"><TemplateMarkdown source={option.label} inline />{option.required && <span className={requiredMarkClass} aria-hidden="true">*</span>}</span>
        </label>)}
      </div>
    </fieldset>;
    if (field.type === "dropdown") return <fieldset className="m-0 mt-5 min-w-0 border-0 p-0" key={field.id} data-feedback-field={field.id} aria-describedby={hint}>
      <legend className={cx(fieldLabelClass, "p-0")}>{label}</legend>{description}
      <div className="mt-2.5 grid gap-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
        {field.options.map(option => <label className={optionRowClass} key={option.label}>
          <input className={checkClass} type="radio" name={id} value={option.label} checked={selected[0] === option.label} required={field.required} onChange={() => onChange(field.id, [option.label])} />
          <span className="min-w-0 [overflow-wrap:anywhere]">{t(option.label)}</span>
        </label>)}
      </div>
      {!field.required && selected.length > 0 && <button type="button" className="mt-2 min-h-9 rounded-tab bg-transparent px-2 text-[13.5px] text-accent-ink hover:bg-panel-2" onClick={() => onChange(field.id, [])}>{t("清除选择")}</button>}
    </fieldset>;
    return <div className="mt-5" key={field.id} data-feedback-field={field.id}>
      <label className={fieldLabelClass} htmlFor={field.type === "upload" ? `screenshots-${field.id}` : id}>{label}</label>{description}
      {field.type === "input" && <input className={inputClass} id={id} value={text} maxLength={MAX_ANSWER_LENGTH} required={field.required} aria-describedby={hint} placeholder={t(field.placeholder)} onChange={event => onChange(field.id, event.target.value)} />}
      {field.type === "textarea" && <textarea className={textareaClass} id={id} value={text} maxLength={MAX_ANSWER_LENGTH} rows={4} required={field.required} aria-describedby={hint} placeholder={t(field.placeholder)} onChange={event => onChange(field.id, event.target.value)} />}
      {field.type === "upload" && upload(field.id)}
    </div>;
  });
}
