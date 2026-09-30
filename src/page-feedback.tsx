import { usePageSearch } from "./use-page-search";
import { useLocale } from "./use-locale";
import { acceptsScreenshot, canAttach, initialAnswers, issueTemplateSchema, validateAnswers } from "../shared/feedback-templates";
import type { Answers, IssueTemplate } from "../shared/feedback-templates";
import { ScreenshotViewer } from "./screenshot-viewer";
import { FeedbackFields } from "./feedback-fields";
import { screenshotError } from "../shared/feedback-images";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { contactFields, feedbackSchema, formatIssue, targets } from "../shared/feedback";
import type { Feedback } from "../shared/feedback";
import { usePageMeta } from "./page-meta";
import { markdown } from "./markdown";
import { FeedbackResponseError, readFeedbackResponse } from "./feedback-response";
import { loadTurnstile } from "./turnstile";
import "./feedback.scss";

const emptyForm: Feedback = { target: "windows", title: "", templateId: "", templateRevision: "", answers: {}, screenshotFields: [], qq: "", qqNickname: "", wechat: "", github: "", email: "", consent: true };
type LocalScreenshot = { id: string; field: string; file: File; url: string };
type Draft = { title: string; answers: Answers; screenshots: LocalScreenshot[] };

export function FeedbackPage() {
  const { t, tw, href } = useLocale();
  usePageMeta("问题与建议 | 水杉输入法", "反馈问题或提出建议，提交内容将公开发布到 GitHub。");
  const { get, choice, update } = usePageSearch();
  const targetResult = feedbackSchema.shape.target.safeParse(get("target"));
  const requestedTarget = targetResult.success ? targetResult.data : "windows";
  const requestedTemplate = get("template");
  const [form, setForm] = useState<Feedback>(() => ({ ...emptyForm, target: requestedTarget, templateId: requestedTemplate }));
  const [screenshots, setScreenshots] = useState<LocalScreenshot[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const previewBody = useRef<HTMLDivElement>(null);
  const [screenshotsEnabled, setScreenshotsEnabled] = useState<boolean | null>(null);
  const [readingImages, setReadingImages] = useState(false);
  const [imageError, setImageError] = useState("");
  const [catalog, setCatalog] = useState<{ target: string; templates: IssueTemplate[] }>({ target: "", templates: [] });
  const [templateError, setTemplateError] = useState("");
  const [templateLoading, setTemplateLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const tab = choice("tab", ["edit", "preview"] as const, "edit");
  const setTab = (value: "edit" | "preview") => update({ tab: value });
  const drafts = useRef<Record<string, Draft>>({});
  const template = catalog.target === form.target ? catalog.templates.find(item => item.id === form.templateId) : undefined;
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("正在加载提交验证…");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [issueUrl, setIssueUrl] = useState("");
  const [uncertainUrl, setUncertainUrl] = useState("");
  const widget = useRef<HTMLDivElement>(null);
  const successPanel = useRef<HTMLElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const submitting = useRef(false);

  const saveDraft = () => {
    if (form.templateId) drafts.current[`${form.target}:${form.templateId}`] = { title: form.title, answers: form.answers, screenshots };
  };
  function chooseTemplate(next: IssueTemplate, target = form.target) {
    const draft = drafts.current[`${target}:${next.id}`];
    const answers = initialAnswers(next);
    if (draft) for (const field of next.fields) {
      const value = draft.answers[field.id];
      if ((field.type === "input" || field.type === "textarea") && typeof value === "string") answers[field.id] = value;
      else if ((field.type === "dropdown" || field.type === "checkboxes") && Array.isArray(value)) answers[field.id] = value.filter(item => field.options.some(option => option.label === item));
    }
    setForm(previous => ({ ...previous, target, title: draft?.title ?? next.title, templateId: next.id, templateRevision: next.revision, answers }));
    setScreenshots((draft?.screenshots ?? []).map(image => ({ ...image, field: image.field && !next.fields.some(field => field.id === image.field && acceptsScreenshot(field, image.file.type)) ? "" : image.field })));
    setError("");
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: URL navigation restores selection; editing a draft must not reselect its template.
  useEffect(() => {
    if (requestedTarget !== form.target) {
      saveDraft();
      setForm(previous => ({ ...previous, target: requestedTarget, templateId: requestedTemplate, templateRevision: "", answers: {} }));
      setScreenshots([]);
      setImageError("");
      setError("");
    } else if (catalog.target === requestedTarget && catalog.templates.length) {
      const next = catalog.templates.find(item => item.id === requestedTemplate) ?? catalog.templates[0];
      if (next.id !== form.templateId) { saveDraft(); chooseTemplate(next); }
    }
  }, [requestedTarget, requestedTemplate, catalog]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 只在仓库或刷新次数变化时加载，模板选择与输入不触发请求。
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setTemplateLoading(true);
    setTemplateError("");
    async function load() {
      try {
        const response = await fetch(`/api/feedback-templates?target=${form.target}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]) });
        const data = await readFeedbackResponse(response, "模板服务暂不可用，请重新加载，或前往 GitHub 提交。");
        if (!response.ok) throw new Error(data.error || "无法读取仓库模板。");
        const templates = issueTemplateSchema.array().min(1).parse(data.templates);
        if (!active) return;
        setCatalog({ target: form.target, templates });
        chooseTemplate(templates.find(item => item.id === form.templateId) ?? templates[0], form.target);
      } catch (reason) {
        if (active) setTemplateError(reason instanceof Error ? reason.message : "无法读取仓库模板。");
      } finally { if (active) setTemplateLoading(false); }
    }
    void load();
    return () => { active = false; controller.abort(); };
    // 只在切换仓库或手动刷新时加载；输入和切换 Tab 不重新请求模板。
  }, [form.target, reload]);

  useEffect(() => {
    if (issueUrl) {
      successPanel.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [issueUrl]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function setup() {
      try {
        const response = await fetch("/api/feedback", { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
        const config = await readFeedbackResponse(response, "提交服务暂不可用，请稍后刷新重试。");
        if (!response.ok || typeof config.siteKey !== "string") throw new Error(config.error || "反馈提交暂未开放，请稍后再试。");
        if (active) setScreenshotsEnabled(config.screenshotsEnabled === true);
        const api = await loadTurnstile();
        if (!active || !widget.current) return;
        widgetId.current = api.render(widget.current, {
          sitekey: config.siteKey,
          action: "feedback",
          size: "compact",
          language: tw ? "zh-TW" : "zh-CN",
          callback: value => { if (active) { setToken(value); setStatus("验证通过，可以提交。"); } },
          "expired-callback": () => { if (active) { setToken(""); setStatus("验证已过期，请重新验证。"); } },
          "error-callback": () => { if (active) { setToken(""); setStatus("验证失败，请检查网络后重新验证。"); } },
        });
        setStatus("请完成下方验证。");
      } catch (reason) {
        if (active) setScreenshotsEnabled(previous => previous ?? false);
        if (active) setStatus(reason instanceof Error && reason.message !== "Unexpected end of JSON input" && !reason.message.startsWith("Unexpected token") ? reason.message : "提交服务暂不可用，请稍后刷新重试。");
      }
    }
    void setup();
    return () => {
      active = false;
      controller.abort();
      if (widgetId.current !== undefined) window.turnstile?.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [tw]);

  async function addScreenshots(files: File[], field = "") {
    const targetField = template?.fields.find(item => item.id === field);
    if (field && (!targetField || files.some(file => !acceptsScreenshot(targetField, file.type)))) { setImageError("该字段不接受此截图格式。"); return; }
    const invalid = screenshotError([...screenshots.map(item => item.file), ...files]);
    if (invalid) { setImageError(invalid); return; }
    setImageError("");
    setReadingImages(true);
    try {
      const added = await Promise.all(files.map(file => new Promise<LocalScreenshot>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ id: crypto.randomUUID(), field, file, url: String(reader.result) });
        reader.onerror = () => reject(new Error("截图读取失败，请重新选择。"));
        reader.readAsDataURL(file);
      })));
      setScreenshots(previous => [...previous, ...added]);
    } catch { setImageError("截图读取失败，请重新选择。"); }
    finally { setReadingImages(false); }
  }

  function showValidation(message: string, selector: string) {
    setError(message);
    setTab("edit");
    requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(selector);
      const details = element?.closest("details");
      if (details) details.open = true;
      element?.focus({ preventScroll: true });
      element?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || readingImages || issueUrl) return;
    setError("");
    setUncertainUrl("");
    if (!template || templateLoading || templateError) { setError("请先加载仓库模板。"); return; }
    const result = feedbackSchema.safeParse({ ...form, locale: tw ? "zh-TW" : "zh-CN", consent, screenshotFields: screenshots.map(image => image.field) });
    if (!result.success) {
      const issue = result.error.issues[0];
      const name = String(issue.path[0]);
      const field = ["title", "consent", ...contactFields.map(item => item.name)].includes(name) ? name : "title";
      showValidation(issue.message, `[name="${field}"]`);
      return;
    }
    const invalidAnswers = validateAnswers(template, result.data.answers, result.data.screenshotFields);
    if (form.title.trim() === template.title.trim()) { showValidation("请补充反馈标题。", '[name="title"]'); return; }
    if (invalidAnswers) {
      const invalidField = template.fields.find(field => validateAnswers({ ...template, fields: [field] }, form.answers[field.id] === undefined ? {} : { [field.id]: form.answers[field.id] }, screenshots.filter(image => image.field === field.id).map(image => image.field)));
      showValidation(invalidAnswers, invalidField ? `[data-feedback-field="${invalidField.id}"] input:not([type="file"]), [data-feedback-field="${invalidField.id}"] textarea, [data-feedback-field="${invalidField.id}"] button` : '[name="title"]');
      return;
    }
    if (!token) { showValidation("请先完成提交验证。", ".feedback-verification"); return; }
    submitting.current = true;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("payload", JSON.stringify({ ...result.data, token }));
      screenshots.forEach(({ file }) => { body.append("screenshots", file); });
      const response = await fetch("/api/feedback", {
        method: "POST", body, signal: AbortSignal.timeout(60_000),
      });
      const data = await readFeedbackResponse(response, "无法确认提交结果，请先查看最新 Issue。");
      if (!response.ok) {
        if (data.templateChanged) {
          saveDraft();
          const updated = issueTemplateSchema.array().min(1).safeParse(data.templates);
          if (updated.success) {
            setCatalog({ target: form.target, templates: updated.data });
            chooseTemplate(updated.data.find(item => item.id === form.templateId) ?? updated.data[0]);
            setTemplateError("");
          } else setTemplateError("仓库模板已更新，请重新加载模板并核对内容后提交。");
          setTab("edit");
        }
        if (data.uncertain) setUncertainUrl(`https://github.com/metasequoiaime/${targets[form.target].repo}/issues`);
        throw new Error(data.error || "提交失败，请稍后再试。");
      }
      const expectedPrefix = `https://github.com/metasequoiaime/${targets[form.target].repo}/issues/`;
      if (typeof data.url !== "string" || !data.url.startsWith(expectedPrefix) || !/^\d+$/.test(data.url.slice(expectedPrefix.length))) throw new FeedbackResponseError("无法确认 Issue 地址，请查看目标仓库。");
      setIssueUrl(data.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "提交失败，请稍后再试。");
      // 网络中断时无法判断 GitHub 是否已创建；保留表单并提供查重入口。
      if (reason instanceof FeedbackResponseError || reason instanceof TypeError || (reason instanceof DOMException && ["TimeoutError", "AbortError"].includes(reason.name))) {
        setError("未收到有效的提交结果。请先查看最新 Issue，确认未创建后再提交。");
        setUncertainUrl(`https://github.com/metasequoiaime/${targets[form.target].repo}/issues`);
      }
    } finally {
      setToken("");
      if (widgetId.current !== undefined) window.turnstile?.reset(widgetId.current);
      setBusy(false);
      submitting.current = false;
    }
  }

  const requiredFields = template?.fields.filter(field => field.required || field.options.some(option => option.required)) ?? [];
  const completedFields = requiredFields.filter(field => template && !validateAnswers({ ...template, fields: [field] }, form.answers[field.id] === undefined ? {} : { [field.id]: form.answers[field.id] }, screenshots.filter(image => image.field === field.id).map(image => image.field))).length;
  const titleComplete = form.title.trim().length >= 5 && form.title.trim() !== template?.title.trim();
  const previewIssue = template ? formatIssue({ ...form, locale: tw ? "zh-TW" : "zh-CN" }, template, screenshots.map(item => ({ field: item.field, url: item.url }))) : undefined;
  const renderUpload = (field = "") => <div className="feedback-upload">
    <input id={`screenshots-${field || "general"}`} aria-label={t("选择截图")} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden disabled={!screenshotsEnabled || busy || readingImages || screenshots.length >= 3} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void addScreenshots(files, field); }} />
    <button type="button" className="btn btn-ghost" disabled={!screenshotsEnabled || busy || readingImages || screenshots.length >= 3} onClick={() => document.getElementById(`screenshots-${field || "general"}`)?.click()}>{t(readingImages ? "正在读取…" : screenshots.length >= 3 ? "已选满 3 张" : "＋ 选择截图")}</button>
    <span aria-live="polite">{t("已选")}{t(screenshots.length)} {t("/ 3 张 · 点击缩略图查看大图")}</span>
  </div>;
  useEffect(() => {
    const root = previewBody.current;
    if (!root || tab !== "preview" || !previewIssue?.body) return;
    const cleanups: (() => void)[] = [];
    root.querySelectorAll("img").forEach(image => {
      const screenshot = screenshots.find(item => item.url === image.getAttribute("src"));
      if (!screenshot) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "feedback-preview-image";
      button.setAttribute("aria-label", `${t("放大查看")} ${screenshot.file.name}`);
      image.replaceWith(button);
      button.append(image);
      const open = () => setSelectedScreenshot(screenshot.id);
      button.addEventListener("click", open);
      cleanups.push(() => { button.removeEventListener("click", open); button.replaceWith(image); });
    });
    return () => { cleanups.forEach(cleanup => { cleanup(); }); };
  }, [tab, previewIssue?.body, screenshots, t]);
  const selectTab = (value: "edit" | "preview", focus = false) => { setTab(value); if (focus) document.getElementById(`feedback-tab-${value}`)?.focus(); };

  return (
    <main className="content-page feedback-page">
      <ScreenshotViewer images={screenshots} selected={selectedScreenshot} onClose={() => setSelectedScreenshot(null)} />
      <div className="container">
        <div className="feedback-heading">
          <p className="feedback-kicker">{t("一起改进水杉输入法")}</p>
          <h1>{t("反馈问题或提出建议")}</h1>
          <p>{t("遇到故障或希望改进功能，都可以在这里反馈。提交后会在 GitHub 对应仓库创建公开的 Issue（反馈记录），无需 GitHub 账号。")}</p>
        </div>
        {issueUrl ? <section className="card feedback-success" aria-live="polite" tabIndex={-1} ref={successPanel}>
          <h2>{t("反馈已提交")}</h2><p>{t("感谢你帮助水杉输入法变得更好。你可以通过 Issue 查看后续讨论和处理进展。")}</p>
          <a className="btn btn-primary" href={issueUrl} target="_blank" rel="noreferrer">{t("查看已创建的 Issue ↗")}</a>
        </section> : <div className="feedback-layout">
          <form className="card feedback-form" onSubmit={submit} noValidate>
            <div className="feedback-tabs" role="tablist" aria-label={t("反馈表单")}>
              {t((["edit", "preview"] as const).map(value => <button key={value} id={`feedback-tab-${value}`} type="button" role="tab" aria-selected={tab === value} aria-controls={`feedback-panel-${value}`} tabIndex={tab === value ? 0 : -1} onClick={() => selectTab(value)} onKeyDown={event => {
                if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); selectTab(event.key === "Home" ? "edit" : event.key === "End" ? "preview" : tab === "edit" ? "preview" : "edit", true); }
              }}>{t(value === "edit" ? "填写" : "预览")}</button>))}
            </div>
            {t(error && <p className="feedback-error" role="alert">{t(error)}</p>)}
            <div id="feedback-panel-edit" role="tabpanel" aria-labelledby="feedback-tab-edit" hidden={tab !== "edit"}>

            <fieldset disabled={busy || readingImages}>
              <legend>{t("1. 选择反馈对象")}</legend>
              <p id="feedback-target-hint" className="feedback-hint">{t("先选你正在使用的平台。想反馈网站或文档，也可以在这里选择。")}</p>
              <div className="feedback-target-grid" role="radiogroup" aria-label={t("反馈对象")} aria-describedby="feedback-target-hint">
                {t(Object.entries(targets).map(([key, target]) => <label className="feedback-consent feedback-option" key={key}>
                  <input type="radio" name="target" value={key} checked={form.target === key} onChange={() => update({ target: key, template: undefined, tab: "edit" })} />
                  <span>{t(target.label)}</span>
                </label>))}
              </div>
              <p className="feedback-hint">{t("不知道“公共引擎”或“公共 API”是什么？选你的输入法平台即可，我们会协助分类。")}</p>
              <p className="feedback-help-link">{t("遇到使用问题？先看看")}<a href={href("/faq/")} target="_blank" rel="noreferrer">{t("常见问题 ↗")}</a>{t("，或")}<a href={`https://github.com/metasequoiaime/${targets[form.target].repo}/issues`} target="_blank" rel="noreferrer">{t("搜索已有反馈 ↗")}</a>。</p>
              {t(templateLoading && <p className="feedback-hint" role="status">{t("正在读取仓库模板…")}</p>)}
              {t(templateError && <div className="feedback-error" role="alert"><p>{t(templateError)}</p><button type="button" className="btn btn-ghost" onClick={() => { saveDraft(); setReload(value => value + 1); }}>{t("重新加载模板")}</button><a href={`https://github.com/metasequoiaime/${targets[form.target].repo}/issues/new/choose`} target="_blank" rel="noreferrer">{t("前往 GitHub 提交 ↗")}</a></div>)}
              {t(template && !templateLoading && !templateError && <>
                <fieldset className="feedback-choice-field feedback-template-picker">
                  <legend>{t("2. 你想反馈什么？")}</legend>
                  {t(catalog.templates.map(item => <label className="feedback-consent" key={item.id}>
                    <input type="radio" name="issue-template" value={item.id} checked={template.id === item.id} onChange={() => update({ template: item.id })} />
                    <span><strong>{t(item.name)}</strong><small>{t(item.description)}</small></span>
                  </label>))}
                </fieldset>
                <p className="feedback-hint">{t("遇到出错、无法使用，选择问题反馈；想增加功能或改善体验，选择功能建议。")}</p>
                <p className="feedback-hint">{t("切换类型会保留当前页面中的草稿，刷新或关闭页面后不会保留。")}</p>
                <h2 className="feedback-section-heading">{t("3. 描述你的反馈")}</h2>
                <p className="feedback-hint">{t("标注“必填”或 * 的项目必须填写，其余可以跳过。按自己的话描述即可。")}</p>
                <div className="feedback-progress"><span>{t("必填内容已完成")}{t(completedFields + Number(titleComplete))} / {t(requiredFields.length + 1)} {t("项")}</span><progress aria-label={t("必填内容完成进度")} value={completedFields + Number(titleComplete)} max={requiredFields.length + 1} /></div>
                <label>{t("用一句话概括")}<span className="feedback-required" aria-hidden="true">*</span><input name="title" value={form.title} minLength={5} maxLength={100} required aria-describedby="feedback-title-hint" placeholder={t("例如：候选字显示为方框，或希望能调整字号")} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
                <p id="feedback-title-hint" className="feedback-hint">{t("写清楚哪里出了问题，或希望增加什么。5–100 个字符，不用考虑技术术语。")}</p>
                <FeedbackFields template={template} answers={form.answers} onChange={(id, value) => setForm(previous => ({ ...previous, answers: { ...previous.answers, [id]: value } }))} upload={renderUpload} />
              </>)}
              <section className="feedback-screenshots">
                <label htmlFor="screenshots-general">{t("补充截图（可选）")}</label>
                <p id="screenshot-hint" className="feedback-hint">{t("支持 PNG、JPEG、WebP，最多 3 张，每张不超过 5 MiB。截图将随 Issue 公开，请先遮挡个人信息。")}</p>
                {t(renderUpload())}
                {t(screenshotsEnabled === null && <p className="feedback-hint" role="status">{t("正在检查截图上传服务…")}</p>)}
                {t(screenshotsEnabled === false && <p className="feedback-hint">{t("截图上传暂不可用，仍可提交文字反馈。")}</p>)}
                {t(readingImages && <p role="status">{t("正在读取截图…")}</p>)}
                {t(imageError && <p className="feedback-error" role="alert">{t(imageError)}</p>)}
                <div className="feedback-image-grid">{screenshots.map((item, index) => <figure key={item.id}>
                  <button type="button" className="feedback-thumbnail" aria-label={t(`放大查看 ${item.file.name}`)} onClick={() => setSelectedScreenshot(item.id)}><img src={item.url} alt={t(`截图 ${index + 1}：${item.file.name}`)} /><span>{t("放大查看 ↗")}</span></button>
                  <figcaption title={t(item.file.name)}>{item.file.name}<small>{t((item.file.size / 1024 / 1024).toFixed(2))} MiB</small></figcaption>
                  <details className="feedback-image-position"><summary>{t("调整截图位置")}</summary><label>{t("截图位置")}<select aria-label={t(`截图 ${index + 1} 的位置`)} value={item.field} onChange={event => setScreenshots(items => items.map(image => image.id === item.id ? { ...image, field: event.target.value } : image))}><option value="">{t("单独的截图小节")}</option>{t(template?.fields.filter(field => canAttach(field) && acceptsScreenshot(field, item.file.type)).map(field => <option key={field.id} value={field.id}>{t(field.label)}</option>))}</select></label></details>
                  <button type="button" className="btn btn-ghost" aria-label={t(`移除截图 ${index + 1}`)} onClick={() => setScreenshots(items => items.filter((_, i) => i !== index))}>{t("移除")}</button>
                </figure>)}</div>
              </section>
              <details className="feedback-contacts">
                <summary>{t("留下联系方式（可选）")}{t(contactFields.some(field => form[field.name].trim()) && <span className="feedback-hint"> {t("· 已填写")}</span>)}</summary>
                <p className="feedback-hint">{t("方便维护者进一步了解情况，可填写任意一项或全部留空。填写的联系方式会随 Issue 公开，请只提供愿意公开的账号。")}</p>
                <div className="feedback-contact-grid">
                  {t(contactFields.map(field => <label key={field.name}>{t(field.label)}
                    <input name={field.name} type={field.type} value={form[field.name]} maxLength={field.max} placeholder={t(field.placeholder)} autoCapitalize="none" spellCheck={false} onChange={event => setForm({ ...form, [field.name]: event.target.value })} />
                  </label>))}
                </div>
              </details>
            </fieldset>
            </div>
            {/* biome-ignore lint/a11y/noNoninteractiveTabindex: WAI-ARIA Tab 面板允许键盘聚焦以阅读预览正文。 */}
            <div id="feedback-panel-preview" role="tabpanel" aria-labelledby="feedback-tab-preview" hidden={tab !== "preview"} tabIndex={0}>
              {t(previewIssue && !templateLoading && !templateError ? <article className="feedback-issue">
                <h2 className="feedback-issue-title">{previewIssue.title || t("尚未填写标题")}</h2>
                {/* biome-ignore lint/security/noDangerouslySetInnerHtml: markdown-it 禁用 HTML 透传并校验链接协议。 */}
                <div ref={previewBody} className="feedback-issue-body" dangerouslySetInnerHTML={{ __html: markdown.render(previewIssue.body) }} />
              </article> : <p className="feedback-hint">{t("请先在“填写”中加载仓库模板。")}</p>)}
            </div>
            <h2 className="feedback-section-heading">{t("4. 确认并提交")}</h2>
            <p className="feedback-hint">{t("可以在顶部“预览”检查内容。提交成功后会获得反馈链接，方便查看处理进展。")}</p>
            <fieldset disabled={busy || readingImages}>
              <label className="feedback-consent"><input name="consent" type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /><span>{t("我同意将以上文字、截图及自愿填写的联系方式公开发布到 GitHub，确认不包含密码、令牌或其他不愿公开的信息。")}</span></label>
            </fieldset>
            <div className="feedback-verification" tabIndex={-1}><div ref={widget} /><p className="feedback-hint" role="status">{t(status)}</p>
              {t(!token && widgetId.current !== undefined && <button type="button" className="btn btn-ghost" disabled={busy || readingImages} onClick={() => { if (widgetId.current !== undefined) window.turnstile?.reset(widgetId.current); }}>{t("重新验证")}</button>)}
            </div>
            {t(uncertainUrl && <p><a href={uncertainUrl} target="_blank" rel="noreferrer">{t("先查看最新 Issue ↗")}</a></p>)}
            {t(tab === "edit" && <button className="btn btn-ghost feedback-preview-action" type="button" onClick={() => { selectTab("preview", true); document.getElementById("feedback-tab-preview")?.scrollIntoView({ block: "start", behavior: "smooth" }); }}>{t("先预览内容")}</button>)}
            <button className="btn btn-primary" type="submit" disabled={busy || readingImages || templateLoading || !template || Boolean(templateError)}>{t(busy ? "正在提交…" : "提交反馈")}</button>
          </form>
          <aside className="card feedback-aside">
            <p className="feedback-kicker">{t("提交到")}</p><h2>{t(targets[form.target].label)}</h2>
            <a href={`https://github.com/metasequoiaime/${targets[form.target].repo}/issues`} target="_blank" rel="noreferrer">{t(targets[form.target].repo)} ↗</a>
            <hr /><h3>{t("先查常见问题")}</h3><p>{t("字体方框、设置打不开或快捷键冲突？")}<a href={href("/faq/")}>{t("查看常见问题 Q&A")}</a>{t("，试试已有的排查办法。")}</p>
            <h3>{t("描述清楚，方便排查")}</h3>
            <p>{t("说清楚遇到的问题、目前的做法，以及你希望的结果。提交前也可以查看已有 Issue，避免重复提交。")}</p>
            <h3>{t("提交之后")}</h3><p>{t("页面会显示 Issue 链接。维护者将在对应仓库讨论、评估并跟进；提交并不代表已经排入开发计划。")}</p>
            <h3>{t("隐私与安全")}</h3><p>{t("表单内容会公开。安全漏洞请按")}<a href="https://github.com/metasequoiaime/.github/blob/main/SECURITY.md" target="_blank" rel="noreferrer">{t("安全策略")}</a> {t("私下报告。")}</p>
          </aside>
        </div>}
      </div>
    </main>
  );
}
