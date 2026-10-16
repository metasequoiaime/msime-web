import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Reactions } from "../account/reactions";
import { candidatePreviewQuery } from "../data/account";
import type { CandidateSkin, KeyboardSkin, V1CandidateSkin, V1KeyboardSkin } from "../data/schemas";
import { CANDIDATE_SKIN_CATEGORY_LABELS } from "../data/skin-categories";
import { Card, Pill } from "../ui";
import { CatalogDescription, CatalogTitle } from "../community/card-content";
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

// 固定预览区避免图片加载时跳动；图片显式铺满容器并等比容纳，不受原始像素尺寸限制。
const candidatePreviewImageClass = "absolute inset-0 block h-full w-full object-contain";

/** 公开预览走边缘缓存，私有预览通过作者自己的会话读取，两者共用图片布局。 */
function PrivatePreview({ skin, onError }: { skin: CandidateCardSkin; onError: () => void }) {
  const { t } = useLocale();
  const preview = useQuery(candidatePreviewQuery(skin.id, skin.version));
  if (preview.isError) return <span className="text-[13px] text-muted">{t("暂无预览")}</span>;
  if (!preview.data) return null;
  return <img className={candidatePreviewImageClass} src={preview.data} alt={t(`${skin.name} 的预览图`)} decoding="async" onError={onError} />;
}

export function CandidateSkinCard({ skin, own = false }: { skin: CandidateCardSkin; own?: boolean }) {
  const { t } = useLocale();
  const [failed, setFailed] = useState(false);
  return (
    <SkinCard
      preview={
        <div className="relative grid aspect-video min-h-0 shrink-0 place-items-center overflow-hidden bg-panel-2">
          {failed ? (
            <span className="text-[13px] text-muted">{t("暂无预览")}</span>
          ) : skin.visibility === "private" ? (
            <PrivatePreview skin={skin} onError={() => setFailed(true)} />
          ) : (
            <img className={candidatePreviewImageClass} src={`/api/skins/candidate/${skin.id}/preview${skin.version ? `?v=${encodeURIComponent(skin.version)}` : ""}`} alt={t(`${skin.name} 的预览图`)} loading="lazy" decoding="async" onError={() => setFailed(true)} />
          )}
        </div>
      }
      name={skin.name}
      author={skin.author}
      badges={skin.category || skin.visibility === "private" || skin.moderation === "removed" ? <>
        {skin.category && <Pill>{t(CANDIDATE_SKIN_CATEGORY_LABELS[skin.category])}</Pill>}
        <StatusPills skin={skin} inline />
      </> : undefined}
      details={[skin.version && `v${skin.version}`, skin.license].filter(Boolean).join(" · ")}
      description={skin.description}
      footer={<><Footer kind="candidate" skin={skin} own={own} /><CandidateDownloadButton id={skin.id} name={skin.name} /></>}
    />
  );
}
