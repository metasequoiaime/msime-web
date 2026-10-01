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
import { PageHero } from "./page-content";
import { LocaleLink } from "./locale-link";
import { AppleIcon, Button, Container, LinuxIcon, Pill, WindowsIcon, cx } from "./ui";
import { FeedbackAside } from "./feedback/feedback-aside";
import { FeedbackSuccess } from "./feedback/feedback-success";
import { alertClass, checkClass, fieldLabelClass, hintClass, inputClass, markdownClass, previewImageButtonClass, stepTitleClass } from "./feedback/styles";

const emptyForm: Feedback = { target: "windows", title: "", templateId: "", templateRevision: "", answers: {}, screenshotFields: [], github: "", email: "", consent: true };
type LocalScreenshot = { id: string; field: string; file: File; url: string };
type Draft = { title: string; answers: Answers; screenshots: LocalScreenshot[] };
const targetIcons = { windows: WindowsIcon, apple: AppleIcon, linux: LinuxIcon } as const;

export function FeedbackPage() {
  const { t, tw } = useLocale();
  usePageMeta("Bug 与需求反馈 | 水杉输入法", "反馈问题或提出建议，提交内容将公开发布到 GitHub。");
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
      element?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
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
  const target = targets[form.target];
  const issuesUrl = `https://github.com/metasequoiaime/${target.repo}/issues`;
  // Next thing standing between the user and a submission, shown beside the submit button (design-home §8 "提示文字").
  const submitHint = !template ? "请先加载仓库模板" : !titleComplete ? "请填写标题" : completedFields < requiredFields.length ? `还有 ${requiredFields.length - completedFields} 项必填内容` : !consent ? "请先勾选同意" : !token ? "请完成提交验证" : `提交到 ${target.repo}`;
  const uploadDisabled = !screenshotsEnabled || busy || readingImages || screenshots.length >= 3;
  const renderUpload = (field = "") => <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
    <input id={`screenshots-${field || "general"}`} aria-label={t("选择截图")} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden disabled={uploadDisabled} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void addScreenshots(files, field); }} />
    <button type="button" className="flex h-[72px] min-w-24 flex-col items-center justify-center gap-0.5 rounded-tab bg-accent-soft px-3 text-[13px] text-accent-ink shadow-[inset_0_0_0_1.5px_var(--accent-ring)] transition-[background-color] duration-150 hover:bg-accent-ring disabled:cursor-not-allowed disabled:opacity-45" disabled={uploadDisabled} onClick={() => document.getElementById(`screenshots-${field || "general"}`)?.click()}>
      {!readingImages && screenshots.length < 3 && <span className="text-xl leading-none" aria-hidden="true">＋</span>}
      {t(readingImages ? "正在读取…" : screenshots.length >= 3 ? "已选满 3 张" : "选择截图")}
    </button>
    <span className="text-[12.5px] text-muted" aria-live="polite">{t(`已选 ${screenshots.length} / 3 张 · 点击缩略图查看大图`)}</span>
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
      button.className = previewImageButtonClass;
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
  // "再提交一条": start a blank draft for the same repository and template, keeping the contact details the user chose to share.
  function startOver() {
    drafts.current = {};
    setIssueUrl("");
    setUncertainUrl("");
    setConsent(false);
    setError("");
    setImageError("");
    if (template) chooseTemplate(template); else setScreenshots([]);
    setTab("edit");
    requestAnimationFrame(() => { document.getElementById("feedback-tab-edit")?.focus({ preventScroll: true }); });
  }

  return (
    <>
      <PageHero
        variant="plain"
        kicker="一起改进水杉输入法"
        title="反馈问题或提出建议"
        lead="遇到故障或希望改进功能，都可以在这里反馈。提交后会在 GitHub 对应仓库创建公开的 Issue（反馈记录），无需 GitHub 账号。"
      />
      <main className="w-full">
        <ScreenshotViewer images={screenshots} selected={selectedScreenshot} onClose={() => setSelectedScreenshot(null)} />
        <Container className="flex flex-wrap items-start gap-6 pt-8">
          {issueUrl && <FeedbackSuccess issueUrl={issueUrl} repo={target.repo} onReset={startOver} panelRef={successPanel} />}
          {/* The form stays mounted (only hidden) after a successful submission so the Turnstile widget keeps its container for "再提交一条". */}
          <form className="min-w-0 flex-[1_1_min(100%,560px)] rounded-card bg-panel shadow-card" onSubmit={submit} noValidate hidden={Boolean(issueUrl)}>
            <div className="flex gap-1 p-2 shadow-divider-b" role="tablist" aria-label={t("反馈表单")}>
              {(["edit", "preview"] as const).map(value => <button key={value} id={`feedback-tab-${value}`} type="button" role="tab" className={cx("flex h-[38px] items-center rounded-tab px-[18px] text-[14.5px] font-semibold transition-colors duration-150", tab === value ? "bg-accent-soft text-accent-ink" : "bg-transparent text-muted hover:text-ink")} aria-selected={tab === value} aria-controls={`feedback-panel-${value}`} tabIndex={tab === value ? 0 : -1} onClick={() => selectTab(value)} onKeyDown={event => {
                if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); selectTab(event.key === "Home" ? "edit" : event.key === "End" ? "preview" : tab === "edit" ? "preview" : "edit", true); }
              }}>{t(value === "edit" ? "填写" : "预览")}</button>)}
            </div>
            <div className="p-[clamp(20px,3vw,32px)]">
              {error && <p className="sticky top-[76px] z-[2] m-0 mb-5 rounded-field bg-panel px-4 py-3 text-sm leading-[1.75] text-ink shadow-[inset_0_0_0_1.5px_var(--warn),var(--shadow)]" role="alert">{t(error)}</p>}
              <div id="feedback-panel-edit" role="tabpanel" aria-labelledby="feedback-tab-edit" hidden={tab !== "edit"}>
                <fieldset className="m-0 min-w-0 border-0 p-0" disabled={busy || readingImages}>
                  <section aria-labelledby="feedback-step-target">
                    <h2 id="feedback-step-target" className={stepTitleClass}>{t("1. 选择反馈对象")}</h2>
                    {/* 180px rather than the design's 150px: "macOS / iOS 输入法" plus its icon would otherwise break mid-word. */}
                    <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]" role="radiogroup" aria-labelledby="feedback-step-target">
                      {Object.entries(targets).map(([key, item]) => { const Icon = targetIcons[key as keyof typeof targets]; return <label key={key} className="flex min-h-11 gap-2 cursor-pointer items-center rounded-field bg-panel-2 px-3 py-2 text-sm leading-normal text-ink transition-[background-color,box-shadow] duration-150 [word-break:keep-all] [overflow-wrap:anywhere] hover:bg-accent-soft has-[:checked]:bg-accent-soft has-[:checked]:font-semibold has-[:checked]:text-accent-ink has-[:checked]:shadow-ring-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
                        <input className="sr-only" type="radio" name="target" value={key} checked={form.target === key} onChange={() => update({ target: key, template: undefined, tab: "edit" })} />
                        <Icon size={18} className="flex-none" />
                        <span>{t(item.label)}</span>
                      </label>; })}
                    </div>
                    <p className={cx(hintClass, "mt-3")}>
                      {t("遇到使用问题？先看看")}
                      <LocaleLink to="/faq/" target="_blank" rel="noreferrer">{t("常见问题")}</LocaleLink>
                      {t("，或")}
                      <a href={issuesUrl} target="_blank" rel="noreferrer">{t("搜索已有反馈 ↗")}</a>
                    </p>
                  </section>

                  {templateLoading && <p className={cx(hintClass, "mt-8")} role="status">{t("正在读取仓库模板…")}</p>}
                  {templateError && <div className={cx(alertClass, "mt-8")} role="alert">
                    <p className="m-0">{t(templateError)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Button variant="ghost" size="sm" onClick={() => { saveDraft(); setReload(value => value + 1); }}>{t("重新加载模板")}</Button>
                      <a className="text-sm" href={`${issuesUrl}/new/choose`} target="_blank" rel="noreferrer">{t("前往 GitHub 提交 ↗")}</a>
                    </div>
                  </div>}
                  {template && !templateLoading && !templateError && <>
                    <section className="mt-8" aria-labelledby="feedback-step-template">
                      <h2 id="feedback-step-template" className={stepTitleClass}>{t("2. 反馈类型")}</h2>
                      <div className="mt-3 inline-flex max-w-full flex-wrap gap-1 rounded-field bg-panel-2 p-1" role="radiogroup" aria-labelledby="feedback-step-template" aria-describedby={template.description ? "feedback-template-description" : undefined}>
                        {catalog.templates.map(item => <label key={item.id} className="inline-flex min-h-[38px] cursor-pointer items-center rounded-[9px] px-[18px] py-1.5 text-[14.5px] font-semibold text-muted transition-[background-color,color,box-shadow] duration-150 [overflow-wrap:anywhere] hover:text-ink has-[:checked]:bg-panel has-[:checked]:text-ink has-[:checked]:shadow-tab has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
                          <input className="sr-only" type="radio" name="issue-template" value={item.id} checked={template.id === item.id} onChange={() => update({ template: item.id })} />
                          <span>{t(item.name)}</span>
                        </label>)}
                      </div>
                      {template.description && <p id="feedback-template-description" className={cx(hintClass, "mt-2.5")}>{t(template.description)}</p>}
                    </section>

                    <section className="mt-8" aria-labelledby="feedback-step-describe">
                      <h2 id="feedback-step-describe" className={stepTitleClass}>{t("3. 描述")}</h2>
                      <label className={cx(fieldLabelClass, "mt-3")}>
                        {t("标题")}<span className="ml-1 text-warn" aria-hidden="true">*</span><span className="sr-only">{t("（必填）")}</span>
                        <input className={inputClass} name="title" value={form.title} minLength={5} maxLength={100} required placeholder={t("例如：候选字显示为方框，或希望能调整字号")} onChange={event => setForm({ ...form, title: event.target.value })} />
                      </label>
                      <FeedbackFields template={template} answers={form.answers} onChange={(id, value) => setForm(previous => ({ ...previous, answers: { ...previous.answers, [id]: value } }))} upload={renderUpload} />
                    </section>
                  </>}

                  <section className="mt-6" aria-labelledby="feedback-screenshots-label">
                    <label id="feedback-screenshots-label" className={fieldLabelClass} htmlFor="screenshots-general">{t("补充截图（可选）")}</label>
                    <p id="screenshot-hint" className={cx(hintClass, "mt-1 text-[13px] leading-[1.7]")}>{t("支持 PNG、JPEG、WebP，最多 3 张，每张不超过 5 MiB。截图将随 Issue 公开，请先遮挡个人信息。")}</p>
                    {renderUpload()}
                    {screenshotsEnabled === null && <p className={cx(hintClass, "mt-2 text-[13px]")} role="status">{t("正在检查截图上传服务…")}</p>}
                    {screenshotsEnabled === false && <p className={cx(hintClass, "mt-2 text-[13px]")}>{t("截图上传暂不可用，仍可提交文字反馈。")}</p>}
                    {readingImages && <p className={cx(hintClass, "mt-2 text-[13px]")} role="status">{t("正在读取截图…")}</p>}
                    {imageError && <p className={cx(alertClass, "mt-3")} role="alert">{t(imageError)}</p>}
                    {screenshots.length > 0 && <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))] gap-3">
                      {screenshots.map((item, index) => <figure key={item.id} className="relative m-0 min-w-0 rounded-field bg-panel-2 p-2.5">
                        <button type="button" className="block w-full cursor-zoom-in overflow-hidden rounded-row bg-panel p-0 shadow-hair-2" aria-label={t(`放大查看 ${item.file.name}`)} onClick={() => setSelectedScreenshot(item.id)}>
                          <img className="block h-[120px] w-full object-contain" src={item.url} alt={t(`截图 ${index + 1}：${item.file.name}`)} />
                        </button>
                        <button type="button" className="absolute top-4 right-4 grid size-7 place-items-center rounded-full bg-black/60 text-xs text-white hover:bg-black/75" aria-label={t(`移除截图 ${index + 1}`)} onClick={() => setScreenshots(items => items.filter((_, i) => i !== index))}>✕</button>
                        <figcaption className="mt-2 min-w-0 text-[13px] text-ink" title={item.file.name}>
                          <span className="block truncate">{item.file.name}</span>
                          <small className="block text-xs text-muted">{(item.file.size / 1024 / 1024).toFixed(2)} MiB</small>
                        </figcaption>
                        <details className="mt-1.5 text-[13px]">
                          <summary className="flex min-h-9 cursor-pointer items-center text-muted hover:text-ink">{t("调整截图位置")}</summary>
                          <label className="mt-1 block text-xs text-muted">{t("截图位置")}
                            <select className="mt-1 block h-9 w-full min-w-0 rounded-row border-0 bg-panel px-2 font-sans text-[13px] text-ink shadow-ring-2" aria-label={t(`截图 ${index + 1} 的位置`)} value={item.field} onChange={event => setScreenshots(items => items.map(image => image.id === item.id ? { ...image, field: event.target.value } : image))}>
                              <option value="">{t("单独的截图小节")}</option>
                              {template?.fields.filter(field => canAttach(field) && acceptsScreenshot(field, item.file.type)).map(field => <option key={field.id} value={field.id}>{t(field.label)}</option>)}
                            </select>
                          </label>
                        </details>
                      </figure>)}
                    </div>}
                  </section>

                  <section className="mt-8" aria-labelledby="feedback-step-contacts">
                    <h2 id="feedback-step-contacts" className={stepTitleClass}>
                      {t("4. 留下联系方式（可选）")}
                      {contactFields.some(field => form[field.name].trim()) && <span className="ml-2 text-[13px] font-normal text-muted">{t("· 已填写")}</span>}
                    </h2>
                    <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-x-2.5 gap-y-3">
                      {contactFields.map(field => <label key={field.name} className="block min-w-0 text-[13px] text-muted">{t(field.label)}
                        <input className={cx(inputClass, "mt-1.5 text-[14.5px]")} name={field.name} type={field.type} value={form[field.name]} maxLength={field.max} placeholder={t(field.placeholder)} autoCapitalize="none" spellCheck={false} onChange={event => setForm({ ...form, [field.name]: event.target.value })} />
                      </label>)}
                    </div>
                  </section>
                </fieldset>
              </div>

              {/* biome-ignore lint/a11y/noNoninteractiveTabindex: WAI-ARIA Tab 面板允许键盘聚焦以阅读预览正文。 */}
              <div id="feedback-panel-preview" role="tabpanel" aria-labelledby="feedback-tab-preview" hidden={tab !== "preview"} tabIndex={0}>
                {previewIssue && !templateLoading && !templateError ? <article className="[overflow-wrap:anywhere]">
                  <p className="m-0 text-[13px] text-muted">{t(`将在 ${target.repo} 创建的 Issue`)}</p>
                  <h2 className="m-0 mt-1.5 font-heading text-[19px] leading-normal font-bold text-ink">{previewIssue.title || t("尚未填写标题")}</h2>
                  {previewIssue.labels.length > 0 && <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0" aria-label={t("标签")}>
                    {previewIssue.labels.map(label => <li key={label}><Pill tone="neutral" mono>{label}</Pill></li>)}
                  </ul>}
                  {/* biome-ignore lint/security/noDangerouslySetInnerHtml: markdown-it 禁用 HTML 透传并校验链接协议。 */}
                  <div ref={previewBody} className={cx(markdownClass, "mt-5")} dangerouslySetInnerHTML={{ __html: markdown.render(previewIssue.body) }} />
                </article> : <p className={hintClass}>{t("请先在“填写”中加载仓库模板。")}</p>}
              </div>

              <section className="mt-8 shadow-divider-t pt-8" aria-labelledby="feedback-step-submit">
                <h2 id="feedback-step-submit" className={stepTitleClass}>{t("5. 确认并提交")}</h2>
                <fieldset className="m-0 min-w-0 border-0 p-0" disabled={busy || readingImages}>
                  <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm leading-[1.75] text-body">
                    <input className={cx(checkClass, "mt-[5px]")} name="consent" type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} />
                    <span>{t("我同意将以上文字、截图及自愿填写的联系方式公开发布到 GitHub，确认不包含密码、令牌或其他不愿公开的信息。")}</span>
                  </label>
                </fieldset>
                <div className="feedback-verification mt-5 flex flex-col items-start gap-2 rounded-field outline-none" tabIndex={-1}>
                  <div ref={widget} />
                  <p className={cx(hintClass, "text-[13px]")} role="status">{t(status)}</p>
                  {!token && widgetId.current !== undefined && <Button variant="ghost" size="sm" disabled={busy || readingImages} onClick={() => { if (widgetId.current !== undefined) window.turnstile?.reset(widgetId.current); }}>{t("重新验证")}</Button>}
                </div>
                {uncertainUrl && <p className="m-0 mt-4 text-sm"><a href={uncertainUrl} target="_blank" rel="noreferrer">{t("先查看最新 Issue ↗")}</a></p>}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {tab === "edit" && <Button variant="ghost" onClick={() => { selectTab("preview", true); document.getElementById("feedback-tab-preview")?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }}>{t("先预览内容")}</Button>}
                  <Button type="submit" disabled={busy || readingImages || templateLoading || !template || Boolean(templateError)}>{t(busy ? "正在提交…" : "提交反馈")}</Button>
                  <span className="min-w-0 text-[13.5px] text-muted">{t(submitHint)}</span>
                </div>
              </section>
            </div>
          </form>
          <FeedbackAside targetLabel={target.label} repo={target.repo} />
        </Container>
      </main>
    </>
  );
}
