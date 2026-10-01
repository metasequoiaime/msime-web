import type { ReactNode } from "react";
import { usePlatformsQuery } from "./data/queries";
import { Segmented } from "./features/segmented";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import type { Dictionary } from "./platforms-data";
import { AnchorButton, Card, Container, cx, ExternalIcon } from "./ui";
import { useLocale } from "./use-locale";
import { usePageSearch } from "./use-page-search";
import { useReveal } from "./use-reveal";

/*
 * 真实截图，不做示意图。
 *
 * 能力区原本只有文字，讲皮肤、悬浮工具栏、语音输入、手写板、屏幕键盘却一张图都没有 —— 输入法是看着用的东西，光靠描述说不清。这里放的都是仓库里已有的真实画面；没有截图的功能宁可先不放，也不摆一张示意图冒充。
 */
const SHOTS = [
  {
    src: "/img/edge-candidate-826w.webp",
    srcSet: "/img/edge-candidate-826w.webp 826w",
    title: "浏览器中的候选窗",
    body: "浏览器的搜索框里用双拼加辅助码打出「水杉输入法」。候选窗由输入法自己绘制，不依赖应用配合。",
    alt: "Edge 浏览器的搜索框中显示水杉输入法的候选窗，第一项是「水杉输入法」",
  },
  {
    src: "/img/wt-candidate-696w.webp",
    srcSet: "/img/wt-candidate-696w.webp 696w",
    title: "用辅助码区分同音候选",
    body: "终端里输入 fuvuma，候选按辅助码分开：辅助码 iU、辅助 iQ、附注 eD 各自可辨，便于进一步筛选。",
    alt: "Windows Terminal 中的深色候选窗，逐项标注辅助码",
  },
] as const;

/*
 * 皮肤预览。
 *
 * 这是按 skin.toml 里公布的配色现场画出来的候选窗，不是截图 —— 皮肤示例仓库那张角色图，项目自己在 skin.toml 的 license 段标了 UNVERIFIED-DEMO-ONLY，不该出现在官网上，所以这里只用配色，不用它的素材。
 */
const SKIN_SAMPLE = {
  dark: { surface: "#202020", border: "rgba(155, 155, 155, 0.18)", text: "#e9e8e8", muted: "#e9e8e89d", accent: "#e08aa8", selected: "rgba(224, 138, 168, 0.28)" },
  light: { surface: "#fff7fa", border: "rgba(176, 80, 110, 0.22)", text: "#2b2b2b", muted: "#2b2b2b9d", accent: "#c45c7a", selected: "rgba(196, 92, 122, 0.18)" },
} as const;

const CANDIDATES = [
  ["1", "你们", "rR"],
  ["2", "你", "rX"],
  ["3", "尼", "uV"],
  ["4", "妮", "nV"],
] as const;

function CandidatePreview({ scheme, layout }: { scheme: "dark" | "light"; layout: "vertical" | "horizontal" }) {
  const { t } = useLocale();
  const c = SKIN_SAMPLE[scheme];
  return (
    <div
      className="w-fit max-w-full rounded-md border-[1.5px] border-solid p-1 text-[15px] shadow-[0_6px_18px_rgba(0,0,0,0.22)] select-none"
      style={{ background: c.surface, borderColor: c.border, color: c.text }}
      aria-hidden="true"
    >
      <div className="flex min-w-[132px] items-center px-2.5 pt-0.5 pb-1 text-sm" style={{ color: c.muted }}>
        ni&apos;mf
        <span className="ml-0.5 inline-block h-[1.1em] w-[1.5px]" style={{ background: c.accent }} />
      </div>
      <div className={layout === "horizontal" ? "flex flex-wrap gap-0.5" : "grid gap-0.5"}>
        {CANDIDATES.map(([index, word, code], position) => (
          <span key={word} className="rounded-[4px] px-2 py-0.5 whitespace-nowrap" style={position === 0 ? { background: c.selected } : undefined}>
            <span className="mr-[5px] text-[0.8em]" style={{ color: c.muted }}>
              {t(index)}
            </span>
            {t(word)}
            <span className="ml-0.5 text-[0.85em]" style={{ color: c.muted }}>
              ({t(code)})
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/*
 * 候选窗的四种形态，图来自 MSIME-Windows 仓库 docs/images 下官方给的截图。
 *
 * 站上原来只有文字说「支持横排与纵排」「辅助码把同音候选缩小」，这几张是它们真实的样子。
 */
const CANDIDATE_VIEWS = [
  {
    id: "helpcode",
    tab: "辅助码",
    caption: "双拼打 uvujuurufa，候选后括号里是辅助码。同音的水杉 / 水山 / 水疝各自可辨，便于选择。",
    alt: "浏览器搜索框下的竖排候选窗，每个候选后面标着两位辅助码",
  },
  {
    id: "horizontal",
    tab: "横排",
    caption: "同一串输入换成横排候选窗，占的纵向空间更少，适合行内输入。",
    alt: "浏览器搜索框下的横排候选窗，候选项并排列出",
  },
  {
    id: "emoji",
    tab: "emoji",
    caption: "候选里可以直接出 emoji，打词的时候顺手就能选。",
    alt: "候选窗中部分候选项旁边显示 emoji 图标",
  },
  {
    id: "mixed",
    tab: "中英混输",
    caption: "已经上屏的中文后面接着敲拼音，不用先切换模式再切回来。",
    alt: "搜索框里是「水杉shurufa」，候选窗继续给出后半段的中文候选",
  },
] as const;

const VIEW_OPTIONS = CANDIDATE_VIEWS.map((item) => ({ value: item.id, label: item.tab }));
const SCHEME_OPTIONS = [
  { value: "dark", label: "深色" },
  { value: "light", label: "浅色" },
] as const;
const LAYOUT_OPTIONS = [
  { value: "vertical", label: "竖排" },
  { value: "horizontal", label: "横排" },
] as const;

const BUILT_IN_SKINS = ["Fluent", "微信绿", "石墨 Graphite", "杨柳青 Willow green"] as const;

const HELP_CODES = ["蓝天小雨点", "自然码", "首右 2.0", "首右 Plus", "小鹤"] as const;

const readableSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * 给长路径加上断行机会。
 *
 * 浏览器不在反斜杠处断行，整条路径就是一个不可拆的词：行尾剩下的宽度装不下它时，整行提前折掉，右边空出一大块。在每个分隔符后插一个 `<wbr>`，需要折行时断在分隔符处，而不是断在词中间，也不是把整行顶断。
 */
const breakAtSeparators = (path: string) =>
  path.split(/(?<=[\\/])/).flatMap((part, index, all) => (index === 0 ? [part] : [<wbr key={all.slice(0, index).join("")} />, part]));

/** Inline code inside running text. */
const INLINE_CODE = "rounded-md bg-panel-2 px-1.5 py-px font-mono text-[0.88em] text-ink";

/** One feature card: eyebrow, h2, optional lead and an optional control group aligned to the right on wide screens. */
function FeatureBlock({ eyebrow, title, lead, control, children }: { eyebrow: string; title: string; lead?: ReactNode; control?: ReactNode; children?: ReactNode }) {
  const { t } = useLocale();
  return (
    <Card as="section" className="rounded-panel p-[clamp(22px,3.4vw,40px)]" data-reveal>
      <div className="flex flex-wrap items-start justify-between gap-x-7 gap-y-4">
        <div className="min-w-0 flex-[1_1_420px]">
          <p className="m-0 text-sm font-semibold text-accent-ink">{t(eyebrow)}</p>
          <h2 className="m-0 mt-2.5 font-heading text-[clamp(22px,2.6vw,28px)] leading-[1.35] font-bold text-ink">{t(title)}</h2>
          {lead && <p className="m-0 mt-3 text-[15px] leading-[1.85] text-body">{lead}</p>}
        </div>
        {control}
      </div>
      {children}
    </Card>
  );
}

export function FeaturesPage() {
  const { t } = useLocale();
  const { choice, update } = usePageSearch();
  const view = choice("view", CANDIDATE_VIEWS.map((item) => item.id), "helpcode");
  const settingsScheme = choice("settings", ["dark", "light"] as const, "dark");
  const scheme = choice("scheme", ["dark", "light"] as const, "dark");
  const layout = choice("layout", ["vertical", "horizontal"] as const, "vertical");
  const setView = (value: typeof view) => update({ view: value });
  const setSettingsScheme = (value: typeof settingsScheme) => update({ settings: value });
  const setScheme = (value: typeof scheme) => update({ scheme: value });
  const setLayout = (value: typeof layout) => update({ layout: value });
  const platforms = usePlatformsQuery();
  const dictionary = platforms.data?.dictionary ?? null;
  const currentView = CANDIDATE_VIEWS.find((item) => item.id === view) ?? CANDIDATE_VIEWS[0];

  usePageMeta();
  useReveal([dictionary]);

  return (
    <>
      <PageHero
        kicker="功能"
        title="Windows 版功能与界面"
        lead="本页以 Windows 版为例，展示候选窗、设置、皮肤与词库功能。其他平台的可用功能和操作方式，请查看对应使用指南。"
      />

      <main className="w-full">
        <Container className="grid gap-4 pt-[clamp(28px,4vw,44px)]">
          <section className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4" aria-label={t("实际画面")} data-reveal-stagger>
            {SHOTS.map((shot) => (
              <Card as="article" key={shot.src} className="overflow-hidden rounded-tile" data-reveal>
                <figure className="m-0">
                  {/* The browser and terminal shots are 16:10 crops around the candidate window (cut from the full screenshots in public/img); a whole-screen capture shrunk to card width left the candidate window unreadably small. */}
                  <img
                    className="block aspect-[16/10] h-auto w-full bg-panel-2 object-cover object-top"
                    src={shot.src}
                    srcSet={shot.srcSet}
                    sizes="(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 400px"
                    alt={t(shot.alt)}
                    width="840"
                    height="525"
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption className="grid gap-1.5 px-5 pt-[18px] pb-5 shadow-divider-t">
                    <strong className="text-base font-semibold text-ink">{t(shot.title)}</strong>
                    <span className="text-sm leading-[1.75] text-muted">{t(shot.body)}</span>
                  </figcaption>
                </figure>
              </Card>
            ))}
          </section>

          <FeatureBlock
            eyebrow="候选窗"
            title="四种形态，同一个窗口"
            control={<Segmented legend="选择候选窗形态" options={VIEW_OPTIONS} value={view} onChange={setView} />}
          >
            <figure className="m-0 mt-6">
              <img
                key={currentView.id}
                className="block h-auto w-full rounded-field bg-panel-2 shadow-hair"
                src={`/screenshots/candidate-${currentView.id}-840w.webp`}
                srcSet={`/screenshots/candidate-${currentView.id}-840w.webp 840w, /screenshots/candidate-${currentView.id}-1680w.webp 1680w`}
                sizes="(max-width: 900px) 92vw, min(1120px, 86vw)"
                alt={t(currentView.alt)}
                width="840"
                height="348"
                decoding="async"
              />
              <figcaption className="mt-3.5 text-sm leading-[1.8] text-muted">{t(currentView.caption)}</figcaption>
            </figure>
          </FeatureBlock>

          <FeatureBlock
            eyebrow="设置"
            title="集中调整常用设置"
            lead={t("外观、输入、辅助码、快捷键、词库、皮肤、语音输入、屏幕键盘、手写识别板、悬浮工具栏、AI 辅助各占一栏，界面自身也分明暗两套。")}
            control={<Segmented legend="设置界面配色" options={SCHEME_OPTIONS} value={settingsScheme} onChange={setSettingsScheme} />}
          >
            <figure className="m-0 mx-auto mt-6 max-w-[760px]">
              <img
                className="block h-auto w-full rounded-field bg-panel-2 shadow-hair"
                src={`/screenshots/settings-${settingsScheme}-840w.webp`}
                srcSet={`/screenshots/settings-${settingsScheme}-840w.webp 840w, /screenshots/settings-${settingsScheme}-1680w.webp 1680w`}
                sizes="(max-width: 900px) 92vw, 760px"
                alt={t(`水杉输入法设置窗口的${settingsScheme === "dark" ? "深色" : "浅色"}界面，左侧列出各个设置分区`)}
                width="840"
                height="666"
                decoding="async"
              />
            </figure>
          </FeatureBlock>

          <FeatureBlock
            eyebrow="皮肤"
            title="自定义候选窗皮肤"
            lead={
              <>
                {t("内置")} {t(BUILT_IN_SKINS.join(" / "))} {t("四套。外部皮肤把含")}
                <code className={INLINE_CODE}>skin.toml</code> {t("的文件夹放进")}
                {t(" ")}
                <code className={cx(INLINE_CODE, "[overflow-wrap:anywhere]")}>{breakAtSeparators("%LOCALAPPDATA%\\metasequoiaime\\skins")}</code> {t("再点「刷新皮肤」即可。")}
              </>
            }
          >
            <div className="mt-6 grid items-center gap-x-8 gap-y-6 rounded-card bg-panel-2 p-[clamp(18px,3vw,26px)] xl:grid-cols-[minmax(0,max-content)_minmax(0,1fr)] xl:gap-x-12">
              <div className="col-span-full flex flex-wrap gap-x-7 gap-y-4 pb-5 shadow-divider-b">
                <Segmented legend="配色" showLegend options={SCHEME_OPTIONS} value={scheme} onChange={setScheme} />
                <Segmented legend="排布" showLegend options={LAYOUT_OPTIONS} value={layout} onChange={setLayout} />
              </div>
              {/* 两种排布叠在同一格里，只显示当前那个：切换时卡片高度不跳。 */}
              <div className="grid min-w-0">
                {(["vertical", "horizontal"] as const).map((value) => (
                  <div
                    key={value}
                    data-active={layout === value}
                    aria-hidden="true"
                    className="min-w-0 self-start [grid-area:1/1] data-[active=false]:pointer-events-none data-[active=false]:invisible"
                  >
                    <CandidatePreview scheme={scheme} layout={value} />
                  </div>
                ))}
              </div>
              <p className="m-0 text-[13.5px] leading-[1.8] text-muted">
                {t("按皮肤示例仓库")}
                <code className={INLINE_CODE}>skin.toml</code>{" "}
                {t("公布的配色现场绘制，用于说明可自定义的范围，不是应用截图。一套皮肤可以声明强调色、选中态、悬停态、边框与背景，并分别给深浅两种配色，还能指定横排 / 竖排支持与候选窗装饰。")}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <AnchorButton variant="soft" href="https://github.com/metasequoiaime/metasequoia-ime-skin-example">
                {t("皮肤示例与编写说明")}
                <ExternalIcon />
              </AnchorButton>
            </div>
          </FeatureBlock>

          <FeatureBlock
            eyebrow="词库"
            title="三类词库，都可以自己导入"
            lead={t("设置里可以切换全拼、五笔和英文词库，查询、新增、改权重都在同一个界面。批量导入用制表符分隔的三列纯文本。")}
          >
            <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-3">
              {(
                [
                  ["全拼", "你好\tni'hao\t10"],
                  ["五笔", "你好\twbgq\t10"],
                ] as const
              ).map(([label, sample]) => (
                <div key={label} className="min-w-0">
                  <span className="mb-1.5 block text-[13px] font-medium text-accent-ink">{t(label)}</span>
                  {/* 词库是制表符分隔的三列，把制表位摆出来才看得出「三列」 */}
                  <pre className="m-0 overflow-x-auto rounded-field bg-panel-2 px-3.5 py-3 font-mono text-[13px] leading-[1.7] text-ink [tab-size:12]">
                    <code>{sample}</code>
                  </pre>
                </div>
              ))}
            </div>

            {dictionary && <ShippedDictionary dictionary={dictionary} />}
          </FeatureBlock>

          <FeatureBlock
            eyebrow="辅助码"
            title="五套方案，把同音候选分开"
            lead={t("候选项后面括号里的两个字母就是辅助码。打完拼音再补一到两码，可以缩小同音候选范围，减少翻页。可选方案：")}
          >
            <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
              {HELP_CODES.map((name) => (
                <li key={name} className="rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-medium text-accent-ink">
                  {t(name)}
                </li>
              ))}
            </ul>
          </FeatureBlock>
        </Container>
      </main>
    </>
  );
}

/**
 * 随版本分发的词库文件表：名称、文件名、体积。
 *
 * 宽屏时整份列表共用一套列宽（li 用 `display: contents` 把三个字段直接交给网格），否则「日文词典（源自 Mozc）」比别人宽，后面两列就整行错开；行底色由三个字段各自铺一段拼出来，首尾补圆角。窄屏退回按行排：三条 max-content 轨道放不进 360px 的屏幕，而 max-content 不会收缩，整页会因此可以横向滚动。
 */
function ShippedDictionary({ dictionary }: { dictionary: Dictionary }) {
  const { t } = useLocale();
  return (
    <>
      <h3 className="m-0 mt-8 font-heading text-lg leading-[1.4] font-bold text-ink">
        {t("随版本分发的词库 · ")}
        <span className="font-mono text-[0.9em] font-medium text-accent-ink">{t(dictionary.tag)}</span>
      </h3>
      <p className="m-0 mt-2.5 text-[15px] leading-[1.85] text-body">
        {t("这里列出公共词库的发布文件；各平台实际随包版本以发布说明为准。词库发布于")}
        {t(dictionary.publishedAt.slice(0, 10))}
        {t("，每个文件都附 SHA256。")}
      </p>
      <ul className="m-0 mt-4 grid list-none gap-1 p-0 text-sm lg:grid-cols-[max-content_max-content_1fr] lg:items-baseline lg:gap-x-0 lg:gap-y-1">
        {dictionary.files.map((file) => (
          <li
            key={file.name}
            className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 rounded-field bg-panel-2 px-3 py-2 lg:contents lg:[&>*]:bg-panel-2 lg:[&>*]:py-2 lg:[&>:first-child]:rounded-l-field lg:[&>:first-child]:pr-3 lg:[&>:first-child]:pl-3 lg:[&>:last-child]:rounded-r-field lg:[&>:last-child]:pr-3"
          >
            <span className="basis-full text-ink lg:basis-auto">{t(file.label)}</span>
            <span className="min-w-0 [overflow-wrap:anywhere] lg:whitespace-nowrap lg:pr-3">
              <code className="rounded-md bg-panel px-1.5 py-px font-mono text-[12.5px] text-ink">{file.name}</code>
            </span>
            <span className="ml-auto text-right text-[13px] lg:ml-0 text-muted tabular-nums">{t(readableSize(file.size))}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-3">
        <AnchorButton variant="soft" href={dictionary.releaseUrl}>
          {t("词库发布页")}
          <ExternalIcon />
        </AnchorButton>
      </div>
    </>
  );
}
