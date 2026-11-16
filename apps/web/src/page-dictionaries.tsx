import { useInfiniteQuery } from "@tanstack/react-query";
import { useId } from "react";
import { useAccount } from "./account/session";
import { OFFICIAL_DICTIONARIES_HINT, OfficialDictionariesHowTo, OfficialDictionaryList } from "./community/official-packs";
import { cardGridClass, PagedList, SearchBox, SegmentedTabs, StatusCard, tabId, useSearch } from "./community/parts";
import { COMMUNITY_SECTIONS } from "./community/sections";
import { SectionNav } from "./section-nav";
import { ResourceCard } from "./community/resource-card";
import { resourcesQuery } from "./data/account";
import { MAX_SKIN_QUERY_BYTES } from "./data/queries";
import { RESOURCE_KINDS, type ResourceKind } from "./data/schemas";
import { LocaleLink } from "./locale-link";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { Card, Container, LinkButton } from "./ui";
import { usePageSearch } from "./use-page-search";
import { useLocale } from "./use-locale";

const KIND_UI: Record<ResourceKind, { tab: string; hint: string; noun: string }> = {
  dictionary: { tab: "词库", hint: "用户整理的词条合集，每份最多 128 条，包括拼音、五笔、英文词条和快捷短语。在 App 中预览后再加入个人词库，不会覆盖你已有的词。", noun: "词库" },
  reply: { tab: "回复模板", hint: "每个回复模板只包含一段提示文字，不含任何密钥或服务配置。", noun: "回复模板" },
};

/** The community kinds, then 专业词库 (msime-dictionary `packs/`, src/community/official-packs.tsx) as `?kind=official`. */
const TABS = [...RESOURCE_KINDS, "official"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = { dictionary: KIND_UI.dictionary.tab, reply: KIND_UI.reply.tab, official: "专业词库" };

/**
 * 社区词库：the word packs and reply templates people share from the App (`/v1/community/resources`). A signed-in visitor reads it through the account proxy, so they see and change their own favourites and ratings; anonymous visitors read the same public catalog from the edge-cached `/api/resources`. The 专业词库 tab lists the professional word lists in msime-dictionary, which anyone can download and import.
 */
export function DictionariesPage() {
  const { t } = useLocale();
  usePageMeta();
  const { choice, update } = usePageSearch();
  const kind = choice("kind", TABS, "dictionary");
  const search = useSearch();
  const baseId = useId();
  const panelId = `${baseId}-panel`;

  return (
    <>
      <PageHero
        variant="plain"
        kicker="官方与社区"
        title="词库"
        lead="这里展示水杉输入法用户分享的词库和回复模板，按发布时间从新到旧排列。登录后可以收藏和评分；收藏的作品在 App 中登录同一账号后，可以在「社区」页的收藏里找到并使用。专业词库面向特定领域，由项目维护，无需登录即可下载导入。"
      >
        <div className="mt-7 flex flex-wrap gap-3">
          <LinkButton to="/download/">{t("下载水杉输入法")}</LinkButton>
        </div>
      </PageHero>
      <SectionNav group={COMMUNITY_SECTIONS} current="/dictionaries/" />
      <main className="w-full">
        <Container className="pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SegmentedTabs label="作品类型" values={TABS} labels={TAB_LABELS} value={kind} onChange={value => update({ kind: value === "dictionary" ? undefined : value }, true)} panelId={panelId} />
            <SearchBox label="搜索名称" maxBytes={MAX_SKIN_QUERY_BYTES} search={search} />
          </div>
          <p className="m-0 mt-4 text-sm leading-[1.75] text-muted">{t(kind === "official" ? OFFICIAL_DICTIONARIES_HINT : KIND_UI[kind].hint)}</p>
          <section id={panelId} role="tabpanel" aria-labelledby={tabId(panelId, kind)} className="mt-6">
            <h2 className="sr-only">{t(TAB_LABELS[kind])}</h2>
            {kind === "official" ? <OfficialDictionaryList query={search.query} /> : <ResourceList kind={kind} query={search.query} />}
          </section>
          {kind === "official" ? <OfficialDictionariesHowTo /> : <Card tone="muted" as="section" className="mt-12 rounded-tile px-6 py-[22px]" aria-labelledby={`${baseId}-how`}>
            <h2 id={`${baseId}-how`} className="m-0 font-heading text-[15.5px] font-bold text-ink">{t("如何使用社区词库")}</h2>
            <ol className="m-0 mt-2 list-decimal pl-5 text-sm leading-[1.85] text-body">
              <li>{t("安装水杉输入法并登录账号。")}<LocaleLink to="/download/">{t("前往下载页")}</LocaleLink></li>
              <li>{t("打开水杉输入法的「社区」页，选择词库或回复模板，搜索在这里看到的名称。")}</li>
              <li>{t("收藏或应用需要的作品。也可以在 App 中分享自己整理的词库和回复模板。")}</li>
            </ol>
          </Card>}
        </Container>
      </main>
    </>
  );
}

function ResourceList({ kind, query }: { kind: ResourceKind; query: string }) {
  const { t } = useLocale();
  const { status } = useAccount();
  const noun = KIND_UI[kind].noun;
  if (status === "unknown") return <StatusCard busy>{t(`正在读取${noun}…`)}</StatusCard>;
  return <ResourceItems kind={kind} query={query} signedIn={status === "signed-in"} />;
}

function ResourceItems({ kind, query, signedIn }: { kind: ResourceKind; query: string; signedIn: boolean }) {
  const items = useInfiniteQuery(resourcesQuery(kind, query, "", signedIn));
  const noun = KIND_UI[kind].noun;
  return (
    <PagedList query={items} noun={noun} empty={query ? `没有名称包含「${query}」的${noun}。` : `还没有公开的${noun}。`}>
      {rows => (
        <ul className={cardGridClass}>
          {rows.map(item => <ResourceCard key={item.id} item={item} />)}
        </ul>
      )}
    </PagedList>
  );
}
