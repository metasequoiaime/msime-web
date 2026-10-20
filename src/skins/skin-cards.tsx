import { useQuery } from "@tanstack/react-query";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Reactions } from "../account/reactions";
import { candidatePreviewQuery } from "../data/account";
import type { CandidateSkin, KeyboardSkin, V1CandidateSkin, V1KeyboardSkin } from "../data/schemas";
import { CANDIDATE_SKIN_CATEGORY_LABELS } from "../data/skin-categories";
import { Card, cx, Pill } from "../ui";
import { CatalogDescription, CatalogTitle } from "../community/card-content";
import { candidatePreviewKey, candidateTraits } from "./candidate-card-data";
import { samplePreviewPalette, type PreviewPalette } from "./preview-palette";
import { useLocale } from "../use-locale";
import { mayHavePhoto, type KeyboardPreviewLayout } from "./keyboard-art";
import { KeyboardSkinPreview } from "./keyboard-preview";
import { CandidateDownloadButton } from "./candidate-download-button";

/*
 * The community skin cards, shared by the 社区皮肤 gallery and the 我的 page. A card is a preview, the name and author, an optional description, the download count, and a footer: the rating and favourite controls in the gallery, the work's own status in 我的.
 */

/** What a signed-in viewer knows about a skin besides its public data (see `viewerFields` in src/data/schemas.ts). */
export type Viewer = { myRating?: number; owned?: boolean; saved?: boolean; saves?: number; moderation?: "approved" | "pending" | "removed"; visibility?: "private" | "public" };

export type KeyboardCardSkin = KeyboardSkin & Viewer;
export type CandidateCardSkin = CandidateSkin & Viewer;

const viewer = (row: V1KeyboardSkin | V1CandidateSkin): Viewer => ({ myRating: row.my_rating, owned: row.owned, saved: row.saved, saves: row.saves, moderation: row.moderation });

/** A keyboard skin read through the account proxy, in the shape the public list uses. */
export const fromV1Keyboard = (row: V1KeyboardSkin): KeyboardCardSkin => ({ id: row.id, name: row.name, description: row.description, author: row.author, design: row.design, downloads: row.downloads, ratingCount: row.rating_count, ratingAverage: row.rating_average, ...viewer(row) });

export const fromV1Candidate = (row: V1CandidateSkin): CandidateCardSkin => ({
  id: row.id,
  name: row.name,
  description: row.description,
  author: row.author,
  version: row.version,
  license: row.license.assets,
  size: row.size,
  ...(row.file_count === undefined ? {} : { fileCount: row.file_count }),
  downloads: row.downloads,
  ratingCount: row.rating_count,
  ratingAverage: row.rating_average,
  createdAt: row.created_at,
  ...(row.category ? { category: row.category } : {}),
  ...viewer(row),
  visibility: row.visibility,
});

/** 皮肤卡片共用预览、标签、名称、作者、描述与下载和评分页脚。 */
export function SkinCard({ preview, badges, name, author, details, description, footer }: { preview: ReactNode; badges?: ReactNode; name: string; author: string; details?: string; description: string; footer: ReactNode }) {
  return (
    <Card as="li" tone="raised" className="flex min-w-0 flex-col overflow-hidden rounded-tile">
      {preview}
      <div className="flex flex-1 flex-col px-[18px] pt-3.5 pb-3">
        {badges && <div className="mb-2 flex flex-wrap items-center gap-1.5">{badges}</div>}
        <CatalogTitle name={name} />
        <p className="m-0 mt-0.5 truncate text-[13px] leading-5 text-muted" title={[author, details].filter(Boolean).join(" · ")}>
          {author}
          {details && ` · ${details}`}
        </p>
        <CatalogDescription description={description} />
        <div className="mt-auto">{footer}</div>
      </div>
    </Card>
  );
}

/** 作品的私有和已下架状态；候选窗皮肤在正文内显示，避免遮挡作者上传的图片。 */
function StatusPills({ skin, inline = false }: { skin: Viewer; inline?: boolean }) {
  const { t } = useLocale();
  if (skin.visibility !== "private" && skin.moderation !== "removed") return null;
  return (
    <span className={inline ? "flex flex-wrap gap-1.5" : "absolute top-3 right-3 flex gap-1.5"}>
      {skin.visibility === "private" && <Pill tone="neutral" className="shadow-ring-2">{t("私有")}</Pill>}
      {skin.moderation === "removed" && <Pill tone="warn">{t("已下架")}</Pill>}
    </span>
  );
}

/** The gallery footer, or with `own` the 我的 footer: the rating summary only, since nobody rates their own work. */
function Footer({ kind, skin, own }: { kind: "keyboard" | "candidate"; skin: (KeyboardSkin | CandidateSkin) & Viewer; own: boolean }) {
  const { t } = useLocale();
  if (own) return <p className="m-0 mt-3 text-[13px] text-muted tabular-nums">{t(`↓ ${skin.downloads.toLocaleString("en-US")} · ${skin.ratingCount === 0 ? "暂无评分" : `${skin.ratingAverage.toFixed(1)} 分 · ${skin.ratingCount} 人评价`}`)}</p>;
  return <Reactions kind={kind} id={skin.id} ratingCount={skin.ratingCount} ratingAverage={skin.ratingAverage} myRating={skin.myRating} owned={skin.owned} saved={skin.saved} saves={skin.saves} downloads={skin.downloads} />;
}

export function KeyboardSkinCard({ skin, own = false, layout }: { skin: KeyboardCardSkin; own?: boolean; layout?: KeyboardPreviewLayout }) {
  return (
    <SkinCard
      preview={
        <div className="relative">
          <KeyboardSkinPreview className="block aspect-[390/232] h-auto w-full" design={skin.design} layout={layout} photoUrl={mayHavePhoto(skin.design) ? `/api/skins/keyboard/${skin.id}/photo` : undefined} />
          <StatusPills skin={skin} />
        </div>
      }
      name={skin.name}
      author={skin.author}
      description={skin.description}
      footer={<Footer kind="keyboard" skin={skin} own={own} />}
    />
  );
}

/** 公开预览走边缘缓存，私有预览通过作者自己的会话读取，两者共用图片布局。 */
function PrivatePreview({ skin, className, loaded, onLoad, onError }: { skin: CandidateCardSkin; className: string; loaded: boolean; onLoad: (image: HTMLImageElement) => void; onError: () => void }) {
  const { t } = useLocale();
  const preview = useQuery(candidatePreviewQuery(skin.id, candidatePreviewKey(skin)));
  if (preview.isError) return <span className="text-[13px] text-muted">{t("暂无预览")}</span>;
  if (!preview.data) return null;
  return <img className={className} data-loaded={loaded} src={preview.data} alt={t(`${skin.name} 的预览图`)} decoding="async" onLoad={event => onLoad(event.currentTarget)} onError={onError} />;
}

/** The hero's colours as custom properties; before the preview has loaded, and when it cannot be read, the site's own panel colours. */
function heroStyle(palette: PreviewPalette | null): CSSProperties {
  const style: Record<string, string> = palette
    ? { "--hero-surface": palette.surface, "--hero-glow": palette.glow, "--hero-title": palette.title, "--hero-text": palette.text, colorScheme: palette.scheme }
    : { "--hero-surface": "var(--panel-2)", "--hero-glow": "var(--panel)", "--hero-title": "var(--ink)", "--hero-text": "var(--muted)" };
  return style;
}

const previewImageClass = "block h-auto max-h-[220px] w-full object-contain object-right-bottom opacity-0 transition-opacity duration-300 data-[loaded=true]:opacity-100 @min-[30rem]:h-full @min-[30rem]:max-h-none";

// The card is a size container, so the hero lays out by the card's own width: the 2-column gallery, the 1-column phone list and the narrower 我的 page all get the arrangement that fits them.
const previewBoxClass = cx(
  "relative flex min-h-[132px] items-end justify-end px-5 pt-4 pb-5",
  "@min-[30rem]:min-h-0 @min-[30rem]:flex-1 @min-[30rem]:px-8 @min-[30rem]:pb-7",
  "@min-[30rem]:data-[overlap=true]:absolute @min-[30rem]:data-[overlap=true]:right-7 @min-[30rem]:data-[overlap=true]:bottom-7 @min-[30rem]:data-[overlap=true]:h-[66%] @min-[30rem]:data-[overlap=true]:w-[84%] @min-[30rem]:data-[overlap=true]:p-0",
);

/**
 * A candidate-window skin as a large card: a hero tinted with the skin's own colours (read from its preview, see preview-palette.ts) with the name, a subtitle and traits on the left and the preview on the right, then the name with its category, the description, the author line, and the gallery footer or, with `own`, the 我的 footer.
 */
export function CandidateSkinCard({ skin, own = false }: { skin: CandidateCardSkin; own?: boolean }) {
  const { t } = useLocale();
  const [failed, setFailed] = useState(false);
  const [palette, setPalette] = useState<PreviewPalette | null>(null);
  const [loaded, setLoaded] = useState(false);
  const onLoad = (image: HTMLImageElement) => {
    setPalette(samplePreviewPalette(image));
    setLoaded(true);
  };
  const traits = candidateTraits(skin);
  // Most names are two to seven characters; a longer one steps down a size so it still fits on one line in the 2-column gallery.
  const longName = [...skin.name].length > 7;
  const details = [skin.version && `v${skin.version}`, skin.license].filter(Boolean).join(" · ");
  return (
    <Card as="li" tone="raised" className="@container flex min-w-0 flex-col overflow-hidden rounded-card">
      <div className="relative isolate flex flex-col overflow-hidden bg-(--hero-surface) @min-[30rem]:h-[clamp(300px,62cqw,390px)]" style={heroStyle(palette)}>
        {/* The glow washes over the preview's backdrop as much as over the hero, so an opaque preview whose border matches the surface shows no frame. */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(130%_95%_at_0%_0%,var(--hero-glow)_0%,transparent_62%)]" aria-hidden="true" />
        <div className="relative z-20 px-6 pt-6 @min-[30rem]:max-w-[62%] @min-[30rem]:px-8 @min-[30rem]:pt-8">
          <p className={cx("m-0 line-clamp-2 font-heading leading-[1.12] font-bold tracking-[0.02em] text-(--hero-title) [overflow-wrap:anywhere] [text-wrap:balance]", longName ? "text-[clamp(24px,7cqw,38px)] @min-[30rem]:text-[clamp(26px,5.8cqw,38px)]" : "text-[clamp(28px,8.4cqw,46px)] @min-[30rem]:text-[clamp(30px,7cqw,46px)]")} aria-hidden="true">
            {skin.name}
          </p>
          <p className="m-0 mt-3 text-[15px] leading-6 text-(--hero-text)" aria-hidden="true">{t("水杉输入法皮肤")}</p>
          <p className="m-0 mt-1.5 flex flex-wrap items-center gap-x-2 text-[13.5px] leading-6 text-(--hero-text)">
            <span className="sr-only">{t("特点：")}</span>
            {traits.map((trait, index) => (
              <span key={trait} className="inline-flex items-center gap-x-2">
                {index > 0 && <span className="opacity-60" aria-hidden="true">·</span>}
                {t(trait)}
              </span>
            ))}
          </p>
        </div>
        {/* A preview whose top left is empty backdrop is drawn large, under the text; any other sits below the text so nothing covers the window or its decoration. */}
        <div className={previewBoxClass} data-overlap={palette?.clearTopLeft ?? false}>
          {failed ? (
            <span className="m-auto text-[13px] text-(--hero-text)">{t("暂无预览")}</span>
          ) : skin.visibility === "private" ? (
            <PrivatePreview skin={skin} className={previewImageClass} loaded={loaded} onLoad={onLoad} onError={() => setFailed(true)} />
          ) : (
            <img className={previewImageClass} data-loaded={loaded} src={`/api/skins/candidate/${skin.id}/preview?v=${encodeURIComponent(candidatePreviewKey(skin))}`} alt={t(`${skin.name} 的预览图`)} loading="lazy" decoding="async" onLoad={event => onLoad(event.currentTarget)} onError={() => setFailed(true)} />
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col px-6 pt-5 pb-5 @min-[30rem]:px-8">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h3 className="m-0 min-w-0 font-heading text-[19px] leading-7 font-bold text-ink [overflow-wrap:anywhere]" title={skin.name}>{skin.name}</h3>
          {skin.category && <Pill>{t(CANDIDATE_SKIN_CATEGORY_LABELS[skin.category])}</Pill>}
          <StatusPills skin={skin} inline />
        </div>
        <CatalogDescription description={skin.description} />
        <p className="m-0 mt-1 truncate text-[13px] leading-5 text-muted" title={[skin.author, details].filter(Boolean).join(" · ")}>
          {skin.author}
          {details && ` · ${details}`}
        </p>
        <div className="mt-auto flex flex-col @min-[30rem]:flex-row @min-[30rem]:items-center @min-[30rem]:gap-4">
          <div className="min-w-0 flex-1"><Footer kind="candidate" skin={skin} own={own} /></div>
          <CandidateDownloadButton id={skin.id} name={skin.name} className="mt-3 w-full @min-[30rem]:w-auto @min-[30rem]:px-5" />
        </div>
      </div>
    </Card>
  );
}
