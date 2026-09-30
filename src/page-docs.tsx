import windowsGuideTw from "../vendor/MSIME-Docs/guides/zh-TW/windows.md?raw";
import macosGuideTw from "../vendor/MSIME-Docs/guides/zh-TW/macos.md?raw";
import macosVoiceGuideTw from "../vendor/MSIME-Docs/guides/zh-TW/macos-voice.md?raw";
import linuxGuideTw from "../vendor/MSIME-Docs/guides/zh-TW/linux.md?raw";
import { LocaleLink as Link } from "./locale-link";
import { useLocale } from "./use-locale";
import { useNavigate, useSearch, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import linuxGuide from "../vendor/MSIME-Docs/guides/linux.md?raw";
import macosGuide from "../vendor/MSIME-Docs/guides/macos.md?raw";
import macosVoiceGuide from "../vendor/MSIME-Docs/guides/macos-voice.md?raw";
import windowsGuide from "../vendor/MSIME-Docs/guides/windows.md?raw";
import { renderContent } from "./markdown";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { linkGuideCrossReferences, useTocScrollSpy, withHeadingIds } from "./toc";
import { useInternalLinks } from "./use-internal-links";
import { TocNav } from "./toc-nav";
import { DocsControlBar, faqPlatformForGuide, platformRowClass, platformTabClass } from "./docs/control-bar";
import { TocSelect } from "./docs/toc-select";
import { ExternalIcon, LinkButton } from "./ui";

// The site distributes Windows, macOS and Linux builds, but this page only ever rendered the Windows guide -- the other three guides were written and sitting in the submodule unreferenced.
// `heading` and `lead` are per guide because the hero used to be one hard-coded string: four URLs with four different <title>s all opened on the same H1, "水杉输入法使用文档", and the same summary. The wording tracks each guide's own sections.
const GUIDES = [
  { id: "windows", label: "Windows", file: "windows.md", source: windowsGuide, heading: "Windows 使用指南", lead: "在 Windows 上安装水杉输入法，配置输入方案、词库与设置窗口，以及更新、备份与故障排查。" },
  { id: "macos", label: "macOS", file: "macos.md", source: macosGuide, heading: "macOS 使用指南", lead: "在 macOS 上安装并启用水杉输入法，了解常用操作、设置与候选窗口、本地快捷模式，以及更新与卸载。" },
  { id: "macos-voice", label: "macOS 语音", file: "macos-voice.md", source: macosVoiceGuide, heading: "macOS 语音输入指南", lead: "配置云端识别或本地 Whisper 模型，使用快捷键录音上屏，并了解麦克风权限与数据去向。" },
  { id: "linux", label: "Linux", file: "linux.md", source: linuxGuide, heading: "Linux 使用指南", lead: "在 Linux 上通过 IBus 启用水杉输入法，配置输入与辅助码、联网功能与桌面工具，以及数据、升级和故障排查。" },
] as const;

const GUIDE_IDS = GUIDES.map((guide) => guide.id);

export function DocsPage() {
  const { t, tw, path } = useLocale();
  const { platform } = useSearch({ strict: false });
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const guideId = params.guide ?? platform;
  useEffect(() => {
    if (platform && !params.guide) void navigate({ to: tw ? "/zh-TW/docs/$guide/" : "/docs/$guide/", params: { guide: platform }, search: previous => ({ ...previous, platform: undefined }), replace: true, hash: window.location.hash.slice(1) });
  }, [platform, params.guide, navigate, tw]);

  const articleRef = useRef<HTMLElement>(null);
  const tocRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const guide = useMemo(() => GUIDES.find((candidate) => candidate.id === guideId) ?? GUIDES[0], [guideId]);
  const content = useMemo(() => {
    const translated = { windows: windowsGuideTw, macos: macosGuideTw, "macos-voice": macosVoiceGuideTw, linux: linuxGuideTw };
    const rendered = renderContent(tw ? translated[guide.id] : guide.source, { localePath: path });
    const linked = linkGuideCrossReferences(rendered.bodyHtml, GUIDE_IDS, tw ? "/zh-TW" : "");
    return { ...rendered, ...withHeadingIds(linked) };
  }, [guide, tw, path]);
  // React 19 compares `dangerouslySetInnerHTML` by object identity and rewrites innerHTML whenever the object changes. The scroll spy re-renders this page on every section change, so fresh objects would replace the article's nodes each time and leave the spy watching detached headings.
  const introMarkup = useMemo(() => ({ __html: content.leadHtml }), [content]);
  const bodyMarkup = useMemo(() => ({ __html: content.html }), [content]);

  const { activeId, lockUntilScrollEnds } = useTocScrollSpy(content.toc, articleRef, tocRef, sidebarRef);
  useInternalLinks(articleRef);

  usePageMeta(guideId ? `${guide.label} 使用指南 | 水杉输入法` : "文档 | 水杉输入法", guideId ? `水杉输入法 ${guide.label} 使用指南：安装、配置、输入与常见问题排查。` : "水杉输入法 Windows、macOS、macOS 语音与 Linux 使用指南，选择平台查看安装和配置方法。");

  if (guideId && !GUIDES.some(item => item.id === guideId)) {
    return (
      <main className="mx-auto w-full max-w-inner px-[clamp(20px,4.4vw,48px)] pt-[clamp(48px,7vw,88px)]">
        <h1 className="m-0 font-heading text-[clamp(32px,4.2vw,50px)] leading-[1.25] font-bold text-ink">{t("指南不存在")}</h1>
        <p className="m-0 mt-3.5 text-[16.5px] leading-[1.85] text-body">{t("这个地址没有对应的使用指南。可以从 Windows 使用指南开始，再用页面顶部的平台切换查看其他系统。")}</p>
        <LinkButton className="mt-7" to="/docs/$guide/" params={{ guide: "windows" }}>{t("查看 Windows 使用指南")}</LinkButton>
      </main>
    );
  }

  const sourcePath = `guides/${tw ? "zh-TW/" : ""}${guide.file}`;

  return (
    <main className="w-full">
      <DocsControlBar section="guide" guide={guide.id} faqPlatform={faqPlatformForGuide(guide.id)}>
        <nav className={platformRowClass} id="docs-platforms" aria-label={t("平台")}>
          {GUIDES.map(candidate => (
            <Link key={candidate.id} className={`docs-platform ${platformTabClass(candidate.id === guide.id)}`} to="/docs/$guide/" params={{ guide: candidate.id }} resetScroll={false} aria-current={candidate.id === guide.id ? "page" : undefined}>{t(candidate.label)}</Link>
          ))}
        </nav>
      </DocsControlBar>

      <PageHero kicker="文档" title={t(guide.heading)} leadHtml={t(guide.lead)} />

      <div className="page-enter mx-auto w-full max-w-inner px-[clamp(20px,4.4vw,48px)] pt-[clamp(28px,4vw,44px)]">
        {/* Sticky sidebar index from 960px up (styles/shell.css); below that the panel opens with a <select> jump list instead, as in design-home §5.2. */}
        <div className="docs-shell">
          <aside className="docs-sidebar max-2xl:hidden" ref={sidebarRef} aria-label={t("文档目录")}>
            <TocNav entries={content.toc} activeId={activeId} tocRef={tocRef} onSelect={lockUntilScrollEnds} />
          </aside>

          <div className="rounded-panel bg-panel p-[clamp(24px,3.4vw,44px)_clamp(20px,3.6vw,48px)_40px] shadow-hair">
            <TocSelect entries={content.toc} activeId={activeId} onSelect={lockUntilScrollEnds} className="mb-6 2xl:hidden" />

            {/* No reveal on the guide body: the whole article has to be readable as soon as it is on screen (design-home §12.6). */}
            <article className="docs-content docs-article m-0 rounded-none bg-transparent p-0 shadow-none" id="docs-content" ref={articleRef} aria-live="polite">
              <header className="docs-guide-intro mb-3.5">
                <h2 className="m-0 mb-2 font-sans text-[13px] leading-normal font-semibold tracking-[.08em] text-accent-ink">{t(`${guide.label} 使用指南`)}</h2>
                {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 简介来自固定 MSIME-Docs gitlink，markdown-it 禁用 HTML 透传 */}
                <div dangerouslySetInnerHTML={introMarkup} />
              </header>
              {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 正文来自固定 MSIME-Docs gitlink，markdown-it 禁用 HTML 透传 */}
              <div dangerouslySetInnerHTML={bodyMarkup} />
            </article>

            <p className="m-0 mt-10 pt-[18px] text-[13.5px] leading-[1.8] text-muted shadow-divider-t">
              {t("内容来自 MSIME-Docs 仓库的 ")}
              <a className="inline-flex items-center gap-1 font-mono text-[13px] text-accent-ink hover:text-ink" href={`https://github.com/metasequoiaime/MSIME-Docs/blob/main/${sourcePath}`} target="_blank" rel="noreferrer">
                {sourcePath}
                <ExternalIcon size={12} />
              </a>
              {t("，随官网发布同步更新。")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
