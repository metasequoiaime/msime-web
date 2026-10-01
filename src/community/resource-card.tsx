import type { ReactNode } from "react";
import { Reactions } from "../account/reactions";
import { Downloads } from "./parts";
import type { Plugin, PluginKind, Resource } from "../data/schemas";
import { Card, Pill } from "../ui";
import { useLocale } from "../use-locale";

/*
 * Cards for the community items that have no picture: word packs, reply templates and plugins. Same surface, padding and footer as the skin cards, with a short text sample where the skin cards have their preview.
 */

export const PLUGIN_KIND_LABELS: Record<PluginKind, string> = { sound: "按键音", music: "背景音乐", command_table: "命令表", effect: "打字特效" };

/** How many words of a word pack the card shows. */
const SAMPLE_WORDS = 6;

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

function TextCard({ name, meta, description, sample, pill, footer }: { name: string; meta: string; description: string; sample?: string; pill?: string; footer: ReactNode }) {
  const { t } = useLocale();
  return (
    <Card as="li" tone="raised" className="flex min-w-0 flex-col rounded-tile px-[18px] pt-4 pb-3">
      <div className="flex min-w-0 items-start gap-2">
        <h3 className="m-0 min-w-0 flex-1 truncate font-heading text-base font-bold text-ink" title={name}>{name}</h3>
        {pill && <Pill tone="neutral" className="flex-none">{t(pill)}</Pill>}
      </div>
      <p className="m-0 mt-0.5 truncate text-[13px] text-muted">{meta}</p>
      {description && <p className="m-0 mt-2 line-clamp-2 text-[13.5px] leading-[1.7] text-body [overflow-wrap:anywhere]">{description}</p>}
      {sample && <p className="m-0 mt-2.5 line-clamp-3 rounded-field bg-panel-2 px-3 py-2 text-[13px] leading-[1.7] whitespace-pre-line text-body [overflow-wrap:anywhere]">{sample}</p>}
      <div className="mt-auto">{footer}</div>
    </Card>
  );
}

/** A word pack shows its entry count and the first few words; a reply template shows the start of its prompt. */
export function ResourceCard({ item, own = false }: { item: Resource; own?: boolean }) {
  const { t } = useLocale();
  const entries = item.content.entries ?? [];
  const meta = item.kind === "dictionary" ? `${item.author} · ${t(`${entries.length} 条词条`)}` : item.author;
  const sample = item.kind === "dictionary" ? entries.slice(0, SAMPLE_WORDS).map(entry => entry.word).join("、") + (entries.length > SAMPLE_WORDS ? " …" : "") : item.content.prompt;
  return (
    <TextCard
      name={item.name}
      meta={meta}
      description={item.description}
      sample={sample}
      pill={item.moderation === "removed" ? "已下架" : undefined}
      footer={<Reactions kind="resource" id={item.id} ratingCount={item.rating_count} ratingAverage={item.rating_average} myRating={item.my_rating} owned={item.owned || own} saved={item.saved} saves={item.saves} />}
    />
  );
}

export function PluginCard({ item }: { item: Plugin }) {
  const meta = [item.author, item.version && `v${item.version}`, item.license, formatSize(item.size)].filter(Boolean).join(" · ");
  return (
    <TextCard
      name={item.name}
      meta={meta}
      description={item.description}
      pill={item.moderation === "removed" ? "已下架" : PLUGIN_KIND_LABELS[item.kind]}
      footer={
        <>
          <Downloads downloads={item.downloads} />
          <Reactions kind="plugin" id={item.id} ratingCount={item.rating_count} ratingAverage={item.rating_average} myRating={item.my_rating} owned={item.owned} saved={item.saved} saves={item.saves} />
        </>
      }
    />
  );
}
