import type { ReactNode } from "react";
import { HighlightedCode } from "./code";
import { CommunitySection } from "./community-section";
import { PLATFORM_CATALOG, SITE_PLATFORMS, type Distribution, type SitePlatform } from "./data/platforms";
import { HomeHero } from "./home/hero";
import { useHomeDownloadStats } from "./home/download-stats";
import { LocaleLink } from "./locale-link";
import { usePageMeta } from "./page-meta";
import { useLocale } from "./use-locale";
import { useReveal } from "./use-reveal";
import { AnchorButton, Card, Container, GitHubIcon, Grove, LinkButton, LogoMark, Pill, PlatformIcon, RustIcon, SectionHeading, cx, type GroveTree } from "./ui";

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
  {
    glyph: "联",
    title: "神经联想",
    desc: "4.5 MB 起的语言模型看着前文，在整句候选里挑出更通顺的读法，模型和代码都开源。",
    link: { to: "/model/", label: "效果与开启方法" },
  },
] as const;

/** How each platform reaches users today, shown as a small tag on its card. Web is a package developers embed in their own pages. */
const DISTRIBUTION_LABELS: Record<Distribution, { label: string; tone: "accent" | "neutral" }> = {
  release: { label: "可下载", tone: "accent" },
  testflight: { label: "TestFlight", tone: "accent" },
  pgyer: { label: "测试版", tone: "accent" },
  appgallery: { label: "AppTest 测试版", tone: "accent" },
  source: { label: "开发中", tone: "neutral" },
  sdk: { label: "开发者接入", tone: "accent" },
};

const HOME_PLATFORM_ITEMS = [
  { id: "windows", catalogId: "windows", name: "Windows 10/11（正式版）", statKey: "windows", status: DISTRIBUTION_LABELS.release },
  { id: "windowsRust", catalogId: "windows", name: "Windows 10/11（新版预览）", statKey: "windowsRust", status: DISTRIBUTION_LABELS.pgyer },
  { id: "windows7", catalogId: "windows", name: "Windows 7", statKey: "windows7", status: { label: "尚未发布", tone: "neutral" as const } },
  ...SITE_PLATFORMS.filter(id => id !== "windows").map(id => ({ id, catalogId: id, name: PLATFORM_CATALOG[id].name, statKey: id, status: DISTRIBUTION_LABELS[PLATFORM_CATALOG[id].distribution] })),
] as const;

/** The privacy banner's grove (viewBox 0 0 1200 400), drawn in the banner's glow colour. */
const BANNER_FAR: GroveTree[] = [[560, 247, 0.9], [640, 264, 0.8], [760, 230, 1], [880, 256, 0.85], [1000, 222, 1.05], [1120, 247, 0.9]];
const BANNER_NEAR: GroveTree[] = [[700, 145, 1.5], [830, 60, 2], [960, 128, 1.6], [1070, 43, 2.1]];

const SECTION_SPACING = "pt-[clamp(80px,10vw,128px)]";

/** Prebuilt C libraries and the minimal data pack hang off the msime-engine-capi-v* releases of the main repository, which it shares with the apps' releases; the same filter as on /engine/ lists only them. */
const ENGINE_CAPI_RELEASES = "https://github.com/metasequoiaime/msime/releases?q=msime-engine-capi&expanded=true";

/** The two ways into the engine library, each with the first command a developer runs; /engine/ has the full walkthrough. */
const ENGINE_WAYS: readonly { id: string; mark: ReactNode; title: string; desc: string; code: string; href: string; link: string; linkMark: ReactNode }[] = [
  {
    id: "rust",
    mark: <RustIcon size={24} />,
    title: "Rust：msime-engine",
    desc: "Rust 项目直接从 crates.io 依赖，SQLite 已经编进引擎，不用另装任何库。",
    code: "cargo add msime-engine",
    href: "https://crates.io/crates/msime-engine",
    link: "crates.io 上的 msime-engine",
    linkMark: <RustIcon size={16} />,
  },
  {
    id: "c",
    mark: "C",
    title: "C 库：每种语言都能调用",
    desc: "Linux、macOS、Windows 的预编译归档，带头文件和 pkg-config。C、C++、Swift、Kotlin、Go、Python 等能经 C FFI 调用的语言都能用。",
    code: "cc app.c $(pkg-config --cflags --libs msime-engine)",
    href: ENGINE_CAPI_RELEASES,
    link: "下载预编译 C 库",
    linkMark: <GitHubIcon size={16} />,
  },
];

export function HomePage() {
  const { t } = useLocale();
  const downloadStats = useHomeDownloadStats();
  usePageMeta();
  useReveal();

  return (
    <main className="w-full">
      <HomeHero />

      <Container as="section" width="page" className={SECTION_SPACING}>
        <div data-reveal>
          <SectionHeading id="home-features" title={t("打字、翻译、联想，在一个候选窗里完成")} />
        </div>
        <div className="mt-[clamp(32px,4vw,48px)] grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4" data-reveal-stagger>
          {FEATURES.map((feature) => (
            <Card key={feature.glyph} className="min-w-0 p-[clamp(24px,3vw,32px)] lg:row-span-3 lg:grid lg:grid-rows-subgrid lg:gap-y-0" data-reveal>
              <div className="grid size-11 place-items-center rounded-field bg-accent-soft text-lg font-bold text-accent" aria-hidden="true">
                {t(feature.glyph)}
              </div>
              <h3 className="m-0 mt-5 text-[21px] font-bold text-ink">{t(feature.title)}</h3>
              <p className="m-0 mt-2.5 text-[15.5px] leading-[1.9] text-body">
                {t(feature.desc)}
                {"link" in feature && (
                  <>
                    {" "}
                    <LocaleLink to={feature.link.to}>{t(feature.link.label)}</LocaleLink>
                  </>
                )}
              </p>
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
              {t("新装后默认会把输入内容发出设备的，只有 Windows 正式版的云联想（正在输入的拼音，安装时可取消勾选）；其他版本的云联想和候选翻译都要你自己打开。Windows 正式版以外的各版本默认发送不含输入内容的匿名使用统计。每一项都能在设置里关闭。")}
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
        <Card as="section" className="home-platforms-shell rounded-panel p-[clamp(16px,3.4vw,40px)] shadow-feature">
          <div data-reveal>
            <SectionHeading
              id="home-platforms"
              title={t("六个平台原生体验，网页也能用")}
              lead={
                t("五个平台共用 Rust 输入引擎；Windows 正式版仍独立开发，基于同一引擎的新版正在预发布。同一个引擎编译成 WebAssembly，可以嵌进任何网页。")
              }
              action={
                <LinkButton to="/download/" variant="soft">
                  {t("前往下载页 →")}
                </LinkButton>
              }
            />
          </div>
        <ul className="m-0 mt-8 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-5" data-reveal-stagger>
          {HOME_PLATFORM_ITEMS.map((item) => {
            const id = item.catalogId as SitePlatform;
            const platform = PLATFORM_CATALOG[id];
            // Web 不是装在系统里的输入法，但仍作为平台项参与统一网格。
            const embedded = platform.distribution === "sdk";
            const windows7Available = item.id !== "windows7" || downloadStats.windows7Available === true;
            const status = item.id === "windows7" && windows7Available ? DISTRIBUTION_LABELS.release : item.status;
            const count = item.statKey === "ios" ? downloadStats.iosDownloads : item.statKey === "web" ? downloadStats.npm?.downloads : downloadStats.stats?.platforms[item.statKey];
            return (
              <li key={item.id} className={cx("min-w-0 rounded-tile bg-panel-2 p-4 shadow-hair sm:p-6", embedded && "lg:col-span-2")} data-platform={item.id} data-reveal>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <PlatformIcon platform={id} size={24} className="flex-none text-ink" />
                  <Pill tone={status.tone}>{t(status.label)}</Pill>
                </div>
                <h3 className="m-0 mt-4 text-[17px] font-bold text-ink sm:mt-5 sm:min-h-[3.5rem] sm:text-[22px]">{t(item.name)}</h3>
                {count !== undefined && windows7Available && (
                  <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
                    <div><strong className="block text-[clamp(24px,2.8vw,34px)] leading-none font-bold text-ink tabular-nums">{count.toLocaleString("en-US")}</strong><span className="mt-1 block text-xs text-muted">
                      {t(item.statKey === "ios" ? "含 TestFlight 安装次数" : item.statKey === "web" ? "npm 近一年下载" : "累计下载")}
                      {embedded && (
                        <>
                          {" · "}
                          <LocaleLink to="/download/" search={{ platform: "web" }} className="font-semibold text-accent-ink no-underline hover:text-ink">
                            {t("接入方式 →")}
                          </LocaleLink>
                        </>
                      )}
                    </span></div>
                  </div>
                )}
              </li>
            );
          })}
          </ul>
          {downloadStats.stats && (
            <div className="mt-8 border-t border-ink/12 pt-6" data-download-summary>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="text-sm text-muted">{t("累计下载")}</span><strong className="text-[clamp(26px,3vw,38px)] leading-none font-bold text-ink tabular-nums">{downloadStats.stats.total.toLocaleString("en-US")}</strong></div>
              <p className="m-0 mt-3 text-[13px] leading-[1.8] text-muted">{t("累计下载包含已采集的各平台安装包、国内镜像、蒲公英和 iOS 安装次数，不代表安装人数或全部完成下载。")}</p>
            </div>
          )}
        </Card>
      </Container>

      <Container as="section" width="page" className={SECTION_SPACING}>
        <div data-reveal>
          <SectionHeading
            id="home-engine"
            eyebrow={t("引擎库")}
            title={t("把水杉的输入引擎嵌进你的输入法")}
            lead={t("全拼、双拼和多语言的输入引擎单独发布成库，其他输入法可以直接嵌入：按键交给它，候选、排序和学习由它给出，界面和与系统的对接留给你。引擎代码以 MPL-2.0 授权。")}
            action={
              <LinkButton to="/engine/" variant="soft">
                {t("了解引擎库 →")}
              </LinkButton>
            }
          />
        </div>
        <div className="mt-[clamp(32px,4vw,48px)] grid grid-cols-1 gap-4 lg:grid-cols-2" data-reveal-stagger>
          {ENGINE_WAYS.map((way) => (
            <Card key={way.id} className="flex min-w-0 flex-col p-[clamp(24px,3vw,32px)]" data-reveal>
              <div className="flex items-center gap-4">
                <div className="grid size-11 flex-none place-items-center rounded-field bg-accent-soft font-code text-lg font-bold text-accent" aria-hidden="true">
                  {way.mark}
                </div>
                <h3 className="m-0 min-w-0 text-[21px] font-bold text-ink">{t(way.title)}</h3>
              </div>
              <p className="m-0 mt-4 text-[15.5px] leading-[1.9] text-body">{t(way.desc)}</p>
              <HighlightedCode code={way.code} language="bash" className="mt-4" />
              <div className="mt-auto flex flex-wrap gap-3 pt-6">
                <AnchorButton href={way.href} variant="secondary" size="md">
                  {way.linkMark}
                  {t(way.link)}
                </AnchorButton>
              </div>
            </Card>
          ))}
        </div>
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
