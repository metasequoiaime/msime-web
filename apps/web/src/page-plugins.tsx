import { useInfiniteQuery } from "@tanstack/react-query";
import { useId } from "react";
import { useAccount } from "./account/session";
import { OfficialPluginsPanel } from "./community/official-packs";
import { cardGridClass, Chips, PagedList, SearchBox, SegmentedTabs, StatusCard, tabId, useSearch } from "./community/parts";
import { COMMUNITY_SECTIONS } from "./community/sections";
import { SectionNav } from "./section-nav";
import { PLUGIN_KIND_LABELS, PluginCard } from "./community/resource-card";
import { pluginsQuery } from "./data/account";
import { MAX_SKIN_QUERY_BYTES } from "./data/queries";
import { LIVE_PLUGIN_KINDS, PLUGIN_KINDS, type PluginKind } from "./data/schemas";
import { LocaleLink } from "./locale-link";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { Card, Container, LinkButton } from "./ui";
import { usePageSearch } from "./use-page-search";
import { useLocale } from "./use-locale";

const isPluginKind = (value: string): value is PluginKind => (PLUGIN_KINDS as readonly string[]).includes(value);

/** 社区插件 stays the default tab; 官方插件 (msime-plugins, src/community/official-packs.tsx) is `?source=official`. */
const SOURCES = ["community", "official"] as const;
const SOURCE_LABELS = { community: "社区插件", official: "官方插件" };

/**
 * 社区插件：sound packs, background music, command tables and typing effects people publish from the App (`/v1/community/plugins`, docs/plugin-community.md). The packages themselves are only downloaded and installed by the App; the website browses, favourites and rates. The 官方插件 tab lists the packs in msime-plugins, whose .zip anyone can download and import.
 */
export function PluginsPage() {
  const { t } = useLocale();
  usePageMeta();
  const { choice, get, update } = usePageSearch();
  const source = choice("source", SOURCES, "community");
  const rawKind = get("kind");
  const kind = isPluginKind(rawKind) ? rawKind : undefined;
  const search = useSearch();
  const baseId = useId();
  const panelId = `${baseId}-panel`;

  return (
    <>
      <PageHero
        variant="plain"
        kicker="官方与社区"
        title="插件"
        lead="这里展示水杉输入法用户发布的插件：音效包、音乐包、指令表和特效包，按发布时间从新到旧排列。登录后可以收藏和评分；插件需要在水杉输入法的「社区」页下载安装。官方插件由项目维护，无需登录，可以直接下载 .zip 导入。"
      >
        <div className="mt-7 flex flex-wrap gap-3">
          <LinkButton to="/download/">{t("下载水杉输入法")}</LinkButton>
        </div>
      </PageHero>
      <SectionNav group={COMMUNITY_SECTIONS} current="/plugins/" />
      <main className="w-full">
        <Container className="pt-8">
          <SegmentedTabs label="插件来源" values={SOURCES} labels={SOURCE_LABELS} value={source} onChange={value => update({ source: value === "community" ? undefined : value, kind: undefined }, true)} panelId={panelId} />
          <div id={panelId} role="tabpanel" aria-labelledby={tabId(panelId, source)} className="mt-6">
          <h2 className="sr-only">{t(SOURCE_LABELS[source])}</h2>
          {source === "official" ? <OfficialPluginsPanel kind={kind} onKind={value => update({ kind: value }, true)} /> : <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Chips legend="插件类型" values={LIVE_PLUGIN_KINDS} labels={PLUGIN_KIND_LABELS} value={kind} onChange={value => update({ kind: value }, true)} />
            <SearchBox label="搜索插件名称" maxBytes={MAX_SKIN_QUERY_BYTES} search={search} />
          </div>
          <section className="mt-6" aria-label={t("插件列表")}>
            <PluginList kind={kind} query={search.query} />
          </section>
          <Card tone="muted" as="section" className="mt-12 rounded-tile px-6 py-[22px]" aria-labelledby={`${baseId}-how`}>
            <h2 id={`${baseId}-how`} className="m-0 font-heading text-[15.5px] font-bold text-ink">{t("如何使用社区插件")}</h2>
            <ol className="m-0 mt-2 list-decimal pl-5 text-sm leading-[1.85] text-body">
              <li>{t("安装水杉输入法并登录账号。")}<LocaleLink to="/download/">{t("前往下载页")}</LocaleLink></li>
              <li>{t("打开水杉输入法的「社区」页，选择插件，搜索在这里看到的名称。")}</li>
              <li>{t("按 App 中的提示下载安装。插件只包含音频、指令、短语、符号、码表和词表等数据，不含可执行代码。")}</li>
            </ol>
          </Card>
          </>}
          </div>
        </Container>
      </main>
    </>
  );
}

function PluginList({ kind, query }: { kind?: PluginKind; query: string }) {
  const { t } = useLocale();
  const { status } = useAccount();
  if (status === "unknown") return <StatusCard busy>{t("正在读取插件…")}</StatusCard>;
  return <PluginItems kind={kind} query={query} signedIn={status === "signed-in"} />;
}

function PluginItems({ kind, query, signedIn }: { kind?: PluginKind; query: string; signedIn: boolean }) {
  const items = useInfiniteQuery(pluginsQuery(query, kind, "", signedIn));
  const where = kind ? `「${PLUGIN_KIND_LABELS[kind]}」中` : "";
  return (
    <PagedList query={items} noun="插件" empty={query ? `${where}没有名称包含「${query}」的插件。` : `${where}还没有公开的插件。`}>
      {rows => (
        <ul className={cardGridClass}>
          {rows.map(item => <PluginCard key={item.id} item={item} />)}
        </ul>
      )}
    </PagedList>
  );
}
