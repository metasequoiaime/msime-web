import { useId } from "react";
import { CARD_GRID, CatalogCard, CatalogSearch, CatalogTabs, catalogPanelId, catalogTabId, CommunitySectionNav, emptyText, ErrorCard, FilterChips, formatBytes, GetInApp, LoadMore, Metrics, StaleNotice, StatusCard, useCatalogSearch, type CatalogTab } from "./community/catalog";
import { COMMUNITY_PLUGIN_KINDS, isCommunityPluginKind, isPluginKind, PLUGIN_KIND_LABELS, PLUGIN_KINDS, type PluginKind } from "./data/pack-kinds";
import { MAX_PACK_QUERY_BYTES, useCommunityPacksQuery, useOfficialPacksQuery } from "./data/queries";
import type { CommunityPlugin, OfficialPlugin } from "./data/schemas";
import { LocaleLink } from "./locale-link";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { AnchorButton, Card, Container, DownloadIcon, ExternalIcon, GitHubIcon, LinkButton, Pill, UsersIcon } from "./ui";
import { usePageSearch } from "./use-page-search";
import { useLocale } from "./use-locale";

type Source = "official" | "community";
const SOURCES: readonly Source[] = ["official", "community"];

const TABS: readonly CatalogTab<Source>[] = [
  { value: "official", label: "官方插件", caption: "msime-plugins 仓库，可直接下载", icon: GitHubIcon },
  { value: "community", label: "社区插件", caption: "用户在 App 中发布", icon: UsersIcon },
];

const HINTS: Record<Source, string> = {
  official: "收录在 msime-plugins 仓库、通过 CI 校验的插件，每个包都声明了自己的许可证。无需登录，下载 .zip 后在水杉输入法设置的「插件」页导入。",
  community: "水杉输入法用户公开发布的插件，按发布时间从新到旧排列。登录账号后在 App「插件」页的社区插件中安装。",
};

const REPO_URL = "https://github.com/metasequoiaime/msime-plugins";

/** Matches a name the way the backend's `q` does for community packs: a case-insensitive substring. */
const nameMatches = (name: string, query: string) => !query || name.toLowerCase().includes(query.toLowerCase());

/**
 * 插件：the packs that add key sounds, tunes, background music, `/` command tables and typing effects. The 官方插件 tab lists msime-plugins with each pack's release zip, which needs no account; the 社区插件 tab browses what people publish from the App, which is installed there after signing in. Both lists are read client-side from `/api/plugins/*`; the static HTML carries the page text and the empty tab shell.
 */
export function PluginsPage() {
  const { t } = useLocale();
  usePageMeta();
  const { choice, get, update } = usePageSearch();
  const source = choice("source", SOURCES, "official");
  // An unknown kind in a shared URL, or 特效包 on the community tab (the App cannot install those from the community), shows every kind rather than an error.
  const rawKind = get("kind");
  const kind = source === "official" ? (isPluginKind(rawKind) ? rawKind : undefined) : isCommunityPluginKind(rawKind) ? rawKind : undefined;
  const search = useCatalogSearch();
  const baseId = useId();

  const select = (value: Source) => update({ source: value === "official" ? undefined : value, kind: undefined }, true);
  const selectKind = (value: PluginKind | undefined) => update({ kind: value }, true);
  const tab = TABS.find(item => item.value === source) ?? TABS[0];

  return (
    <>
      <PageHero
        variant="plain"
        kicker="社区"
        title="插件"
        lead="插件给水杉输入法加上按键音效、旋律、背景音乐、/ 指令表和打字特效。插件只含音频、指令模板等数据，不能带任何可执行内容，同一个包在 macOS、Windows、Linux 和鸿蒙电脑上通用。官方插件可以直接下载；社区插件请在水杉输入法中登录后安装。"
      >
        <CommunitySectionNav current="/plugins/" />
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton to="/download/">{t("下载水杉输入法")}</LinkButton>
        </div>
      </PageHero>
      <main className="w-full">
        <Container className="pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CatalogTabs baseId={baseId} label="插件来源" tabs={TABS} selected={source} onSelect={select} />
            <CatalogSearch id={`${baseId}-search`} label="搜索插件名称" maxBytes={MAX_PACK_QUERY_BYTES} search={search} />
          </div>
          <p className="m-0 mt-4 text-sm leading-[1.75] text-muted">{t(HINTS[source])}</p>
          <FilterChips legend="插件类型" values={source === "official" ? PLUGIN_KINDS : COMMUNITY_PLUGIN_KINDS} labels={PLUGIN_KIND_LABELS} selected={kind} onSelect={selectKind} />
          <section id={catalogPanelId(baseId)} role="tabpanel" aria-labelledby={catalogTabId(baseId, source)} className="mt-6">
            <h2 className="sr-only">{t(tab.label)}</h2>
            {source === "official" ? <OfficialList query={search.query} kind={kind} /> : <CommunityList query={search.query} kind={kind && isCommunityPluginKind(kind) ? kind : undefined} />}
          </section>
          <Card tone="muted" as="section" className="mt-12 rounded-tile px-6 py-[22px]" aria-labelledby={`${baseId}-how`}>
            <h2 id={`${baseId}-how`} className="m-0 font-heading text-[15.5px] font-bold text-ink">{t("如何安装插件")}</h2>
            <ol className="m-0 mt-2 list-decimal pl-5 text-sm leading-[1.85] text-body">
              <li>{t("安装水杉输入法电脑版。")}<LocaleLink to="/download/">{t("前往下载页")}</LocaleLink></li>
              <li>{t("官方插件：下载 .zip，在水杉输入法设置的「插件」页点「导入 .zip」选中它。导入时输入法会再校验一遍，不合格的包不会被安装。")}</li>
              <li>{t("社区插件：登录账号后打开「插件」页的社区插件，搜索在这里看到的名称并安装。")}</li>
              <li>{t("音效包、旋律和特效包在「插件 → 声音与效果」中选用；指令表在「输入 → 实用功能」打开 / 指令后，按 / 再输入指令字母即可使用。")}</li>
            </ol>
            <p className="m-0 mt-3 text-sm leading-[1.85] text-body">
              {t("想制作自己的插件？格式说明和模板见")}{" "}
              <a href={REPO_URL} target="_blank" rel="noreferrer">msime-plugins</a>
              {t("，也可以向仓库提交 Pull Request。")}
            </p>
          </Card>
        </Container>
      </main>
    </>
  );
}

/** The kind as the App labels it. */
const kindBadge = (kind: PluginKind) => <Pill>{PLUGIN_KIND_LABELS[kind]}</Pill>;

function OfficialList({ query, kind }: { query: string; kind: PluginKind | undefined }) {
  const { t } = useLocale();
  const packs = useOfficialPacksQuery("plugins");
  if (packs.isPending) return <StatusCard busy>{t("正在读取官方插件…")}</StatusCard>;
  if (packs.isError) return <ErrorCard message="暂时无法读取官方插件，请稍后再试，或前往 GitHub 查看。" retry={() => void packs.refetch()} />;
  const items = packs.data.items.filter(item => (!kind || item.kind === kind) && nameMatches(item.name, query));
  if (items.length === 0) return <StatusCard>{t(emptyText("官方插件", query, kind ? `「${PLUGIN_KIND_LABELS[kind]}」中` : ""))}</StatusCard>;
  return (
    <>
      {packs.data.stale && <StaleNotice />}
      <ul className={CARD_GRID}>
        {items.map(item => <OfficialPluginCard key={item.id} pack={item} />)}
      </ul>
    </>
  );
}

function OfficialPluginCard({ pack }: { pack: OfficialPlugin }) {
  const { t } = useLocale();
  const extra = pack.mode === "sequence" ? "按键旋律" : pack.commands !== undefined ? `${pack.commands} 条指令` : undefined;
  return (
    <CatalogCard
      badge={
        <>
          {kindBadge(pack.kind)}
          {extra && <Pill tone="neutral">{t(extra)}</Pill>}
        </>
      }
      name={pack.name}
      author={pack.author || t("水杉输入法")}
      details={[pack.version && `v${pack.version}`, pack.license, pack.size !== undefined && formatBytes(pack.size)].filter(Boolean).join(" · ")}
      description={pack.description}
      footer={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {pack.download && (
            <AnchorButton variant="secondary" size="sm" href={pack.download} target="_self" aria-label={t(`下载 ${pack.name} 的 .zip`)}>
              <DownloadIcon size={15} />
              {t("下载 .zip")}
            </AnchorButton>
          )}
          <a className="inline-flex items-center gap-1 text-[13px]" href={pack.source} target="_blank" rel="noreferrer" aria-label={t(`在 GitHub 查看 ${pack.name} 的源文件`)}>
            {t("源文件")}
            <ExternalIcon size={13} />
          </a>
        </div>
      }
    />
  );
}

function CommunityList({ query, kind }: { query: string; kind: CommunityPlugin["kind"] | undefined }) {
  const { t } = useLocale();
  const packs = useCommunityPacksQuery("plugins", query, kind);
  const noun = "社区插件";
  if (packs.isPending) return <StatusCard busy>{t(`正在读取${noun}…`)}</StatusCard>;
  if (packs.isError) return <ErrorCard message={`暂时无法读取${noun}，请稍后再试。`} retry={() => void packs.refetch()} />;
  const items = packs.data.pages.flatMap(page => page.items);
  const stale = packs.data.pages.some(page => page.stale);
  if (items.length === 0) return <StatusCard>{t(emptyText(noun, query, kind ? `「${PLUGIN_KIND_LABELS[kind]}」中` : ""))}</StatusCard>;
  return (
    <>
      {stale && <StaleNotice />}
      <ul className={CARD_GRID}>
        {items.map(item => (
          <CatalogCard
            key={item.id}
            badge={kindBadge(item.kind)}
            name={item.name}
            author={item.author}
            details={[item.version && `v${item.version}`, item.license, formatBytes(item.size)].filter(Boolean).join(" · ")}
            description={item.description}
            footer={<GetInApp where="「插件」页社区插件中" />}
          >
            <Metrics downloads={item.downloads} ratingCount={item.ratingCount} ratingAverage={item.ratingAverage} />
          </CatalogCard>
        ))}
      </ul>
      <LoadMore hasNextPage={packs.hasNextPage} isFetchingNextPage={packs.isFetchingNextPage} isFetchNextPageError={packs.isFetchNextPageError} fetchNextPage={packs.fetchNextPage} />
    </>
  );
}
