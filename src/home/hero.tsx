import { useCallback, useRef, useState } from "react";
import { PLATFORM_CATALOG, PLATFORM_NAMES, SITE_PLATFORMS } from "../data/platforms";
import { LocaleLink } from "../locale-link";
import { recognizePlatform } from "../platform";
import { useLocale } from "../use-locale";
import { useSearchReady } from "../use-page-search";
import { AnchorButton, Container, DownloadIcon, LinkButton, PlatformIcon, buttonClass, cx } from "../ui";
import { CommunityLinks } from "./community-links";
import { HeroDemo } from "./hero-demo";
import { type HeroFrame, LANGUAGES, SCHEMES, type SchemeId, useHeroCycle } from "./hero-cycle";

/**
 * 首屏的「下载」按钮：认出访客的系统就换成该平台的标志，带着 `?platform=` 去下载页的对应平台，那里列着 GitHub 之外的各个下载途径；iOS 直接去 TestFlight，Android 直接去蒲公英。还没发布安装包的平台（HarmonyOS）退回普通的「下载」。静态 HTML 和水合前的第一次渲染都是指向 /download/ 的普通「下载」，认不出系统时也退回它，所以预渲染出来的页面与水合结果一致。
 */
function HeroDownloadButton() {
  const { t } = useLocale();
  const hydrated = useSearchReady();
  const platform = hydrated ? recognizePlatform() : null;
  const className = "shadow-btn";

  if (platform && PLATFORM_CATALOG[platform].distribution !== "source") {
    const label = t(`下载 ${PLATFORM_NAMES[platform]} 端`);
    const logo = <PlatformIcon platform={platform} size={19} />;
    if (platform === "ios" || platform === "android")
      return (
        <AnchorButton href={PLATFORM_CATALOG[platform].href} size="lg" className={className}>
          {logo}
          {label}
        </AnchorButton>
      );
    return (
      <LinkButton to="/download/" search={{ platform }} size="lg" className={className}>
        {logo}
        {label}
      </LinkButton>
    );
  }
  return (
    <LinkButton to="/download/" size="lg" className={className}>
      <DownloadIcon size={17} strokeWidth={2} />
      {t("下载")}
    </LinkButton>
  );
}

/**
 * One animated slot of the headline. Every candidate word is stacked invisibly in the same grid cell through pseudo-elements, so the slot is always as wide as its longest word and typing never reflows the heading. Pseudo-element text stays out of the DOM text, so the heading's text content is only what is shown.
 */
function Slot({ text, caret, ghosts }: { text: string; caret: boolean; ghosts: string }) {
  return (
    <span className={cx("inline-grid justify-items-start whitespace-nowrap before:invisible before:[grid-area:1/1] after:invisible after:[grid-area:1/1]", ghosts)}>
      <span className="[grid-area:1/1]">
        {text}
        {/* Zero net width: the negative margin cancels the caret's own width, so it never pushes the next word. */}
        <span
          className={cx("ml-[0.04em] mr-[-0.1em] inline-block h-[0.92em] w-[0.06em] bg-accent align-[-0.1em]", !caret && "invisible")}
          aria-hidden="true"
        />
      </span>
    </span>
  );
}

/** Tailwind needs the ghost words spelled out literally; the zh-TW scheme names are the same two-character width. */
const SCHEME_GHOSTS = "before:content-['全拼'] after:content-['五笔']";
const LANGUAGE_GHOSTS = "before:content-['English'] after:content-['日本語']";

function Headline({ frame }: { frame: HeroFrame }) {
  const { t } = useLocale();
  const schemes = (Object.keys(SCHEMES) as SchemeId[]).map((id) => t(SCHEMES[id].word)).join("、");
  const languages = `${LANGUAGES.en}${t("或")}${LANGUAGES.ja}`;

  return (
    // Capped by the column width so both lines (the second is about 11.3em with "English") stay on one line each, down to 320px.
    <h1 className="m-0 mt-6 font-heading text-[clamp(22px,min(7vw,8.1cqi),60px)] leading-[1.22] font-bold tracking-[-.01em] text-ink">
      <span className="block">{t("您的下一代多语言输入法")}</span>
      <span className="block">
        {/* "用全拼输入，译成 English": the scheme you type with, then the language the candidates are glossed in. Screen readers get the whole set once instead of the rotating words. */}
        <span className="sr-only">{t(`用${schemes}输入，译成${languages}`)}</span>
        <span aria-hidden="true">
          <span className="text-accent-ink">
            <Slot text={frame.schemeText} caret={frame.caret === "scheme"} ghosts={SCHEME_GHOSTS} />
          </span>
          {t("输入，译成")}
          {/* A thin gap between the Chinese and the language name, the usual spacing between CJK and Latin text. */}
          <span className="ml-[0.18em] text-accent-ink">
            <Slot text={frame.languageText} caret={frame.caret === "language"} ghosts={LANGUAGE_GHOSTS} />
          </span>
        </span>
      </span>
    </h1>
  );
}

const PLATFORM_LIST = SITE_PLATFORMS.map((id) => PLATFORM_NAMES[id]);

export function HomeHero() {
  const { t } = useLocale();
  const hero = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const schemeWord = useCallback((id: SchemeId) => t(SCHEMES[id].word), [t]);
  const frame = useHeroCycle(hero, schemeWord, hovering);

  return (
    <Container as="section" width="page" className="page-enter pt-[clamp(32px,4vw,56px)]">
      <div ref={hero} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-center gap-[clamp(28px,4vw,72px)]">
        <div className="rise-enter @container min-w-0">
          <CommunityLinks />
          <Headline frame={frame} />
          <p className="m-0 mt-6 text-[clamp(16px,1.4vw,18px)] leading-[1.85] text-body">
            {t(`面向 ${PLATFORM_LIST.slice(0, -1).join("、")} 与 ${PLATFORM_LIST.at(-1)}`)}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <HeroDownloadButton />
            <LocaleLink to="/download/" className={buttonClass({ variant: "secondary", size: "lg" })}>
              {t("更多平台")}
              <span aria-hidden="true" className="-ml-0.5 text-[1.2em] leading-none">
                ›
              </span>
            </LocaleLink>
          </div>
        </div>

        <HeroDemo frame={frame} onHover={setHovering} />
      </div>
    </Container>
  );
}
