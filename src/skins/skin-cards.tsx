import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Reactions } from "../account/reactions";
import { candidatePreviewQuery } from "../data/account";
import type { CandidateSkin, KeyboardSkin, V1CandidateSkin, V1KeyboardSkin } from "../data/schemas";
import { CANDIDATE_SKIN_CATEGORY_LABELS } from "../data/skin-categories";
import { Card, Pill } from "../ui";
import { useLocale } from "../use-locale";
import { mayHavePhoto } from "./keyboard-art";
import { KeyboardSkinPreview } from "./keyboard-preview";

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

/** Shared card body: preview, name, author, description and the footer (which carries the downloads). */
export function SkinCard({ preview, name, author, details, description, footer }: { preview: ReactNode; name: string; author: string; details?: string; description: string; footer: ReactNode }) {
  return (
    <Card as="li" tone="raised" className="flex min-w-0 flex-col overflow-hidden rounded-tile">
      {preview}
      <div className="flex flex-1 flex-col px-[18px] pt-3.5 pb-3">
        <h3 className="m-0 truncate font-heading text-base font-bold text-ink" title={name}>{name}</h3>
        <p className="m-0 mt-0.5 truncate text-[13px] text-muted">
          {author}
          {details && ` · ${details}`}
        </p>
        {description && <p className="m-0 mt-2 line-clamp-2 text-[13.5px] leading-[1.7] text-body [overflow-wrap:anywhere]">{description}</p>}
        <div className="mt-auto">{footer}</div>
      </div>
    </Card>
  );
}

/** Pills over the preview for the viewer's own works: 私有 and 已下架. */
function StatusPills({ skin }: { skin: Viewer }) {
  const { t } = useLocale();
  if (skin.visibility !== "private" && skin.moderation !== "removed") return null;
  return (
    <span className="absolute top-3 right-3 flex gap-1.5">
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

export function KeyboardSkinCard({ skin, own = false }: { skin: KeyboardCardSkin; own?: boolean }) {
  return (
    <SkinCard
      preview={
        <div className="relative">
          <KeyboardSkinPreview className="block aspect-[390/232] h-auto w-full" design={skin.design} photoUrl={mayHavePhoto(skin.design) ? `/api/skins/keyboard/${skin.id}/photo` : undefined} />
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

/** The public preview route is edge-cached and serves public skins only; a private skin's preview is read with the author's session instead. */
function PrivatePreview({ skin, onError }: { skin: CandidateCardSkin; onError: () => void }) {
  const { t } = useLocale();
  const preview = useQuery(candidatePreviewQuery(skin.id, skin.version));
  if (preview.isError) return <span className="text-[13px] text-muted">{t("暂无预览")}</span>;
  if (!preview.data) return null;
  return <img className="block max-h-full max-w-full object-contain" src={preview.data} alt={t(`${skin.name} 的预览图`)} decoding="async" onError={onError} />;
}

export function CandidateSkinCard({ skin, own = false }: { skin: CandidateCardSkin; own?: boolean }) {
  const { t } = useLocale();
  const [failed, setFailed] = useState(false);
  return (
    <SkinCard
      preview={
        <div className="relative grid aspect-[390/232] place-items-center bg-panel-2 p-4">
          {skin.category && <Pill className="absolute top-3 left-3 shadow-ring-2">{t(CANDIDATE_SKIN_CATEGORY_LABELS[skin.category])}</Pill>}
          <StatusPills skin={skin} />
          {failed ? (
            <span className="text-[13px] text-muted">{t("暂无预览")}</span>
          ) : skin.visibility === "private" ? (
            <PrivatePreview skin={skin} onError={() => setFailed(true)} />
          ) : (
            <img className="block max-h-full max-w-full object-contain" src={`/api/skins/candidate/${skin.id}/preview${skin.version ? `?v=${encodeURIComponent(skin.version)}` : ""}`} alt={t(`${skin.name} 的预览图`)} loading="lazy" decoding="async" onError={() => setFailed(true)} />
          )}
        </div>
      }
      name={skin.name}
      author={skin.author}
      details={[skin.version && `v${skin.version}`, skin.license].filter(Boolean).join(" · ")}
      description={skin.description}
      footer={<Footer kind="candidate" skin={skin} own={own} />}
    />
  );
}
