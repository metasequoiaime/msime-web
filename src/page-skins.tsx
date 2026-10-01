import { useId } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAccount } from "./account/session";
import { cardGridClass, Chips, CommunitySectionNav, PagedList, SearchBox, SegmentedTabs, StatusCard, tabId, useSearch } from "./community/parts";
import { v1CandidateSkinsQuery, v1KeyboardSkinsQuery } from "./data/account";
import { MAX_SKIN_QUERY_BYTES, useSkinsQuery, type SkinKind } from "./data/queries";
import type { CandidateSkin, KeyboardSkin } from "./data/schemas";
import { CANDIDATE_SKIN_CATEGORIES, CANDIDATE_SKIN_CATEGORY_LABELS, isCandidateSkinCategory, type CandidateSkinCategory } from "./data/skin-categories";
import { LocaleLink } from "./locale-link";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { CandidateSkinCard, fromV1Candidate, fromV1Keyboard, KeyboardSkinCard, type CandidateCardSkin, type KeyboardCardSkin } from "./skins/skin-cards";
import { Card, Container, KeyboardIcon, LinkButton, MonitorIcon } from "./ui";
import { usePageSearch } from "./use-page-search";
import { useLocale } from "./use-locale";

const KINDS: readonly SkinKind[] = ["keyboard", "candidate"];

// `caption` names where each kind shows up, because the obvious 手机/电脑 split is wrong: keyboard skins also dress the desktop screen keyboard, and candidate skins also colour the mobile candidate bar when 使用桌面候选皮肤 is on.
const KIND_UI: Record<SkinKind, { tab: string; caption: string; icon: typeof KeyboardIcon; hint: string; noun: string }> = {
  keyboard: { tab: "键盘皮肤", caption: "手机键盘、屏幕键盘", icon: KeyboardIcon, hint: "改变屏幕键盘的配色、按键形状和材质。预览按皮肤的设计数据绘制，与 App 中看到的一致。", noun: "键盘皮肤" },
  candidate: { tab: "候选窗皮肤", caption: "电脑打字时的候选框", icon: MonitorIcon, hint: "改变候选窗的背景、文字和装饰图片。预览图由作者随皮肤包一起发布。", noun: "候选窗皮肤" },
};

const TAB_LABELS = { keyboard: KIND_UI.keyboard.tab, candidate: KIND_UI.candidate.tab };
const TAB_CAPTIONS = { keyboard: KIND_UI.keyboard.caption, candidate: KIND_UI.candidate.caption };
const TAB_ICONS = { keyboard: KIND_UI.keyboard.icon, candidate: KIND_UI.candidate.icon };

/**
 * 社区皮肤：the keyboard and candidate-window skins people publish from the App's 社区 page. Anonymous visitors read the edge-cached public list from `/api/skins/*`; a signed-in visitor reads the same catalog through the account proxy, which adds their own rating and favourites, and can rate and favourite from the cards. Downloading stays in the App. The static HTML carries the page text and the empty tab shell.
 */
export function SkinsPage() {
  const { t } = useLocale();
  usePageMeta();
  const { choice, get, update } = usePageSearch();
  const kind = choice("kind", KINDS, "keyboard");
  // Only candidate skins have categories. An unknown value in a shared URL shows every category rather than an error.
  const rawCategory = get("category");
  const category = kind === "candidate" && isCandidateSkinCategory(rawCategory) ? rawCategory : undefined;
  const search = useSearch();
  const baseId = useId();
  const panelId = `${baseId}-panel`;

  const select = (value: SkinKind) => update({ kind: value === "keyboard" ? undefined : value, category: undefined }, true);
  const selectCategory = (value: CandidateSkinCategory | undefined) => update({ category: value }, true);

  return (
    <>
      <PageHero
        variant="plain"
        kicker="App 创作社区"
        title="社区皮肤"
        lead="这里展示水杉输入法用户公开发布的键盘皮肤和候选窗皮肤，按发布时间从新到旧排列。登录后可以在网页上收藏和评分；想使用某款皮肤，请在水杉输入法的「社区」页搜索它的名称，登录账号后即可下载并应用。"
      >
        <div className="mt-7 flex flex-wrap gap-3">
          <LinkButton to="/download/">{t("下载水杉输入法")}</LinkButton>
        </div>
      </PageHero>
      <CommunitySectionNav current="/skins/" />
      <main className="w-full">
        <Container className="pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SegmentedTabs label="皮肤类型" values={KINDS} labels={TAB_LABELS} captions={TAB_CAPTIONS} icons={TAB_ICONS} value={kind} onChange={select} panelId={panelId} />
            <SearchBox label="搜索皮肤名称" maxBytes={MAX_SKIN_QUERY_BYTES} search={search} />
          </div>
          <p className="m-0 mt-4 text-sm leading-[1.75] text-muted">{t(KIND_UI[kind].hint)}</p>
          {kind === "candidate" && <Chips legend="候选窗皮肤分类" values={CANDIDATE_SKIN_CATEGORIES} labels={CANDIDATE_SKIN_CATEGORY_LABELS} value={category} onChange={selectCategory} />}
          <section id={panelId} role="tabpanel" aria-labelledby={tabId(panelId, kind)} className="mt-6">
            <h2 className="sr-only">{t(KIND_UI[kind].tab)}</h2>
            <SkinList kind={kind} query={search.query} category={category} />
          </section>
          <Card tone="muted" as="section" className="mt-12 rounded-tile px-6 py-[22px]" aria-labelledby={`${baseId}-how`}>
            <h2 id={`${baseId}-how`} className="m-0 font-heading text-[15.5px] font-bold text-ink">{t("如何使用社区皮肤")}</h2>
            <ol className="m-0 mt-2 list-decimal pl-5 text-sm leading-[1.85] text-body">
              <li>{t("安装水杉输入法并登录账号。")}<LocaleLink to="/download/">{t("前往下载页")}</LocaleLink></li>
              <li>{t("打开水杉输入法的「社区」页，选择键盘皮肤或候选窗皮肤。")}</li>
              <li>{t("搜索在这里看到的皮肤名称，下载后即可应用。也可以在 App 中发布自己的作品。")}</li>
            </ol>
          </Card>
        </Container>
      </main>
    </>
  );
}

/** The empty-list message for the current search and category. */
const emptyText = (noun: string, query: string, category: CandidateSkinCategory | undefined) => {
  const where = category ? `「${CANDIDATE_SKIN_CATEGORY_LABELS[category]}」分类中` : "";
  if (query) return `${where}没有名称包含「${query}」的${noun}。`;
  return where ? `${where}还没有公开的${noun}。` : `还没有公开的${noun}。`;
};

type ListProps = { kind: SkinKind; query: string; category?: CandidateSkinCategory };

/** Waits for the session before picking a source, so a signed-in visitor does not load the public list only to replace it. */
function SkinList(props: ListProps) {
  const { t } = useLocale();
  const { status } = useAccount();
  if (status === "unknown") return <StatusCard busy>{t(`正在读取${KIND_UI[props.kind].noun}…`)}</StatusCard>;
  if (status === "signed-in") return props.kind === "keyboard" ? <AccountKeyboardList {...props} /> : <AccountCandidateList {...props} />;
  return <PublicSkinList {...props} />;
}

const KeyboardGrid = (items: KeyboardCardSkin[]) => (
  <ul className={cardGridClass}>
    {items.map(item => <KeyboardSkinCard key={item.id} skin={item} />)}
  </ul>
);

const CandidateGrid = (items: CandidateCardSkin[]) => (
  <ul className={cardGridClass}>
    {items.map(item => <CandidateSkinCard key={item.id} skin={item} />)}
  </ul>
);

function PublicSkinList({ kind, query, category }: ListProps) {
  const skins = useSkinsQuery(kind, query, category);
  const noun = KIND_UI[kind].noun;
  return (
    <PagedList<KeyboardSkin | CandidateSkin> query={skins} noun={noun} empty={emptyText(noun, query, category)}>
      {items => (kind === "keyboard" ? KeyboardGrid(items as KeyboardSkin[]) : CandidateGrid(items as CandidateSkin[]))}
    </PagedList>
  );
}

function AccountKeyboardList({ query }: ListProps) {
  const skins = useInfiniteQuery(v1KeyboardSkinsQuery(query));
  return (
    <PagedList query={skins} noun="键盘皮肤" empty={emptyText("键盘皮肤", query, undefined)}>
      {items => KeyboardGrid(items.map(fromV1Keyboard))}
    </PagedList>
  );
}

function AccountCandidateList({ query, category }: ListProps) {
  const skins = useInfiniteQuery(v1CandidateSkinsQuery(query, category));
  return (
    <PagedList query={skins} noun="候选窗皮肤" empty={emptyText("候选窗皮肤", query, category)}>
      {items => CandidateGrid(items.map(fromV1Candidate))}
    </PagedList>
  );
}
