import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useLocale } from "./use-locale";
import { usePageMeta } from "./page-meta";
import { FeedbackResponseError, readFeedbackResponse } from "./feedback-response";
import { loadTurnstile } from "./turnstile";
import { createdSchema, formatLine, submissionError, MAX_ENTRIES, MAX_NOTE_LENGTH, MAX_WORD_LENGTH, rejectedSchema, WORD_SUBMISSIONS_URL, WORDS_REPO_URL, wordEntrySchema, wordsConfigSchema, wordsSchema } from "../shared/words";
import { PageHero } from "./page-content";
import { LocaleLink } from "./locale-link";
import { AnchorButton, Button, Card, Container, cx } from "./ui";
import { CheckIcon } from "./ui/icons";
import { checkClass, fieldLabelClass, hintClass, inputClass, stepTitleClass } from "./feedback/styles";

type Row = { id: string; word: string; pinyin: string };
type RowErrors = Record<string, { word?: string; pinyin?: string }>;
const newRow = (): Row => ({ id: crypto.randomUUID(), word: "", pinyin: "" });
const PULLS_URL = `${WORDS_REPO_URL}/pulls`;

export function WordsPage() {
  const { t, tw } = useLocale();
  usePageMeta("提交词条 | 水杉输入法", "为水杉输入法词库提交新词，经维护者审核后随后续词库版本发布到所有平台。");
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [rowErrors, setRowErrors] = useState<RowErrors>({});
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("正在加载提交验证…");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const successPanel = useRef<HTMLElement>(null);
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function setup() {
      try {
        const response = await fetch(WORD_SUBMISSIONS_URL, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
        const data = await readFeedbackResponse(response, "提交服务暂不可用，请稍后刷新重试。");
        const config = wordsConfigSchema.safeParse(data);
        if (!response.ok || !config.success || !config.data.enabled || !config.data.site_key) throw new Error(typeof data.error === "string" && data.error ? data.error : "词条提交暂未开放，请稍后再试。");
        const api = await loadTurnstile();
        if (!active || !widget.current) return;
        widgetId.current = api.render(widget.current, {
          sitekey: config.data.site_key,
          action: "words",
          size: "compact",
          language: tw ? "zh-TW" : "zh-CN",
          callback: value => { if (active) { setToken(value); setStatus("验证通过，可以提交。"); } },
          "expired-callback": () => { if (active) { setToken(""); setStatus("验证已过期，请重新验证。"); } },
          "error-callback": () => { if (active) { setToken(""); setStatus("验证失败，请检查网络后重新验证。"); } },
        });
        setStatus("请完成下方验证。");
      } catch (reason) {
        if (active) setStatus(reason instanceof Error && !(reason instanceof SyntaxError) && !(reason instanceof TypeError) && !(reason instanceof DOMException) ? reason.message : "提交服务暂不可用，请稍后刷新重试。");
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

  useEffect(() => {
    if (result) {
      successPanel.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [result]);

  const updateRow = (id: string, change: Partial<Row>) => {
    setRows(items => items.map(row => row.id === id ? { ...row, ...change } : row));
    setRowErrors(errors => { const next = { ...errors }; delete next[id]; return next; });
  };
  const focus = (selector: string) => requestAnimationFrame(() => {
    const element = document.querySelector<HTMLElement>(selector);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  // Rows left completely empty are ignored, so an unused extra row never blocks submission.
  const filled = rows.filter(row => row.word.trim() || row.pinyin.trim());
  const preview = filled.map(row => wordEntrySchema.safeParse(row)).flatMap(parsed => parsed.success ? [formatLine(parsed.data)] : []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || result) return;
    setError("");
    setUncertain(false);
    const parsed = wordsSchema.safeParse({ entries: filled.map(({ word, pinyin }) => ({ word, pinyin })), note });
    if (!parsed.success) {
      const errors: RowErrors = {};
      for (const issue of parsed.error.issues) {
        const [section, index, field] = issue.path;
        const row = section === "entries" && typeof index === "number" ? filled[index] : undefined;
        if (row && (field === "word" || field === "pinyin")) errors[row.id] = { [field]: issue.message, ...errors[row.id] };
      }
      setRowErrors(errors);
      const first = parsed.error.issues[0];
      setError(first.message);
      const [section, index, field] = first.path;
      const row = section === "entries" && typeof index === "number" ? filled[index] : undefined;
      focus(row ? `[name="${field === "pinyin" ? "pinyin" : "word"}-${row.id}"]` : section === "entries" ? `[name="word-${rows[0].id}"]` : `[name="${String(section)}"]`);
      return;
    }
    if (!consent) { setError("请确认词条将公开发布到 GitHub。"); focus('[name="consent"]'); return; }
    if (!token) { setError("请先完成提交验证。"); focus(".feedback-verification"); return; }
    submitting.current = true;
    setBusy(true);
    try {
      const response = await fetch(WORD_SUBMISSIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: parsed.data.entries, note: parsed.data.note, token }),
        signal: AbortSignal.timeout(60_000),
      });
      const data = await readFeedbackResponse(response, "无法确认提交结果，请先查看词库仓库的 Pull Request。");
      if (!response.ok) {
        const message = submissionError(response.status, data);
        if (response.status === 400) {
          const rejected = rejectedSchema.safeParse(data);
          const errors: RowErrors = {};
          for (const item of rejected.success ? rejected.data.rejected ?? [] : []) {
            const row = filled[item.index];
            if (row) errors[row.id] = { word: item.reason };
          }
          setRowErrors(errors);
        }
        if (response.status === 502 || data.uncertain === true) setUncertain(true);
        throw new Error(message);
      }
      const created = createdSchema.safeParse(data);
      if (!created.success) throw new FeedbackResponseError("无法确认 Pull Request 地址，请查看词库仓库。");
      setResult(created.data.pull_request_url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "提交失败，请稍后再试。");
      // Without a valid response GitHub may already hold the commit; keep the form and point to the PR list instead of inviting a blind resubmission.
      if (reason instanceof FeedbackResponseError || reason instanceof TypeError || (reason instanceof DOMException && ["TimeoutError", "AbortError"].includes(reason.name))) {
        setError("未收到有效的提交结果。请先查看词库仓库的 Pull Request，确认词条未写入后再提交。");
        setUncertain(true);
      }
    } finally {
      setToken("");
      if (widgetId.current !== undefined) window.turnstile?.reset(widgetId.current);
      setBusy(false);
      submitting.current = false;
    }
  }

  return (
    <>
      <PageHero
        variant="plain"
        kicker="一起完善词库"
        title="提交词条"
        lead="输入法打不出想要的词？可以在这里提交词语和拼音，无需 GitHub 账号。提交的词条会写入词库仓库 msime-dictionary 的公开 Pull Request，由维护者逐条审核；审核通过后随之后发布的词库版本在所有平台生效，不会立即出现在你的输入法里。"
      />
      <main className="w-full">
        <Container className="flex flex-wrap items-start gap-6 pt-8">
          {result ? <section className="min-w-0 flex-[1_1_min(100%,560px)] rounded-card bg-panel p-[clamp(24px,3.4vw,40px)] shadow-card outline-none" aria-live="polite" tabIndex={-1} ref={successPanel}>
            <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink" aria-hidden="true"><CheckIcon /></span>
            <h2 className="mt-4 mb-0 font-heading text-[22px] font-bold text-ink">{t("词条已提交")}</h2>
            <p className="mt-2 mb-0 text-[15px] leading-[1.85] text-body">{t("词条已写入词库仓库的 Pull Request，维护者审核后会合入词库。合入之后，词条会在下一个词库版本中对所有平台生效。")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <AnchorButton href={result}>{t("查看 Pull Request ↗")}</AnchorButton>
              <Button variant="secondary" onClick={() => { setResult(null); setRows([newRow()]); setNote(""); setConsent(false); setError(""); }}>{t("继续提交")}</Button>
            </div>
          </section> : <form className="min-w-0 flex-[1_1_min(100%,560px)] rounded-card bg-panel p-[clamp(20px,3vw,32px)] shadow-card" onSubmit={submit} noValidate>
            {t(error && <p className="sticky top-[76px] z-[2] m-0 mb-5 rounded-field bg-panel px-4 py-3 text-sm leading-[1.75] text-ink shadow-[inset_0_0_0_1.5px_var(--warn),var(--shadow)]" role="alert">{t(error)}</p>)}
            <fieldset className="m-0 min-w-0 border-0 p-0" disabled={busy}>
              <legend className={cx(stepTitleClass, "p-0")}>{t("1. 填写词条")}</legend>
              <p className={cx(hintClass, "mt-1.5 text-sm")}>{t(`每行一个词条，最多 ${MAX_ENTRIES} 个。词语只能是汉字（最多 ${MAX_WORD_LENGTH} 个字）；拼音必须填写，每个字一个音节，音节之间用空格或 ' 分隔；连写时只有一种切分方式的会自动分开，ü 写作 v。`)}</p>
              <ol className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
                {rows.map((row, index) => <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 gap-y-2 rounded-field bg-panel-2/60 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                  <label className={cx(fieldLabelClass, "col-span-2 md:col-span-1")}>{t(`词语 ${index + 1}`)}
                    <input className={cx(inputClass, "bg-panel")} name={`word-${row.id}`} value={row.word} maxLength={MAX_WORD_LENGTH * 2} placeholder={t("例如：未来可期")} autoComplete="off" spellCheck={false} aria-invalid={Boolean(rowErrors[row.id]?.word)} aria-describedby={rowErrors[row.id]?.word ? `word-error-${row.id}` : undefined} onChange={event => updateRow(row.id, { word: event.target.value })} />
                  </label>
                  <label className={fieldLabelClass}>{t("拼音")}
                    <input className={cx(inputClass, "bg-panel font-mono")} name={`pinyin-${row.id}`} value={row.pinyin} maxLength={200} placeholder="wei'lai'ke'qi" autoComplete="off" autoCapitalize="none" spellCheck={false} lang="zh-Latn-pinyin" aria-invalid={Boolean(rowErrors[row.id]?.pinyin)} aria-describedby={rowErrors[row.id]?.pinyin ? `pinyin-error-${row.id}` : undefined} onChange={event => updateRow(row.id, { pinyin: event.target.value })} />
                  </label>
                  <Button variant="ghost" size="sm" className="mb-1" aria-label={t(`移除词条 ${index + 1}`)} disabled={rows.length === 1} onClick={() => { setRows(items => items.filter(item => item.id !== row.id)); setRowErrors(errors => { const next = { ...errors }; delete next[row.id]; return next; }); }}>{t("移除")}</Button>
                  {t(rowErrors[row.id]?.word && <p id={`word-error-${row.id}`} className="col-span-full m-0 text-[13px] text-warn">{t(rowErrors[row.id]?.word)}</p>)}
                  {t(rowErrors[row.id]?.pinyin && <p id={`pinyin-error-${row.id}`} className="col-span-full m-0 text-[13px] text-warn">{t(rowErrors[row.id]?.pinyin)}</p>)}
                </li>)}
              </ol>
              <Button variant="secondary" size="sm" className="mt-3" disabled={rows.length >= MAX_ENTRIES} onClick={() => { const row = newRow(); setRows(items => [...items, row]); focus(`[name="word-${row.id}"]`); }}>{t(rows.length >= MAX_ENTRIES ? `已达 ${MAX_ENTRIES} 个上限` : "＋ 添加一行")}</Button>
              <label className={cx(fieldLabelClass, "mt-6")}>{t("备注或来源（可选）")}
                <input className={inputClass} name="note" value={note} maxLength={MAX_NOTE_LENGTH} placeholder={t("例如：网络流行语，或某部作品中的人名")} autoComplete="off" onChange={event => setNote(event.target.value)} />
              </label>
              <p className={cx(hintClass, "mt-1.5 text-[13px]")}>{t("帮助维护者判断词条的用途，会随提交公开。请不要填写联系方式或其他个人信息。")}</p>
            </fieldset>
            <h2 className={cx(stepTitleClass, "mt-8")}>{t("2. 确认并提交")}</h2>
            {t(preview.length > 0 && <>
              <p className={cx(hintClass, "mt-1.5")}>{t("将写入 words.txt 的内容（权重统一为 5000）：")}</p>
              <pre className="m-0 mt-2 overflow-x-auto rounded-field bg-panel-2 px-4 py-3 font-mono text-[13px] leading-[1.7] text-body [tab-size:12]">{preview.join("\n")}</pre>
            </>)}
            <fieldset className="m-0 mt-4 min-w-0 border-0 p-0" disabled={busy}>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-[1.75] text-body"><input className={cx(checkClass, "mt-1")} name="consent" type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /><span>{t("我同意将以上词条和备注公开发布到 GitHub，并理解词条需经维护者审核，可能不会被收录。")}</span></label>
            </fieldset>
            <div className="feedback-verification mt-5 flex flex-col items-start gap-2 rounded-field outline-none" tabIndex={-1}><div ref={widget} /><p className={hintClass} role="status">{t(status)}</p>
              {t(!token && widgetId.current !== undefined && <Button variant="ghost" size="sm" disabled={busy} onClick={() => { if (widgetId.current !== undefined) window.turnstile?.reset(widgetId.current); }}>{t("重新验证")}</Button>)}
            </div>
            {t(uncertain && <p className="m-0 mt-4 text-sm"><a href={PULLS_URL} target="_blank" rel="noreferrer">{t("先查看词库仓库的 Pull Request ↗")}</a></p>)}
            <Button type="submit" className="mt-6" disabled={busy}>{t(busy ? "正在提交…" : "提交词条")}</Button>
          </form>}
          <aside className="flex max-w-full min-w-0 flex-[1_1_300px] flex-col gap-3.5" aria-label={t("提交说明")}>
            <Card tone="muted" className="rounded-tile px-6 py-[22px]">
              <p className="m-0 text-[13px] text-muted">{t("提交到")}</p>
              <p className="m-0 mt-1.5 font-heading text-lg font-bold text-ink">{t("水杉输入法词库")}</p>
              <a className="mt-1.5 inline-block font-mono text-[13.5px]" href={PULLS_URL} target="_blank" rel="noreferrer">msime-dictionary ↗</a>
            </Card>
            <Card className="flex flex-col gap-4 rounded-tile px-6 py-[22px]">
              <Tip title="为什么要填拼音">{t("很多字有多个读音，自动注音容易出错。请按实际读音填写，例如“行长”应填 hang'zhang。")}</Tip>
              <Tip title="审核与生效">{t("维护者会检查用词、拼音和是否含敏感内容，词库仓库的自动检查会校验格式并与现有词库去重。合入后随下一个词库版本发布到所有平台。")}</Tip>
              <Tip title="隐私">{t("表单不收集联系方式。词条和备注会公开显示在 GitHub 上。")}</Tip>
              <Tip title="其他问题">{t("词语出现错误或想反馈其他问题，请使用")}<LocaleLink to="/feedback/">{t("Bug 与需求反馈")}</LocaleLink>{t("。")}</Tip>
            </Card>
          </aside>
        </Container>
      </main>
    </>
  );
}

function Tip({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useLocale();
  return (
    <div>
      <h2 className="m-0 font-heading text-[15.5px] font-bold text-ink">{t(title)}</h2>
      <p className="m-0 mt-1 text-sm leading-[1.75] text-body">{children}</p>
    </div>
  );
}
