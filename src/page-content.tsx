import { traditionalMarkdown } from "../shared/translate";
import { useLocale } from "./use-locale";
import { memo, useMemo, useRef, useState, type ReactNode } from "react";
import { renderContent, localizedHtml } from "./markdown";
import { usePageMeta } from "./page-meta";
import { useTocScrollSpy, withHeadingIds } from "./toc";
import { useInternalLinks } from "./use-internal-links";
import { TocNav } from "./toc-nav";
import { useReveal } from "./use-reveal";
import { cx } from "./ui";

type PageHeroProps = {
  kicker: string;
  title: string;
  /** Lead paragraph as inline HTML from this repository's markdown (docs and content pages). */
  leadHtml?: string;
  /** Lead paragraph as React content, for pages that write their copy in code. Ignored when `leadHtml` is given. */
  lead?: ReactNode;
  /**
   * `band`: full-width header with a hairline below it and the larger title (download, code, about, docs, content pages).
   * `plain`: the title opens the page column directly (feedback, words).
   */
  variant?: "band" | "plain";
  /** Column width: 1200px (`inner`) or 960px (`narrow`, FAQ and release notes). */
  width?: "inner" | "narrow";
  /** Extra content under the lead, inside the hero column. */
  children?: ReactNode;
};

/**
 * The inner-page header (design-home §6 "页头"): accent eyebrow, one h1, lead paragraph.
 *
 * `.page-hero`, `#page-kicker`, `#page-title` and `#page-lead` are test and markdown-export hooks; keep them. It fades in on client-side navigation only (`page-enter`), never on the prerendered first paint.
 */
export function PageHero({ kicker, title, leadHtml, lead, variant = "band", width = "inner", children }: PageHeroProps) {
  const { t, path } = useLocale();
  const band = variant === "band";
  return (
    <div className="page-hero" data-band={band || undefined}>
      <div
        className={cx(
          "page-enter mx-auto w-full px-[clamp(20px,4.4vw,48px)]",
          width === "narrow" ? "max-w-narrow" : "max-w-inner",
          band ? "pt-[clamp(48px,7vw,88px)] pb-[clamp(36px,5vw,56px)]" : "pt-[clamp(40px,6vw,72px)]"
        )}
      >
        <p className="m-0 text-sm font-semibold text-accent-ink" id="page-kicker">
          {t(kicker)}
        </p>
        <h1
          className={cx(
            "font-heading leading-[1.25] font-bold text-ink [word-break:keep-all] [overflow-wrap:anywhere]",
            band ? "mt-4 mb-3.5 text-[clamp(34px,4.6vw,54px)]" : "mt-3 mb-3.5 text-[clamp(32px,4.2vw,50px)]"
          )}
          id="page-title"
        >
          {t(title)}
        </h1>
        {leadHtml !== undefined ? (
          <p
            className={cx("m-0 leading-[1.85] text-body empty:hidden [&_a]:text-accent-ink", band ? "text-[17px]" : "text-[16.5px]")}
            id="page-lead"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: 首段是本仓库自带 markdown 渲染出来的行内标记，markdown-it 关掉了 html 透传
            dangerouslySetInnerHTML={{ __html: localizedHtml(leadHtml, path) }}
          />
        ) : (
          <p className={cx("m-0 leading-[1.85] text-body empty:hidden", band ? "text-[17px]" : "text-[16.5px]")} id="page-lead">
            {t(lead)}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

/** 侧栏里的小节索引，窄屏时折叠成一个可展开的按钮 —— 和文档页是同一个控件。 */
function SectionIndex({
  entries,
  activeId,
  tocRef,
  sidebarRef,
  onSelect,
}: {
  entries: ReturnType<typeof withHeadingIds>["toc"];
  activeId: string | null;
  tocRef: React.RefObject<HTMLElement | null>;
  sidebarRef: React.RefObject<HTMLElement | null>;
  onSelect: (id: string) => void;
}) {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside
      className={`docs-sidebar${isOpen ? " is-open" : ""}`}
      ref={sidebarRef as React.RefObject<HTMLElement>}
      aria-label={t("本页小节")}
    >
      <button
        className="docs-toc-toggle"
        type="button"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((open) => !open);
        }}
      >
        <span>{t("本页小节")}</span>
        <span className="docs-toc-toggle-icon" aria-hidden="true">
          <svg viewBox="0 0 12 12" focusable="false" aria-hidden="true">
            <path d="M2.25 4.25 6 8l3.75-3.75" />
          </svg>
        </span>
      </button>

      <p className="m-0 mb-2 hidden pl-4 text-[13px] font-semibold text-muted 2xl:block" aria-hidden="true">
        {t("本页小节")}
      </p>
      <TocNav
        entries={entries}
        activeId={activeId}
        tocRef={tocRef}
        onSelect={onSelect}
        onNavigateNarrow={() => {
          setIsOpen(false);
        }}
      />
    </aside>
  );
}

/**
 * 渲染 markdown 正文的那个 article。
 *
 * 必须 memo：React 更新这个元素时会重新写一遍 innerHTML，把里面的节点整批换掉。入场动画是靠摘掉节点上的 `data-reveal` 实现的 —— 那是 React 不知道的 DOM 改动，一旦重写就被抹掉，而 useReveal 的依赖没变、不会重新登记，整篇正文就永远停在 opacity: 0。加了小节索引之后父组件多了 activeId 这个状态，这条路径才第一次被走到。
 *
 * 包一层 memo 之后，只有 html 真的变了才重渲染，父组件因为高亮变化重渲染时它一动不动。
 */
const MarkdownArticle = memo(function MarkdownArticle({
  html,
  id,
  className,
  articleRef,
}: {
  html: string;
  id: string;
  className: string;
  articleRef: React.RefObject<HTMLElement | null>;
}) {
  return (
    <article
      className={className}
      id={id}
      ref={articleRef as React.RefObject<HTMLElement>}
      aria-live="polite"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: 正文是本仓库自带 markdown 渲染出来的，markdown-it 关掉了 html 透传
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

type ContentPageProps = {
  /** Keep download actions and instructions in one surface, without a sidebar. */
  continuous?: boolean;
  documentTitle: string;
  description: string;
  kicker: string;
  /** 正文 markdown。下载页要等发布清单到位，这期间是 null，正文先留空。 */
  source: string | null;
  /** 页头取自另一份 markdown。下载页的正文会随清单重渲染，页头不该跟着闪。 */
  heroSource?: string;
  contentId: string;
  contentClass: string;
  /** 把每个二级标题及其后续内容包进独立卡片 */
  sectioned?: boolean;
  /** 开源代码页把列表项拆成仓库名和说明两行 */
  repoRows?: boolean;
  /** 排在正文之前、跨满整幅宽度的内容，目前只有下载页的下载入口用到 */
  banner?: ReactNode;
};

/**
 * 关于 / 开源代码 / 价格 / 隐私说明 / 下载共用的版式。
 *
 * 布局和文档页是同一套：左侧粘性小节索引，右侧正文。这既把一行压回 40 出头个汉字（整幅铺满时是 65 个，视线扫回行首容易串行），又不会像单纯收窄那样在两侧空出半屏 —— 多出来的宽度拿去放索引，而不是留白。
 */
export function ContentPage({
  documentTitle,
  description,
  kicker,
  source,
  heroSource,
  contentId,
  contentClass,
  sectioned = false,
  repoRows = false,
  banner,
  continuous = false,
}: ContentPageProps) {
  const { t, tw, path } = useLocale();
  const articleRef = useRef<HTMLElement>(null);
  const tocRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const content = useMemo(() => {
    if (source === null) return { title: "", leadHtml: "", html: "", toc: [] };
    const rendered = renderContent(tw ? traditionalMarkdown(source) : source, { sectioned, repoRows, localePath: path });
    // 只索引二级标题：内容页里每个二级标题就是一张卡片，把卡内小标题也列上会让索引失去概览的作用
    return { ...rendered, ...withHeadingIds(rendered.bodyHtml, "h2") };
  }, [source, sectioned, repoRows, tw, path]);

  const hero = useMemo(
    () => (heroSource === undefined ? content : renderContent(tw ? traditionalMarkdown(heroSource) : heroSource, { localePath: path })),
    [heroSource, content, tw, path]
  );

  const { activeId, lockUntilScrollEnds } = useTocScrollSpy(content.toc, articleRef, tocRef, sidebarRef);
  useInternalLinks(articleRef);

  usePageMeta(documentTitle, description);
  useReveal([content]);

  // 有两节以上就给索引。这不只是导航，也是这一栏宽度的用处：不放索引就得让正文自己撑满整幅，一行又回到 65 个汉字；只收窄不填东西，两侧就白空半屏。
  const hasIndex = !continuous && content.toc.length >= 2;

  const article = <MarkdownArticle className={`docs-content ${contentClass}`} id={contentId} html={content.html} articleRef={articleRef} />;

  return (
    <>
      <PageHero kicker={kicker} title={t(hero.title)} leadHtml={hero.leadHtml} />
      <main className="w-full pt-[clamp(28px,4vw,48px)]">
        <div className={cx("mx-auto w-full px-[clamp(20px,4.4vw,48px)]", continuous ? "max-w-[1120px]" : "max-w-inner", hasIndex && "docs-shell")}>
          {continuous ? (
            <div className="content-flow rounded-panel bg-panel p-[clamp(20px,4vw,40px)] shadow-card">
              {banner}
              {article}
            </div>
          ) : (
            <>
              {t(banner)}
              {t(
                hasIndex && (
                  <SectionIndex entries={content.toc} activeId={activeId} tocRef={tocRef} sidebarRef={sidebarRef} onSelect={lockUntilScrollEnds} />
                )
              )}
              {article}
            </>
          )}
        </div>
      </main>
    </>
  );
}
