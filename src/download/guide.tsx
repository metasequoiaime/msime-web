import { memo, useMemo, useRef } from "react";
import { traditionalMarkdown } from "../../shared/translate";
import { renderContent } from "../markdown";
import { PLATFORM_LABELS, type Platform } from "../platform";
import { cx } from "../ui";
import { useInternalLinks } from "../use-internal-links";
import { useLocale } from "../use-locale";
import type { GuideBlock, GuideSection } from "./template";

type Tone = "warn" | "safe" | "note";

/** Call-out styling per block heading (design-home §6: the amber "必备运行环境" card and the shield "安全提示" card). Any other heading is a neutral note. */
const TONES: Record<string, Tone> = {
  必备运行环境: "warn",
  安全提示: "safe",
  签名与校验: "safe",
};

const TONE_CLASS: Record<Tone, string> = {
  warn: "bg-warn-soft",
  safe: "bg-panel shadow-hair",
  note: "bg-panel-2",
};

function ToneIcon({ tone }: { tone: Tone }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", focusable: false } as const;
  if (tone === "warn")
    return (
      <svg aria-hidden="true" {...common} className="flex-none text-warn">
        <path d="M12 3.5 2.8 19.5h18.4z" />
        <path d="M12 10v4.2M12 17.2v.1" />
      </svg>
    );
  if (tone === "safe")
    return (
      <svg aria-hidden="true" {...common} className="flex-none text-accent">
        <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z" />
        <path d="m8.8 12 2.2 2.2 4.2-4.4" />
      </svg>
    );
  return (
    <svg aria-hidden="true" {...common} className="flex-none text-accent-ink">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8v.1" />
    </svg>
  );
}

/**
 * Markdown rendered from this repository's own `content/download.md` (markdown-it with `html: false`). Memoised on the HTML so that switching platforms, which only flips `hidden` on the sections, never rewrites the rendered nodes.
 */
const Prose = memo(function Prose({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cx("docs-content [&>:last-child]:mb-0", className)}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: 正文是本仓库自带 markdown 渲染出来的，markdown-it 关掉了 html 透传
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

function InstallShot() {
  const { t } = useLocale();
  return (
  <img
    src="/screenshots/install-finish-840w.webp"
    srcSet="/screenshots/install-finish-480.webp 480w, /screenshots/install-finish-840w.webp 840w, /screenshots/install-finish.webp 998w"
    sizes="(max-width: 900px) 92vw, 560px"
    width="998"
    height="767"
    loading="lazy"
    decoding="async"
    className="block h-auto w-full rounded-btn shadow-[var(--shadow),0_0_0_1px_var(--hair)]"
    alt={t("水杉输入法安装程序的完成页")}
  />
  );
}

function Callout({ block, html }: { block: GuideBlock; html: string }) {
  const { t } = useLocale();
  const tone = TONES[block.title] ?? "note";
  return (
    <section className={cx("min-w-0 rounded-tile p-[clamp(22px,3vw,32px)]", TONE_CLASS[tone])}>
      <h3 className="m-0 flex items-center gap-2.5 font-heading text-xl leading-[1.4] font-bold text-ink">
        <ToneIcon tone={tone} />
        {t(block.title)}
      </h3>
      <Prose html={html} className="mt-3.5 text-[15px] leading-[1.9] [&_h4]:mt-6 [&_h4]:text-base [&_pre]:text-[12.5px]" />
    </section>
  );
}

type RenderedSection = GuideSection & { introHtml: string; blockHtml: string[] };

function PlatformSection({ section, hidden, name }: { section: RenderedSection; hidden: boolean; name: string }) {
  const { t } = useLocale();
  const [main, ...callouts] = section.blocks;
  const [mainHtml, ...calloutHtml] = section.blockHtml;
  const heading = t(main ? `${main.title}（${name}）` : name);
  const withShot = section.platform === "windows";

  return (
    <section id={`download-${section.platform}`} hidden={hidden} aria-labelledby={`download-${section.platform}-title`} className="scroll-mt-[84px]">
      <div className={cx("grid items-start gap-[clamp(24px,4vw,48px)]", withShot && "grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))]")}>
        <div className="min-w-0">
          <h2 id={`download-${section.platform}-title`} className="m-0 font-heading text-2xl leading-[1.4] font-bold text-ink">
            {heading}
          </h2>
          {section.introHtml && <Prose html={section.introHtml} className="mt-3.5" />}
          {mainHtml && <Prose html={mainHtml} className="mt-3.5" />}
        </div>
        {withShot && <InstallShot />}
      </div>
      {callouts.length > 0 && (
        <div className="mt-[clamp(28px,4vw,48px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-4">
          {callouts.map((block, index) => (
            <Callout key={block.title} block={block} html={calloutHtml[index]} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * The installation guide under the platform picker (`#download-content`, a test hook).
 *
 * Every platform's section is always rendered, so the static HTML (and its markdown export) carries the whole guide, including the iOS TestFlight instructions the SEO test looks for. After hydration only the selected platform's section stays visible, plus the closing privacy note.
 */
export function DownloadGuide({ sections, platform, filter }: { sections: GuideSection[] | null; platform: Platform; filter: boolean }) {
  const { t, tw, path } = useLocale();
  const articleRef = useRef<HTMLElement>(null);
  useInternalLinks(articleRef);

  const rendered = useMemo<RenderedSection[] | null>(() => {
    if (!sections) return null;
    const html = (source: string) => (source ? renderContent(tw ? traditionalMarkdown(source) : source, { localePath: path }).bodyHtml : "");
    return sections.map((section) => ({ ...section, introHtml: html(section.intro), blockHtml: section.blocks.map((block) => html(block.body)) }));
  }, [sections, tw, path]);

  return (
    <article id="download-content" ref={articleRef} aria-live="polite" className="grid min-w-0 gap-[clamp(40px,5vw,64px)]">
      {rendered?.map((section, index) =>
        section.platform ? (
          <PlatformSection key={section.heading} section={section} name={PLATFORM_LABELS[section.platform]} hidden={filter && section.platform !== platform} />
        ) : (
          <section key={section.heading} aria-labelledby={`download-note-${index}`} className="rounded-tile bg-panel-2 p-[clamp(22px,3vw,32px)]">
            <h2 id={`download-note-${index}`} className="m-0 font-heading text-xl leading-[1.4] font-bold text-ink">
              {t(section.heading)}
            </h2>
            {section.introHtml && <Prose html={section.introHtml} className="mt-3 text-[15px] leading-[1.9]" />}
          </section>
        )
      )}
    </article>
  );
}
