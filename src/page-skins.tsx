import { useId, useState, type ReactNode } from "react";
import { CARD_GRID, CatalogCard, CatalogSearch, CatalogTabs, catalogPanelId, catalogTabId, CommunitySectionNav, emptyText, ErrorCard, FilterChips, GetInApp, LoadMore, Metrics, StaleNotice, StatusCard, useCatalogSearch, type CatalogTab } from "./community/catalog";
import { MAX_SKIN_QUERY_BYTES, useSkinsQuery, type SkinKind } from "./data/queries";
import type { CandidateSkin, KeyboardSkin } from "./data/schemas";
import { CANDIDATE_SKIN_CATEGORIES, CANDIDATE_SKIN_CATEGORY_LABELS, isCandidateSkinCategory, type CandidateSkinCategory } from "./data/skin-categories";
import { LocaleLink } from "./locale-link";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { KeyboardSkinPreview } from "./skins/keyboard-preview";
import { mayHavePhoto } from "./skins/keyboard-art";
import { Card, Container, KeyboardIcon, LinkButton, MonitorIcon, Pill } from "./ui";
import { usePageSearch } from "./use-page-search";
import { useLocale } from "./use-locale";

const KINDS: readonly SkinKind[] = ["keyboard", "candidate"];

// `caption` names where each kind shows up, because the obvious 手机/电脑 split is wrong: keyboard skins also dress the desktop screen keyboard, and candidate skins also colour the mobile candidate bar when 使用桌面候选皮肤 is on.
const KIND_UI: Record<SkinKind, { tab: string; caption: string; icon: CatalogTab<SkinKind>["icon"]; hint: string; noun: string }> = {
  keyboard: { tab: "键盘皮肤", caption: "手机键盘、屏幕键盘", icon: KeyboardIcon, hint: "改变屏幕键盘的配色、按键形状和材质。预览按皮肤的设计数据绘制，与 App 中看到的一致。", noun: "键盘皮肤" },
  candidate: { tab: "候选窗皮肤", caption: "电脑打字时的候选框", icon: MonitorIcon, hint: "改变候选窗的背景、文字和装饰图片。预览图由作者随皮肤包一起发布。", noun: "候选窗皮肤" },
};

const TABS: readonly CatalogTab<SkinKind>[] = KINDS.map(value => ({ value, label: KIND_UI[value].tab, caption: KIND_UI[value].caption, icon: KIND_UI[value].icon }));

/**
 * 社区皮肤：the keyboard and candidate-window skins people publish from the App's 社区 page. Browsing only: downloading needs a signed-in App session, so every card sends visitors to the App. The list is read client-side from `/api/skins/*`; the static HTML carries the page text and the empty tab shell.
 */
export function SkinsPage() {
  const { t } = useLocale();
  usePageMeta();
  const { choice, get, update } = usePageSearch();
  const kind = choice("kind", KINDS, "keyboard");
  // Only candidate skins have categories. An unknown value in a shared URL shows every category rather than an error.
  const rawCategory = get("category");
  const category = kind === "candidate" && isCandidateSkinCategory(rawCategory) ? rawCategory : undefined;
  const search = useCatalogSearch();
  const query = search.query;
  const baseId = useId();

  const select = (value: SkinKind) => update({ kind: value === "keyboard" ? undefined : value, category: undefined }, true);
  const selectCategory = (value: CandidateSkinCategory | undefined) => update({ category: value }, true);

  return (
    <>
      <PageHero
        variant="plain"
        kicker="App 创作社区"
        title="社区皮肤"
        lead="这里展示水杉输入法用户公开发布的键盘皮肤和候选窗皮肤，按发布时间从新到旧排列。网页只提供浏览：想使用某款皮肤，请在水杉输入法的「社区」页搜索它的名称，登录账号后即可下载并应用。"
      >
        <CommunitySectionNav current="/skins/" />
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton to="/download/">{t("下载水杉输入法")}</LinkButton>
        </div>
      </PageHero>
      <main className="w-full">
        <Container className="pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CatalogTabs baseId={baseId} label="皮肤类型" tabs={TABS} selected={kind} onSelect={select} />
            <CatalogSearch id={`${baseId}-search`} label="搜索皮肤名称" maxBytes={MAX_SKIN_QUERY_BYTES} search={search} />
          </div>
          <p className="m-0 mt-4 text-sm leading-[1.75] text-muted">{t(KIND_UI[kind].hint)}</p>
          {kind === "candidate" && <FilterChips legend="候选窗皮肤分类" values={CANDIDATE_SKIN_CATEGORIES} labels={CANDIDATE_SKIN_CATEGORY_LABELS} selected={category} onSelect={selectCategory} />}
          <section id={catalogPanelId(baseId)} role="tabpanel" aria-labelledby={catalogTabId(baseId, kind)} className="mt-6">
            <h2 className="sr-only">{t(KIND_UI[kind].tab)}</h2>
            {kind === "keyboard" ? <SkinList kind="keyboard" query={query} /> : <SkinList kind="candidate" query={query} category={category} />}
          </section>
          <Card tone="muted" as="section" className="mt-12 rounded-tile px-6 py-[22px]" aria-labelledby={`${baseId}-how`}>
            <h2 id={`${baseId}-how`} className="m-0 font-heading text-[15.5px] font-bold text-ink">{t("如何使用社区皮肤")}</h2>
            <ol className="m-0 mt-2 list-decimal pl-5 text-sm leading-[1.85] text-body">
              <li>{t("安装水杉输入法并登录账号。")}<LocaleLink to="/download/">{t("前往下载页")}</LocaleLink></li>
              <li>{t("打开水杉输入法的「社区」页，选择键盘皮肤或候选窗皮肤。")}</li>
              <li>{t("搜索在这里看到的皮肤名称，下载后即可应用。也可以在 App 中为喜欢的皮肤评分，或发布自己的作品。")}</li>
            </ol>
          </Card>
        </Container>
      </main>
    </>
  );
}

/** The empty-list message for the current search and category. */
const skinEmptyText = (noun: string, query: string, category: CandidateSkinCategory | undefined) => emptyText(noun, query, category ? `「${CANDIDATE_SKIN_CATEGORY_LABELS[category]}」分类中` : "");

function SkinList({ kind, query, category }: { kind: SkinKind; query: string; category?: CandidateSkinCategory }) {
  const { t } = useLocale();
  const skins = useSkinsQuery(kind, query, category);
  const noun = KIND_UI[kind].noun;

  if (skins.isPending) return <StatusCard busy>{t(`正在读取${noun}…`)}</StatusCard>;
  if (skins.isError) return <ErrorCard message={`暂时无法读取${noun}，请稍后再试。`} retry={() => void skins.refetch()} />;

  const items = skins.data.pages.flatMap(page => page.items as (KeyboardSkin | CandidateSkin)[]);
  const stale = skins.data.pages.some(page => page.stale);
  if (items.length === 0) return <StatusCard>{t(skinEmptyText(noun, query, category))}</StatusCard>;

  return (
    <>
      {stale && <StaleNotice />}
      <ul className={CARD_GRID}>
        {items.map(item => (kind === "keyboard" ? <KeyboardSkinCard key={item.id} skin={item as KeyboardSkin} /> : <CandidateSkinCard key={item.id} skin={item as CandidateSkin} />))}
      </ul>
      <LoadMore hasNextPage={skins.hasNextPage} isFetchingNextPage={skins.isFetchingNextPage} isFetchNextPageError={skins.isFetchNextPageError} fetchNextPage={skins.fetchNextPage} />
    </>
  );
}

/** A skin card: the preview on top, and the App's 社区 page as where to get it. */
function SkinCard({ metrics, ...props }: { preview: ReactNode; name: string; author: string; details?: string; description: string; metrics: ReactNode }) {
  return <CatalogCard {...props} footer={<GetInApp where="「社区」页" />}>{metrics}</CatalogCard>;
}

function KeyboardSkinCard({ skin }: { skin: KeyboardSkin }) {
  return (
    <SkinCard
      preview={<KeyboardSkinPreview className="block aspect-[390/232] h-auto w-full" design={skin.design} photoUrl={mayHavePhoto(skin.design) ? `/api/skins/keyboard/${skin.id}/photo` : undefined} />}
      name={skin.name}
      author={skin.author}
      description={skin.description}
      metrics={<Metrics downloads={skin.downloads} ratingCount={skin.ratingCount} ratingAverage={skin.ratingAverage} />}
    />
  );
}

function CandidateSkinCard({ skin }: { skin: CandidateSkin }) {
  const { t } = useLocale();
  const [failed, setFailed] = useState(false);
  return (
    <SkinCard
      preview={
        <div className="relative grid aspect-[390/232] place-items-center bg-panel-2 p-4">
          {skin.category && <Pill className="absolute top-3 left-3 shadow-ring-2">{t(CANDIDATE_SKIN_CATEGORY_LABELS[skin.category])}</Pill>}
          {failed ? (
            <span className="text-[13px] text-muted">{t("暂无预览")}</span>
          ) : (
            <img className="block max-h-full max-w-full object-contain" src={`/api/skins/candidate/${skin.id}/preview${skin.version ? `?v=${encodeURIComponent(skin.version)}` : ""}`} alt={t(`${skin.name} 的预览图`)} loading="lazy" decoding="async" onError={() => setFailed(true)} />
          )}
        </div>
      }
      name={skin.name}
      author={skin.author}
      details={[skin.version && `v${skin.version}`, skin.license].filter(Boolean).join(" · ")}
      description={skin.description}
      metrics={<Metrics downloads={skin.downloads} ratingCount={skin.ratingCount} ratingAverage={skin.ratingAverage} />}
    />
  );
}
