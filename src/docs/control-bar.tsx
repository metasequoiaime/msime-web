import type { ReactNode } from "react";
import { LocaleLink as Link } from "../locale-link";
import { useLocale } from "../use-locale";
import { cx } from "../ui";

/** Guides published from MSIME-Docs. The FAQ's platform radios use their own ids (`src/page-faq.tsx`); these helpers translate between the two. */
export type GuideId = "windows" | "macos" | "macos-voice" | "linux";
export type FaqPlatformId = "windows" | "macos" | "linux" | "ios" | "android";

/** The FAQ platform a guide belongs to: the macOS voice guide is still macOS. */
export const faqPlatformForGuide = (guide: GuideId): FaqPlatformId => (guide === "macos-voice" ? "macos" : guide);

/** The guide for an FAQ platform, or null when MSIME-Docs has no guide for it yet (iOS, Android). */
export const guideForFaqPlatform = (platform: FaqPlatformId): GuideId | null =>
  platform === "windows" || platform === "macos" || platform === "linux" ? platform : null;

/** Classes for the row holding the platform tabs. Below 640px the row wraps under the segmented control, so it spans the full width and its tabs share it evenly instead of wrapping one tab onto a line of its own. */
export const platformRowClass = "flex min-w-0 flex-wrap gap-1 max-md:w-full max-md:flex-nowrap";

/** Classes for one platform tab (design-home §5.1): 36px high, accent tint when selected. Shared by the guide links and the FAQ radio labels. */
export const platformTabClass = (selected: boolean) =>
  cx(
    "inline-flex h-9 min-h-0 items-center justify-center rounded-tab border-0 px-3.5 py-0 max-md:flex-1 max-md:px-1.5 text-sm leading-none font-semibold whitespace-nowrap no-underline transition-colors duration-150 pointer-coarse:h-11",
    selected ? "bg-accent-soft text-accent-ink hover:text-accent-ink" : "bg-transparent text-muted hover:text-ink"
  );

const sectionTabClass = (selected: boolean) =>
  cx(
    "inline-flex h-10 items-center rounded-tab px-5 text-[15px] leading-none font-semibold whitespace-nowrap no-underline transition-[color,background-color,box-shadow] duration-150",
    selected ? "bg-panel text-ink shadow-tab hover:text-ink" : "bg-transparent text-muted hover:text-ink"
  );

type DocsControlBarProps = {
  /** Which half of the documentation area is showing. */
  section: "guide" | "faq";
  /** Guide the 使用指南 tab opens; the current guide on the docs page, the platform's guide (or Windows) on the FAQ. */
  guide: GuideId;
  /** Platform the 常见问题 tab opens with. */
  faqPlatform: FaqPlatformId;
  /** The platform switcher for this section: guide links on the docs page, `faq-platform` radios on the FAQ. */
  children: ReactNode;
};

/**
 * The control bar shared by the guides and the FAQ (design-home §5.1): a 使用指南 / 常见问题 segmented control on the left and the section's platform switcher on the right, wrapping under it on narrow screens.
 *
 * The two halves are separate routes (`/docs/<guide>/` and `/faq/`), so the segments are links and the current one carries `aria-current="page"`.
 */
export function DocsControlBar({ section, guide, faqPlatform, children }: DocsControlBarProps) {
  const { t } = useLocale();
  return (
    <div className="mx-auto flex w-full max-w-inner flex-wrap items-center justify-between gap-3 px-[clamp(20px,4.4vw,48px)] pt-6">
      <nav className="inline-flex max-w-full gap-1 rounded-btn bg-panel-2 p-[5px]" aria-label={t("文档分区")}>
        <Link className={sectionTabClass(section === "guide")} to="/docs/$guide/" params={{ guide }} aria-current={section === "guide" ? "page" : undefined}>
          {t("使用指南")}
        </Link>
        <Link className={sectionTabClass(section === "faq")} to="/faq/" search={{ platform: faqPlatform === "windows" ? undefined : faqPlatform }} aria-current={section === "faq" ? "page" : undefined}>
          {t("常见问题")}
        </Link>
      </nav>
      {children}
    </div>
  );
}
