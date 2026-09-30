import { CommunitySection } from "./community-section";
import { PLATFORM_CATALOG, SITE_PLATFORMS, type Distribution } from "./data/platforms";
import { HeroDemo } from "./home/hero-demo";
import { LocaleLink } from "./locale-link";
import { usePageMeta } from "./page-meta";
import { useLocale } from "./use-locale";
import { useReveal } from "./use-reveal";
import { AnchorButton, Badge, Card, Container, DownloadIcon, Grove, LinkButton, LogoMark, Pill, SectionHeading, cx, type GroveTree } from "./ui";

const FEATURES = [
  {
    glyph: "译",
    title: "候选词翻译",
    desc: "竖排候选窗里，每个候选旁显示中文与所选语种的互译，最多两个简短释义。优先使用本地释义，未命中时可接入腾讯云 TMT 或自建 DeepLX。",
  },
  {
    glyph: "拼",
    title: "全拼 · 双拼 · 五笔",
    desc: "双拼支持小鹤 / 自然码 / 首道 / 微软；五笔 86 版。辅助码可选蓝天小雨点、自然码、首右 2.0、首右 Plus、小鹤，单码调序、双码筛选。",
  },
  {
    glyph: "云",
    title: "本地优先，云端可选",
    desc: "拼音转换、候选排序和词频学习都在本机完成。云候选、AI 联想、在线翻译与语音识别都能在设置中关闭；除云候选外，其余联网功能要你填好自己的凭据才会启用。",
  },
] as const;

/** How each platform reaches users today, shown as a small tag on its card. Android and HarmonyOS have no published package yet. */
const DISTRIBUTION_LABELS: Record<Distribution, { label: string; tone: "accent" | "neutral" }> = {
  release: { label: "可下载", tone: "accent" },
  testflight: { label: "TestFlight", tone: "accent" },
  source: { label: "开发中", tone: "neutral" },
};

/** The privacy banner's grove (viewBox 0 0 1200 400), drawn in the banner's glow colour. */
const BANNER_FAR: GroveTree[] = [[560, 247, 0.9], [640, 264, 0.8], [760, 230, 1], [880, 256, 0.85], [1000, 222, 1.05], [1120, 247, 0.9]];
const BANNER_NEAR: GroveTree[] = [[700, 145, 1.5], [830, 60, 2], [960, 128, 1.6], [1070, 43, 2.1]];

const SECTION_SPACING = "pt-[clamp(80px,10vw,128px)]";

export function HomePage() {
  const { t } = useLocale();
  usePageMeta();
  useReveal();

  return (
    <main className="w-full">
      <Container as="section" width="page" className="page-enter pt-[clamp(40px,6vw,80px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-center gap-[clamp(28px,4vw,72px)]">
          <div className="rise-enter @container min-w-0">
            <Badge>{t("开源中文输入法 · GPL-3.0")}</Badge>
            {/* The design's 4.4vw size, capped so the ten-character first clause always fits its column: on wide two-column layouts 4.4vw outgrows the column and would break the headline mid-word. */}
            <h1 className="m-0 mt-6 font-heading text-[clamp(34px,min(4.4vw,9.8cqi),64px)] leading-[1.18] font-bold tracking-[-.01em] text-ink">
              {t("改善中英文输入体验，")}
              <span className="text-accent-ink">{t("让翻译发生在打字时")}</span>
            </h1>
            <p className="m-0 mt-6 text-[clamp(16px,1.4vw,18px)] leading-[1.85] text-body">
              {t("面向 Windows、macOS、Linux、Android、iOS 与 HarmonyOS 开发，全拼、双拼、五笔都能用。候选词旁直接显示译文，不用切出去查。")}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <LinkButton to="/download/" size="lg" className="shadow-btn">
                {t("下载")}
                <DownloadIcon size={17} strokeWidth={2} />
              </LinkButton>
              <LinkButton to="/docs/$guide/" params={{ guide: "windows" }} variant="secondary" size="lg">
                {t("阅读文档")}
              </LinkButton>
            </div>
            <p className="m-0 mt-4 text-[13.5px] text-muted">Windows · macOS · Linux · Android · iOS · HarmonyOS</p>
          </div>

          <HeroDemo />
        </div>
      </Container>

      <Container as="section" width="page" className={SECTION_SPACING}>
        <div data-reveal>
          <SectionHeading id="home-features" title={t("打字、翻译、联想，在一个候选窗里完成")} />
        </div>
        <div className="mt-[clamp(32px,4vw,48px)] grid grid-cols-1 gap-4 lg:grid-cols-3" data-reveal-stagger>
          {FEATURES.map((feature) => (
            <Card key={feature.glyph} className="min-w-0 p-[clamp(24px,3vw,32px)]" data-reveal>
              <div className="grid size-11 place-items-center rounded-field bg-accent-soft text-lg font-bold text-accent" aria-hidden="true">
                {t(feature.glyph)}
              </div>
              <h3 className="m-0 mt-5 text-[21px] font-bold text-ink">{t(feature.title)}</h3>
              <p className="m-0 mt-2.5 text-[15.5px] leading-[1.9] text-body">{t(feature.desc)}</p>
            </Card>
          ))}
        </div>
      </Container>

      <Container as="section" width="page" className={SECTION_SPACING}>
        <div
          className="relative flex min-h-[clamp(320px,32vw,420px)] items-center overflow-hidden rounded-hero bg-[linear-gradient(135deg,var(--deep-a)_0%,var(--deep-b)_55%,var(--deep-c)_100%)]"
          data-reveal
        >
          <div className="pointer-events-none absolute -top-[30%] -right-[8%] aspect-square w-[70%] rounded-full bg-[radial-gradient(circle,var(--deep-glow),transparent_65%)] opacity-35" aria-hidden="true" />
          <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-[78%] w-full" viewBox="0 0 1200 400" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
            <Grove trees={BANNER_FAR} opacity={0.1} fill="var(--deep-glow)" />
            <Grove trees={BANNER_NEAR} opacity={0.2} fill="var(--deep-glow)" />
            <rect y="399" width="1200" height="1" style={{ fill: "var(--deep-glow)", opacity: 0.3 }} />
          </svg>
          <div className="relative min-w-0 flex-1 p-[clamp(32px,4.8vw,64px)]">
            <p className="m-0 text-sm font-semibold text-deep-glow">{t("100% 开源 · GPL-3.0")}</p>
            <h2
              id="home-privacy"
              className="m-0 mt-3 font-heading text-[clamp(26px,3.2vw,40px)] leading-[1.3] font-bold text-white [word-break:keep-all] [overflow-wrap:anywhere]"
            >
              {t("隐私边界，应该能被任何人读代码检查")}
            </h2>
            <p className="m-0 mt-4 max-w-[46em] text-base leading-[1.9] text-[#E4EEE6]">
              {t("默认开启的联网功能只有 Windows 与 Linux 的云候选：它把正在输入的拼音发给 Google 输入工具来补一个候选，不带已上屏的文字，可随时关闭。其余联网功能都要你主动开启，代码全部公开可查。")}
            </p>
            <div className="mt-[26px] flex flex-wrap gap-3">
              <LocaleLink
                to="/privacy/"
                className="inline-flex h-12 items-center rounded-btn bg-white px-[22px] text-[15.5px] font-semibold text-[#10231A] no-underline transition-colors hover:bg-[#EAF6EC] hover:text-[#10231A]"
              >
                {t("哪些数据会离开设备")}
              </LocaleLink>
              <LocaleLink
                to="/code/"
                className="inline-flex h-12 items-center rounded-btn px-[22px] text-[15.5px] text-white no-underline shadow-[inset_0_0_0_1px_rgba(255,255,255,.5)] transition-colors hover:bg-white/12 hover:text-white"
              >
                {t("看全部仓库")}
              </LocaleLink>
            </div>
          </div>
        </div>
      </Container>

      <Container as="section" width="page" className={SECTION_SPACING}>
        <div data-reveal>
          <SectionHeading
            id="home-platforms"
            title={t("六个平台，原生体验")}
            lead={t("macOS、Linux、Android、iOS 与 HarmonyOS 共用 Rust 输入引擎，Windows 版独立开发。")}
            action={
              <LinkButton to="/download/" variant="soft">
                {t("前往下载页 →")}
              </LinkButton>
            }
          />
        </div>
        <ul className="m-0 mt-8 grid list-none grid-cols-1 gap-3 p-0 xs:grid-cols-2 xl:grid-cols-3" data-reveal-stagger>
          {SITE_PLATFORMS.map((id) => {
            const platform = PLATFORM_CATALOG[id];
            const status = DISTRIBUTION_LABELS[platform.distribution];
            return (
              <Card as="li" key={id} className="min-w-0 rounded-tile p-6" data-reveal>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-accent-ink">{id}</span>
                  <Pill tone={status.tone}>{t(status.label)}</Pill>
                </div>
                <h3 className="m-0 mt-[22px] text-[22px] font-bold text-ink">{platform.name}</h3>
                <p className="m-0 mt-1.5 text-sm leading-[1.7] text-muted">{t(platform.host)}</p>
              </Card>
            );
          })}
        </ul>
      </Container>

      <CommunitySection />

      <Container as="section" width="page" className={cx(SECTION_SPACING, "text-center")}>
        <div data-reveal>
          <LogoMark size={72} className="mx-auto shadow-soft" />
          <h2 id="home-cta" className="m-0 mt-7 font-heading text-[clamp(28px,3.6vw,44px)] leading-[1.3] font-bold text-ink">
            {t("给打字换一种体验")}
          </h2>
          <p className="m-0 mt-3 text-base leading-[1.8] text-muted">{t("各平台独立发布 · GPL-3.0 开源")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton to="/download/" size="lg" className="shadow-btn">
              {t("立即下载")}
            </LinkButton>
            <AnchorButton href="https://github.com/metasequoiaime" variant="secondary" size="lg">
              GitHub
            </AnchorButton>
          </div>
        </div>
      </Container>
    </main>
  );
}
