import { useId } from "react";
import { CARD_GRID, CatalogCard, CatalogSearch, CatalogTabs, catalogPanelId, catalogTabId, CommunitySectionNav, emptyText, ErrorCard, formatBytes, GetInApp, LoadMore, Metrics, StaleNotice, StatusCard, useCatalogSearch, type CatalogTab } from "./community/catalog";
import { ENTRY_KIND_LABELS, ENTRY_KINDS } from "./data/pack-kinds";
import { MAX_PACK_QUERY_BYTES, useCommunityPacksQuery, useOfficialPacksQuery } from "./data/queries";
import type { CommunityDictionary, DictionaryFile, OfficialDictionary } from "./data/schemas";
import { LocaleLink } from "./locale-link";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { Card, Container, ExternalIcon, GitHubIcon, LinkButton, Pill, UsersIcon } from "./ui";
import { usePageSearch } from "./use-page-search";
import { useLocale } from "./use-locale";

type Source = "official" | "community";
const SOURCES: readonly Source[] = ["official", "community"];

const TABS: readonly CatalogTab<Source>[] = [
  { value: "official", label: "专业词库", caption: "msime-dictionary 仓库，可直接下载", icon: GitHubIcon },
  { value: "community", label: "社区词库", caption: "用户在手机版 App 中分享", icon: UsersIcon },
];

const HINTS: Record<Source, string> = {
  official: "面向特定领域的词库，收录在 msime-dictionary 仓库中。它们不会进入默认词库，导入后才作为你的用户词条生效，所以领域里的短缩写不会干扰日常输入。",
  community: "水杉输入法用户分享的词条合集，按发布时间从新到旧排列。登录账号后在手机版 App 的「社区」页导入到本机或云端词库。",
};

const REPO_URL = "https://github.com/metasequoiaime/msime-dictionary";

/** What each word list of a pack holds, by the file names msime-dictionary uses (its packs/*\/README.md). A file not named here shows its name alone. */
const FILE_LABELS: Record<string, string> = {
  "quanpin.txt": "拼音词条",
  "english.txt": "英文词条",
  "translations.txt": "术语对照",
};

const nameMatches = (name: string, query: string) => !query || name.toLowerCase().includes(query.toLowerCase());

/**
 * 词库：the professional word lists in msime-dictionary `packs/`, which anyone can download and import without an account, and the shared dictionaries people publish from the App's 社区 page, which are imported there after signing in. Both lists are read client-side from `/api/dictionaries/*`; the static HTML carries the page text and the empty tab shell.
 */
export function DictionariesPage() {
  const { t } = useLocale();
  usePageMeta();
  const { choice, update } = usePageSearch();
  const source = choice("source", SOURCES, "official");
  const search = useCatalogSearch();
  const baseId = useId();
  const select = (value: Source) => update({ source: value === "official" ? undefined : value }, true);
  const tab = TABS.find(item => item.value === source) ?? TABS[0];

  return (
    <>
      <PageHero
        variant="plain"
        kicker="社区"
        title="词库"
        lead="水杉输入法自带的基础词库覆盖日常输入。专业词库面向特定领域，需要时下载导入；社区词库是用户在 App 中分享的词条合集。发现常用词缺失，也可以直接提交，审核后随词库更新进入所有平台。"
      >
        <CommunitySectionNav current="/dictionaries/" />
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton to="/download/">{t("下载水杉输入法")}</LinkButton>
          <LinkButton to="/words/" variant="secondary">{t("提交缺失词条")}</LinkButton>
        </div>
      </PageHero>
      <main className="w-full">
        <Container className="pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CatalogTabs baseId={baseId} label="词库来源" tabs={TABS} selected={source} onSelect={select} />
            <CatalogSearch id={`${baseId}-search`} label="搜索词库名称" maxBytes={MAX_PACK_QUERY_BYTES} search={search} />
          </div>
          <p className="m-0 mt-4 text-sm leading-[1.75] text-muted">{t(HINTS[source])}</p>
          <section id={catalogPanelId(baseId)} role="tabpanel" aria-labelledby={catalogTabId(baseId, source)} className="mt-6">
            <h2 className="sr-only">{t(tab.label)}</h2>
            {source === "official" ? <OfficialList query={search.query} /> : <CommunityList query={search.query} />}
          </section>
          <Card tone="muted" as="section" className="mt-12 rounded-tile px-6 py-[22px]" aria-labelledby={`${baseId}-how`}>
            <h2 id={`${baseId}-how`} className="m-0 font-heading text-[15.5px] font-bold text-ink">{t("如何导入词库")}</h2>
            <ol className="m-0 mt-2 list-decimal pl-5 text-sm leading-[1.85] text-body">
              <li>{t("安装水杉输入法。")}<LocaleLink to="/download/">{t("前往下载页")}</LocaleLink></li>
              <li>{t("专业词库：打开词库文件后另存到本机，在水杉输入法设置的「词库」页，于「本地词库管理」中选择对应的词库类型后点「导入」。每个词库的文件格式和导入方式见它的说明。")}</li>
              <li>{t("社区词库：在手机版水杉输入法登录账号，打开「社区」页的词库，搜索在这里看到的名称，导入到本机或云端词库。")}</li>
              <li>
                {t("缺少常用词？")}
                <LocaleLink to="/words/">{t("提交词条")}</LocaleLink>
                {t("，审核后会随词库更新进入所有人的默认词库。想补充专业词库，可以向")}{" "}
                <a href={REPO_URL} target="_blank" rel="noreferrer">msime-dictionary</a>{" "}
                {t("提交 Pull Request。")}
              </li>
            </ol>
          </Card>
        </Container>
      </main>
    </>
  );
}

function OfficialList({ query }: { query: string }) {
  const { t } = useLocale();
  const packs = useOfficialPacksQuery("dictionaries");
  if (packs.isPending) return <StatusCard busy>{t("正在读取专业词库…")}</StatusCard>;
  if (packs.isError) return <ErrorCard message="暂时无法读取专业词库，请稍后再试，或前往 GitHub 查看。" retry={() => void packs.refetch()} />;
  const items = packs.data.items.filter(item => nameMatches(item.name, query));
  if (items.length === 0) return <StatusCard>{t(emptyText("专业词库", query))}</StatusCard>;
  return (
    <>
      {packs.data.stale && <StaleNotice />}
      <ul className={CARD_GRID}>
        {items.map(item => <OfficialDictionaryCard key={item.id} pack={item} />)}
      </ul>
    </>
  );
}

function FileRow({ file }: { file: DictionaryFile }) {
  const { t } = useLocale();
  const label = FILE_LABELS[file.name];
  const facts = [label && t(label), file.entries !== undefined && t(`${file.entries.toLocaleString("en-US")} 条`), formatBytes(file.size)].filter(Boolean).join(" · ");
  return (
    <li className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 py-1.5 not-first:shadow-divider-t">
      <a className="font-mono text-[13px] [overflow-wrap:anywhere]" href={file.url} target="_blank" rel="noreferrer" aria-label={t(`打开 ${file.name}`)}>
        {file.name}
      </a>
      <span className="text-[12.5px] text-muted tabular-nums">{facts}</span>
    </li>
  );
}

function OfficialDictionaryCard({ pack }: { pack: OfficialDictionary }) {
  const { t } = useLocale();
  return (
    <CatalogCard
      name={pack.name}
      author={t("水杉输入法")}
      details={pack.license}
      description={pack.description}
      footer={
        <a className="inline-flex items-center gap-1 text-[13px]" href={pack.source} target="_blank" rel="noreferrer" aria-label={t(`在 GitHub 查看 ${pack.name} 的说明`)}>
          {t("说明与导入方式")}
          <ExternalIcon size={13} />
        </a>
      }
    >
      <ul className="m-0 mt-3 list-none rounded-field bg-panel-2 px-3 py-1 text-body" aria-label={t("词库文件")}>
        {pack.files.map(file => <FileRow key={file.name} file={file} />)}
      </ul>
    </CatalogCard>
  );
}

function CommunityList({ query }: { query: string }) {
  const { t } = useLocale();
  const packs = useCommunityPacksQuery("dictionaries", query);
  const noun = "社区词库";
  if (packs.isPending) return <StatusCard busy>{t(`正在读取${noun}…`)}</StatusCard>;
  if (packs.isError) return <ErrorCard message={`暂时无法读取${noun}，请稍后再试。`} retry={() => void packs.refetch()} />;
  const items = packs.data.pages.flatMap(page => page.items);
  const stale = packs.data.pages.some(page => page.stale);
  if (items.length === 0) return <StatusCard>{t(emptyText(noun, query))}</StatusCard>;
  return (
    <>
      {stale && <StaleNotice />}
      <ul className={CARD_GRID}>
        {items.map(item => <CommunityDictionaryCard key={item.id} item={item} />)}
      </ul>
      <LoadMore hasNextPage={packs.hasNextPage} isFetchingNextPage={packs.isFetchingNextPage} isFetchNextPageError={packs.isFetchNextPageError} fetchNextPage={packs.fetchNextPage} />
    </>
  );
}

function CommunityDictionaryCard({ item }: { item: CommunityDictionary }) {
  const { t } = useLocale();
  const kinds = ENTRY_KINDS.filter(kind => item.counts[kind] > 0);
  return (
    <CatalogCard
      badge={kinds.length > 0 ? kinds.map(kind => <Pill key={kind}>{t(`${ENTRY_KIND_LABELS[kind]} ${item.counts[kind]} 条`)}</Pill>) : undefined}
      name={item.name}
      author={item.author}
      description={item.description}
      footer={<GetInApp app="手机版水杉输入法" where="「社区」页" />}
    >
      {item.sample.length > 0 && (
        <p className="m-0 mt-2 text-[13px] leading-[1.7] text-body [overflow-wrap:anywhere]">
          <span className="sr-only">{t("部分词条：")}</span>
          {item.sample.join("、")}
          {item.sample.length < kinds.reduce((sum, kind) => sum + item.counts[kind], 0) && "…"}
        </p>
      )}
      <Metrics saves={item.saves} ratingCount={item.ratingCount} ratingAverage={item.ratingAverage} />
    </CatalogCard>
  );
}
