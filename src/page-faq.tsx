import { usePageSearch } from "./use-page-search";
import traditionalFaqSource from "../vendor/MSIME-Docs/guides/zh-TW/faq.md?raw";
import { useLocale } from "./use-locale";
import { serializeJsonLd } from "../shared/site-seo";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import faqSource from "../vendor/MSIME-Docs/guides/faq.md?raw";
import { renderContent } from "./markdown";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { withHeadingIds } from "./toc";
import { useInternalLinks } from "./use-internal-links";
import { DocsControlBar, guideForFaqPlatform, platformRowClass, platformTabClass } from "./docs/control-bar";
import { AnchorButton, ExternalIcon, LinkButton, SearchIcon, cx } from "./ui";

const platforms = ["Windows", "macOS", "Linux", "iOS", "Android"] as const;
const platformIds = ["windows", "macos", "linux", "ios", "android"] as const;
const categoryIds = ["fonts", "installation", "input", "data"] as const;

type Question = { id: string; title: string; category: string; html: string; text: string };

function readFaq(source: string, path: string) {
  const content = renderContent(source, { localePath: path });
  const holder = document.createElement("div");
  holder.innerHTML = withHeadingIds(content.bodyHtml).html;
  const questions: Question[] = [];
  let category = "";
  let current: Question | undefined;
  for (const element of Array.from(holder.children)) {
    if (element.tagName === "H2") { category = element.textContent ?? ""; current = undefined; }
    else if (element.tagName === "H3") {
      current = { id: element.id, title: element.textContent ?? "", category, html: "", text: "" };
      questions.push(current);
    } else if (current) {
      current.html += element.outerHTML;
      current.text += ` ${element.textContent ?? ""}`;
    }
  }
  return { ...content, questions, categories: [...new Set(questions.map(question => question.category))] };
}

/** Where each platform's existing reports live, for "search existing feedback" links. Windows ships from msime-windows; every other platform is developed in msime. */
const issuesUrl = (platform: (typeof platforms)[number]) =>
  platform === "Windows" ? "https://github.com/metasequoiaime/MSIME-Windows/issues" : "https://github.com/metasequoiaime/msime/issues";

const chipClass = (selected: boolean) =>
  cx(
    "inline-flex h-8 cursor-pointer items-center rounded-full border-0 px-3 text-[13.5px] leading-none whitespace-nowrap transition-colors duration-150 pointer-coarse:h-10",
    selected ? "bg-btn text-btn-fg" : "bg-transparent text-body shadow-ring-2 hover:bg-panel-2 hover:text-ink"
  );

/**
 * One answer body. Memoised because React 19 rewrites innerHTML whenever the `dangerouslySetInnerHTML` object changes, and the page re-renders on every expand, search keystroke and filter; without it every open answer would rebuild its DOM (and re-decode its screenshots) each time.
 */
const FaqAnswer = memo(function FaqAnswer({ html }: { html: string }) {
  return (
    <div
      className="docs-content faq-answer text-[15px] leading-[1.9] [overflow-wrap:anywhere] [&>:first-child]:mt-0 [&_a:has(img)]:block [&_a:has(img)]:w-fit [&_a:has(img)]:max-w-full [&_a:has(img)]:cursor-zoom-in [&_img]:mx-0 [&_img]:w-auto [&_img]:max-w-full"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: 正文来自 MSIME-Docs，markdown-it 禁用 HTML 透传
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

export function FaqPage() {
  const { t, tw, path } = useLocale();
  usePageMeta("常见问题 Q&A | 水杉输入法", "水杉输入法常见问题：字体方框、安装启动、快捷键、候选与翻译排查。");
  const faq = useMemo(() => readFaq(tw ? traditionalFaqSource : faqSource, path), [tw, path]);
  const { choice, get, update } = usePageSearch();
  const platformId = choice("platform", platformIds, "windows");
  const platform = platforms[platformIds.indexOf(platformId)];
  const query = get("q");
  const categoryId = choice("category", ["", ...categoryIds] as const, "");
  const category = categoryId ? faq.categories[categoryIds.indexOf(categoryId)] ?? "" : "";
  const setQuery = (value: string) => update({ q: value || undefined }, true, false);
  const setCategory = (value: string) => update({ category: categoryIds[faq.categories.indexOf(value)] }, false, false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const root = useRef<HTMLDivElement>(null);
  useInternalLinks(root);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reveal only on document or hash changes, not filtering.
  useEffect(() => {
    const revealHash = () => {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      if (!faq.questions.some(question => question.id === id)) return;
      update({ platform: "windows", q: undefined, category: undefined }, true);
      setExpanded(previous => new Set([...previous, id]));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    };
    revealHash();
    window.addEventListener("hashchange", revealHash);
    return () => window.removeEventListener("hashchange", revealHash);
  }, [faq]);

  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const platformQuestions = platform === "Windows" ? faq.questions : [];
  const matches = platformQuestions.filter(question => (!category || question.category === category) && words.every(word => `${question.title} ${question.text}`.toLocaleLowerCase().includes(word)));
  const allExpanded = matches.length > 0 && matches.every(question => expanded.has(question.id));
  const guide = guideForFaqPlatform(platformId);
  const sourcePath = `guides/${tw ? "zh-TW/" : ""}faq.md`;
  const sourceUrl = `https://github.com/metasequoiaime/MSIME-Docs/blob/main/${sourcePath}`;
  const feedbackTarget = platform === "macOS" || platform === "iOS" ? "apple" : platform === "Linux" ? "linux" : platform === "Windows" ? "windows" : undefined;

  return <>
    {platformQuestions.length > 0 && <script type="application/ld+json">{serializeJsonLd({ "@context": "https://schema.org", "@type": "FAQPage", "@id": `https://msime.app${path}#faq`, mainEntity: platformQuestions.map(question => ({ "@type": "Question", name: question.title, acceptedAnswer: { "@type": "Answer", text: question.text.trim() } })) })}</script>}
    <main className="w-full">
      <DocsControlBar section="faq" guide={guide ?? "windows"} faqPlatform={platformId}>
        {/* The radios are the platform switcher; tests pin their names, values and order (Windows, macOS, Linux, iOS, Android). */}
        <fieldset className={cx("m-0 border-0 p-0", platformRowClass)}>
          <legend className="sr-only">{t("选择平台")}</legend>
          {platforms.map(value => (
            <label key={value} className={cx(platformTabClass(platform === value), "cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent")}>
              <input className="sr-only" type="radio" name="faq-platform" value={value} checked={platform === value} onChange={() => { update({ platform: platformIds[platforms.indexOf(value)], q: undefined, category: undefined }, false, false); setExpanded(new Set()); }} />
              <span>{value}</span>
            </label>
          ))}
        </fieldset>
      </DocsControlBar>

      <PageHero kicker="使用帮助" title={t(faq.title)} leadHtml={t("先选择你使用的平台，再搜索问题或按分类查看排查步骤。")} width="narrow" />

      <div className="page-enter mx-auto w-full max-w-narrow px-[clamp(20px,4.4vw,48px)] pt-[clamp(28px,4vw,44px)]" ref={root}>
        {platformQuestions.length > 0 && <>
          <section className="rounded-panel bg-panel p-[clamp(16px,2.4vw,22px)] shadow-card" aria-label={t("查找问题")}>
            <label className="sr-only" htmlFor="faq-search">{t("搜索常见问题")}</label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-[13px] left-3.5 text-muted" />
              <input id="faq-search" className="block h-11 w-full rounded-field border-0 bg-panel-2 pr-3.5 pl-[42px] font-[inherit] text-base text-ink placeholder:text-muted md:text-[15px] [&::-webkit-search-cancel-button]:cursor-pointer [&::-webkit-search-cancel-button]:grayscale" type="search" placeholder={t("搜索问题，例如 方框、快捷键、翻译")} value={query} onChange={event => setQuery(event.target.value)} />
            </div>
            <fieldset className="m-0 mt-3 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
              <legend className="sr-only">{t("问题分类")}</legend>
              {["", ...faq.categories].map(value => <button key={value} type="button" className={chipClass(category === value)} aria-pressed={category === value} onClick={() => setCategory(value)}>{t(value || "全部问题")}</button>)}
            </fieldset>
          </section>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-muted">
            <p className="m-0" role="status">{t(`${platform} · 共 ${matches.length} 个问题`)}</p>
            <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-sm text-accent-ink hover:text-ink disabled:cursor-default disabled:opacity-45" disabled={!matches.length} onClick={() => setExpanded(previous => allExpanded ? new Set([...previous].filter(id => !matches.some(question => question.id === id))) : new Set([...previous, ...matches.map(question => question.id)]))}>{t(allExpanded ? "全部收起" : "展开全部结果")}</button>
          </div>
        </>}

        {faq.categories.map(group => {
          const items = matches.filter(question => question.category === group);
          return items.length > 0 && <section className="mt-6" key={group} aria-label={t(group)}>
            <h2 className="m-0 mb-2.5 text-[13px] leading-normal font-semibold tracking-[.08em] text-accent-ink">{t(group)}</h2>
            <div className="overflow-hidden rounded-group bg-panel shadow-hair">
              {items.map(question => <details className="group not-first:shadow-divider-t" key={question.id} id={question.id} open={expanded.has(question.id)} onToggle={event => {
                const open = event.currentTarget.open;
                setExpanded(previous => { if (previous.has(question.id) === open) return previous; const next = new Set(previous); if (open) next.add(question.id); else next.delete(question.id); return next; });
              }}>
                <summary className="flex cursor-pointer list-none items-center gap-3.5 px-[clamp(16px,2.4vw,22px)] py-[18px] transition-colors duration-150 hover:bg-panel-2 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1 text-base leading-[1.55] font-semibold text-ink [overflow-wrap:anywhere]">{t(question.title)}</span>
                  <span className="grid size-7 flex-none place-items-center rounded-full bg-panel-2 text-accent-ink transition-transform duration-200 group-open:rotate-45 group-open:bg-accent-soft" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" focusable="false" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </summary>
                <div className="px-[clamp(16px,2.4vw,22px)] pb-[22px]">
                  <FaqAnswer html={question.html} />
                  <p className="m-0 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] leading-[1.8] text-muted">
                    <span>{t("来源：")}<a className="text-accent-ink hover:text-ink" href={sourceUrl} target="_blank" rel="noreferrer">{`MSIME-Docs · ${sourcePath}`} ↗</a></span>
                    <a className="text-accent-ink hover:text-ink" href={`#${question.id}`} aria-label={t(`问题链接：${question.title}`)}>{t("此问题链接")}</a>
                  </p>
                </div>
              </details>)}
            </div>
          </section>;
        })}

        {platformQuestions.length > 0 && !matches.length && <div className="mt-6 rounded-group bg-panel-2 px-6 py-9 text-center text-[15px] leading-[1.8] text-body">
          <p className="m-0">{t("没有找到相关问题，换个关键词试试，或直接提交反馈。")}</p>
          <button type="button" className="mt-4 cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[15px] text-accent-ink hover:text-ink" onClick={() => { update({ q: undefined, category: undefined }, false, false); }}>{t("清除筛选")}</button>
        </div>}

        {platformQuestions.length === 0 && <div className="rounded-group bg-panel-2 px-6 py-9 text-center text-[15px] leading-[1.8] text-body" role="status">
          <p className="m-0">{t(`${platform} 的常见问题正在整理中。可以先查看文档，或在 GitHub 搜索已有反馈。`)}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {platform === "macOS" && <LinkButton size="sm" to="/download/" search={{ platform: "macos" }}>{t("下载 macOS 版")}</LinkButton>}
            {platform === "iOS" && <LinkButton size="sm" to="/download/" search={{ platform: "ios" }}>{t("加入 iOS 公开测试")}</LinkButton>}
            <AnchorButton size="sm" variant="secondary" href={issuesUrl(platform)}>{t("在 GitHub 搜索已有反馈")}<ExternalIcon size={12} /></AnchorButton>
          </div>
        </div>}

        <section className="mt-10 rounded-panel bg-accent-soft p-[clamp(24px,3.4vw,36px)]">
          <h2 className="m-0 font-heading text-[21px] leading-[1.4] font-bold text-ink">{t("还没找到答案？")}</h2>
          <p className="m-0 mt-2 text-[15px] leading-[1.85] text-body">{t("遇到故障时，请带上版本号、复现步骤和截图。打不出来的词，可以直接补充到词库。")}</p>
          <div className="mt-[18px] flex flex-wrap gap-2.5">
            <LinkButton to="/feedback/" search={{ target: feedbackTarget }}>{t("提交问题或建议")}</LinkButton>
            <LinkButton variant="secondary" to="/words/">{t("补充词条")}</LinkButton>
            {guide && <LinkButton variant="secondary" to="/docs/$guide/" params={{ guide }}>{t(`查看 ${platform} 指南`)}</LinkButton>}
            {platform === "iOS" && <LinkButton variant="secondary" to="/download/" search={{ platform: "ios" }}>{t("查看 iOS 公开测试说明")}</LinkButton>}
            {platform === "Android" && <LinkButton variant="secondary" to="/download/" search={{ platform: "android" }}>{t("查看 Android 测试版安装说明")}</LinkButton>}
          </div>
        </section>
      </div>
    </main>
  </>;
}
