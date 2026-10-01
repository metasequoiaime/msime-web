import { useEffect, useId, useState, type ReactNode } from "react";
import { MAX_SKIN_QUERY_BYTES, useSkinsQuery, type SkinKind } from "./data/queries";
import type { CandidateSkin, KeyboardSkin } from "./data/schemas";
import { CANDIDATE_SKIN_CATEGORIES, CANDIDATE_SKIN_CATEGORY_LABELS, isCandidateSkinCategory, type CandidateSkinCategory } from "./data/skin-categories";
import { LocaleLink } from "./locale-link";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { KeyboardSkinPreview } from "./skins/keyboard-preview";
import { mayHavePhoto } from "./skins/keyboard-art";
import { Button, Card, Container, LinkButton, Pill, SearchIcon, cx } from "./ui";
import { usePageSearch } from "./use-page-search";
import { useLocale } from "./use-locale";

const KINDS: readonly SkinKind[] = ["keyboard", "candidate"];

const KIND_UI: Record<SkinKind, { tab: string; hint: string; noun: string }> = {
  keyboard: { tab: "键盘皮肤", hint: "改变屏幕键盘的配色、按键形状和材质。预览按皮肤的设计数据绘制，与 App 中看到的一致。", noun: "键盘皮肤" },
  candidate: { tab: "候选窗皮肤", hint: "改变候选窗的背景、文字和装饰图片。预览图由作者随皮肤包一起发布。", noun: "候选窗皮肤" },
};

/** The FAQ page's category chips: a filled chip for the selected one, outlined chips for the rest. */
const chipClass = (selected: boolean) =>
  cx(
    "inline-flex h-8 cursor-pointer items-center rounded-full border-0 px-3 text-[13.5px] leading-none whitespace-nowrap transition-colors duration-150 pointer-coarse:h-10",
    selected ? "bg-btn text-btn-fg" : "bg-transparent text-body shadow-ring-2 hover:bg-panel-2 hover:text-ink"
  );

/** Waits this long after the last keystroke before searching, so typing a name sends one request instead of one per character. */
const SEARCH_DELAY_MS = 300;

/** `communityRating` in the App's community-helpers.ts. */
const ratingText = (count: number, average: number) => (count === 0 ? "暂无评分" : `${average.toFixed(1)} 分`);

const byteLength = (value: string) => new TextEncoder().encode(value).length;

/** Cuts a pasted search to what the backend accepts, at a character boundary. */
const fitQuery = (value: string) => {
  let result = value;
  while (byteLength(result) > MAX_SKIN_QUERY_BYTES) result = [...result].slice(0, -1).join("");
  return result;
};

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
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const baseId = useId();
  const tabId = (value: SkinKind) => `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel`;

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [input]);

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
        <div className="mt-7 flex flex-wrap gap-3">
          <LinkButton to="/download/">{t("下载水杉输入法")}</LinkButton>
        </div>
      </PageHero>
      <main className="w-full">
        <Container className="pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex max-w-full flex-wrap gap-1 rounded-field bg-panel-2 p-1" role="tablist" aria-label={t("皮肤类型")}>
              {KINDS.map(value => (
                <button
                  key={value}
                  id={tabId(value)}
                  type="button"
                  role="tab"
                  aria-selected={kind === value}
                  aria-controls={panelId}
                  tabIndex={kind === value ? 0 : -1}
                  className={cx("inline-flex min-h-[38px] cursor-pointer items-center rounded-[9px] border-0 px-[18px] py-1.5 text-[14.5px] font-semibold transition-[background-color,color,box-shadow] duration-150", kind === value ? "bg-panel text-ink shadow-tab" : "bg-transparent text-muted hover:text-ink")}
                  onClick={() => select(value)}
                  onKeyDown={event => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                    event.preventDefault();
                    const next = KINDS[(KINDS.indexOf(value) + 1) % KINDS.length];
                    select(next);
                    document.getElementById(tabId(next))?.focus();
                  }}
                >
                  {t(KIND_UI[value].tab)}
                </button>
              ))}
            </div>
            <form className="relative w-full sm:w-[320px]" onSubmit={event => { event.preventDefault(); setQuery(input.trim()); }}>
              <label className="sr-only" htmlFor={`${baseId}-search`}>{t("搜索皮肤名称")}</label>
              <SearchIcon className="pointer-events-none absolute top-[13px] left-3.5 text-muted" />
              <input
                id={`${baseId}-search`}
                className="block h-11 w-full rounded-field border-0 bg-panel-2 pr-3.5 pl-[42px] font-[inherit] text-base text-ink placeholder:text-muted md:text-[15px] [&::-webkit-search-cancel-button]:cursor-pointer [&::-webkit-search-cancel-button]:grayscale"
                type="search"
                placeholder={t("搜索皮肤名称")}
                value={input}
                autoComplete="off"
                spellCheck={false}
                onChange={event => setInput(fitQuery(event.target.value))}
              />
            </form>
          </div>
          <p className="m-0 mt-4 text-sm leading-[1.75] text-muted">{t(KIND_UI[kind].hint)}</p>
          {kind === "candidate" && (
            <fieldset className="m-0 mt-4 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
              <legend className="sr-only">{t("候选窗皮肤分类")}</legend>
              {[undefined, ...CANDIDATE_SKIN_CATEGORIES].map(value => (
                <button key={value ?? "all"} type="button" className={chipClass(category === value)} aria-pressed={category === value} onClick={() => selectCategory(value)}>
                  {t(value ? CANDIDATE_SKIN_CATEGORY_LABELS[value] : "全部")}
                </button>
              ))}
            </fieldset>
          )}
          <section id={panelId} role="tabpanel" aria-labelledby={tabId(kind)} className="mt-6">
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

function StatusCard({ children, busy = false }: { children: ReactNode; busy?: boolean }) {
  return (
    <Card tone="raised" className="grid min-h-[220px] place-items-center rounded-shell p-8 text-center text-sm leading-[1.8] text-muted" role="status" aria-busy={busy || undefined}>
      <div>{children}</div>
    </Card>
  );
}

/** The empty-list message for the current search and category. */
const emptyText = (noun: string, query: string, category: CandidateSkinCategory | undefined) => {
  const where = category ? `「${CANDIDATE_SKIN_CATEGORY_LABELS[category]}」分类中` : "";
  if (query) return `${where}没有名称包含「${query}」的${noun}。`;
  return where ? `${where}还没有公开的${noun}。` : `还没有公开的${noun}。`;
};

function SkinList({ kind, query, category }: { kind: SkinKind; query: string; category?: CandidateSkinCategory }) {
  const { t } = useLocale();
  const skins = useSkinsQuery(kind, query, category);
  const noun = KIND_UI[kind].noun;

  if (skins.isPending) return <StatusCard busy>{t(`正在读取${noun}…`)}</StatusCard>;
  if (skins.isError)
    return (
      <StatusCard>
        <p className="m-0">{t(`暂时无法读取${noun}，请稍后再试。`)}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => void skins.refetch()}>{t("重试")}</Button>
      </StatusCard>
    );

  const items = skins.data.pages.flatMap(page => page.items as (KeyboardSkin | CandidateSkin)[]);
  const stale = skins.data.pages.some(page => page.stale);
  if (items.length === 0) return <StatusCard>{t(emptyText(noun, query, category))}</StatusCard>;

  return (
    <>
      {stale && <p className="m-0 mb-4 text-sm text-muted">{t("暂时无法更新，显示最近可用数据。")}</p>}
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4 p-0">
        {items.map(item => (kind === "keyboard" ? <KeyboardSkinCard key={item.id} skin={item as KeyboardSkin} /> : <CandidateSkinCard key={item.id} skin={item as CandidateSkin} />))}
      </ul>
      {skins.isFetchNextPageError && <p className="m-0 mt-4 text-center text-sm text-warn" role="alert">{t("加载更多失败，请稍后再试。")}</p>}
      {skins.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" disabled={skins.isFetchingNextPage} onClick={() => void skins.fetchNextPage()}>
            {t(skins.isFetchingNextPage ? "正在加载…" : "加载更多")}
          </Button>
        </div>
      )}
    </>
  );
}

function Metrics({ downloads, ratingCount, ratingAverage }: { downloads: number; ratingCount: number; ratingAverage: number }) {
  const { t } = useLocale();
  const rating = ratingText(ratingCount, ratingAverage);
  return (
    <p className="m-0 mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-muted tabular-nums">
      <span>
        <span aria-hidden="true">↓ {downloads.toLocaleString("en-US")}</span>
        <span className="sr-only">{t(`下载 ${downloads.toLocaleString("en-US")} 次`)}</span>
      </span>
      <span>
        <span aria-hidden="true">☆ {t(rating)}</span>
        <span className="sr-only">{t(ratingCount === 0 ? "暂无评分" : `评分 ${rating}，${ratingCount} 人评价`)}</span>
      </span>
    </p>
  );
}

/** Shared card body: name, author, description, metrics, and where to get the skin. */
function SkinCard({ preview, name, author, details, description, metrics }: { preview: ReactNode; name: string; author: string; details?: string; description: string; metrics: ReactNode }) {
  const { t } = useLocale();
  return (
    <Card as="li" tone="raised" className="flex min-w-0 flex-col overflow-hidden rounded-tile">
      {preview}
      <div className="flex flex-1 flex-col px-[18px] pt-3.5 pb-4">
        <h3 className="m-0 truncate font-heading text-base font-bold text-ink" title={name}>{name}</h3>
        <p className="m-0 mt-0.5 truncate text-[13px] text-muted">
          {author}
          {details && ` · ${details}`}
        </p>
        {description && <p className="m-0 mt-2 line-clamp-2 text-[13.5px] leading-[1.7] text-body [overflow-wrap:anywhere]">{description}</p>}
        {metrics}
        <p className="m-0 mt-auto pt-3 text-[12.5px] leading-[1.7] text-muted">
          {t("在")}
          <LocaleLink to="/download/">{t("水杉输入法")}</LocaleLink>
          {t("的「社区」页搜索名称获取")}
        </p>
      </div>
    </Card>
  );
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
