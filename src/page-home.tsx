import { CommunitySection } from "./community-section";
import { PLATFORM_CATALOG, SITE_PLATFORMS, type Distribution } from "./data/platforms";
import { HomeHero } from "./home/hero";
import { LocaleLink } from "./locale-link";
import { usePageMeta } from "./page-meta";
import { useLocale } from "./use-locale";
import { useReveal } from "./use-reveal";
import { AnchorButton, Card, Container, Grove, LinkButton, LogoMark, Pill, PlatformIcon, SectionHeading, cx, type GroveTree } from "./ui";

const FEATURES = [
  {
    glyph: "译",
    title: "候选词翻译",
    desc: "每个候选旁显示互译，本地释义优先。",
  },
  {
    glyph: "拼",
    title: "全拼 · 双拼 · 五笔",
    desc: "多种双拼、86/98 五笔，外加六套辅助码，也能导入自己的方案。",
  },
  {
    glyph: "云",
    title: "本地优先，云端可选",
    desc: "转换与词频学习在本机完成，联网功能都能关。",
  },
] as const;

/** How each platform reaches users today, shown as a small tag on its card. Android and HarmonyOS have no published package yet; Web is a package developers embed in their own pages. */
const DISTRIBUTION_LABELS: Record<Distribution, { label: string; tone: "accent" | "neutral" }> = {
  release: { label: "可下载", tone: "accent" },
  testflight: { label: "TestFlight", tone: "accent" },
  source: { label: "开发中", tone: "neutral" },
  sdk: { label: "开发者接入", tone: "accent" },
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
      <HomeHero />

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
            <h2
              id="home-privacy"
              className="m-0 font-heading text-[clamp(26px,3.2vw,40px)] leading-[1.3] font-bold text-white [word-break:keep-all] [overflow-wrap:anywhere]"
            >
              {t("隐私边界，应该能被任何人读代码检查")}
            </h2>
            <p className="m-0 mt-4 max-w-[46em] text-base leading-[1.9] text-[#E4EEE6]">
              {t("默认会把输入内容发出设备的只有云联想（正在输入的拼音），以及 macOS、Linux 新装时的候选翻译（当前页候选词）；macOS、Linux 与移动端另有不含输入内容的匿名使用统计。每一项都能在设置里关闭。")}
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
            title={t("六个平台原生体验，网页也能用")}
            lead={t("五个平台共用 Rust 输入引擎；Windows 正式版仍独立开发，基于同一引擎的新版正在预发布。同一个引擎编译成 WebAssembly，可以嵌进任何网页。")}
            action={
              <LinkButton to="/download/" variant="soft">
                {t("前往下载页 →")}
              </LinkButton>
            }
          />
        </div>
        <ul className="m-0 mt-8 grid list-none grid-cols-2 gap-3 p-0 xl:grid-cols-3" data-reveal-stagger>
          {SITE_PLATFORMS.map((id) => {
            const platform = PLATFORM_CATALOG[id];
            const status = DISTRIBUTION_LABELS[platform.distribution];
            // Web 不是装在系统里的输入法，单独占一整行，排在六个原生平台之后，两列和三列时原生平台都正好排满。
            const embedded = platform.distribution === "sdk";
            return (
              <Card as="li" key={id} className={cx("min-w-0 rounded-tile p-4 sm:p-6", embedded && "col-span-full")} data-reveal>
                <div className="flex items-center justify-between gap-3">
                  <PlatformIcon platform={id} size={24} className="flex-none text-ink" />
                  <Pill tone={status.tone}>{t(status.label)}</Pill>
                </div>
                <h3 className="m-0 mt-4 text-[17px] font-bold text-ink sm:mt-5 sm:text-[22px]">{platform.name}</h3>
                {embedded && (
                  <p className="m-0 mt-2 text-[15px] leading-[1.8] text-body">
                    {t("把输入法嵌进你的网页：全拼、双拼、五笔在访客的浏览器里运行，不需要安装，也不经过服务器。")}{" "}
                    <LocaleLink to="/download/" search={{ platform: "web" }} className="font-semibold text-accent-ink no-underline hover:text-ink">
                      {t("接入方式 →")}
                    </LocaleLink>
                  </p>
                )}
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
