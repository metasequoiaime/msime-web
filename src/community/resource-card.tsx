import type { ComponentType, ReactNode } from "react";
import { Reactions } from "../account/reactions";
import type { Plugin, PluginKind, Resource } from "../data/schemas";
import { BookIcon, Card, MusicIcon, OmegaIcon, PhraseIcon, Pill, SlashIcon, SparkleIcon, TableIcon, WaveformIcon } from "../ui";
import { useLocale } from "../use-locale";

/*
 * Cards for the community items that have no picture: word packs, reply templates and plugins. Same surface, padding and footer as the skin cards, with a short text sample where the skin cards have their preview.
 */

// The kind names the App uses, so a pack is called the same thing here, in the App and in the admin console.
export const PLUGIN_KIND_LABELS: Record<PluginKind, string> = {
  sound: "音效包",
  music: "音乐包",
  command_table: "指令表",
  effect: "特效包",
  helpcode: "辅助码表",
  symbol_set: "符号集",
  phrase_table: "短语表",
  wordbook: "单词本",
};

/** The glyph on the tile beside a plugin's name, which is how a card says its kind. */
const PLUGIN_KIND_ICONS: Record<PluginKind, ComponentType<{ size?: number }>> = {
  sound: WaveformIcon,
  music: MusicIcon,
  command_table: SlashIcon,
  effect: SparkleIcon,
  helpcode: TableIcon,
  symbol_set: OmegaIcon,
  phrase_table: PhraseIcon,
  wordbook: BookIcon,
};

/** Kinds whose packages carry audio, the only ones big enough that the download size is worth a place on the card. */
const SIZED_KINDS: ReadonlySet<PluginKind> = new Set(["sound", "music"]);

/** How many words of a word pack the card shows. */
const SAMPLE_WORDS = 6;

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/**
 * `icon` sits before the name (the plugin kind); `details` are facts most visitors skip (version, licence), kept off the meta line and offered as its tooltip and to screen readers instead.
 */
function TextCard({ name, icon, meta, details, description, sample, pill, footer }: { name: string; icon?: ReactNode; meta: string; details?: string; description: string; sample?: string; pill?: string; footer: ReactNode }) {
  const { t } = useLocale();
  return (
    <Card as="li" tone="raised" className="flex min-w-0 flex-col rounded-tile px-[18px] pt-4 pb-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <h3 className="m-0 min-w-0 flex-1 truncate font-heading text-base font-bold text-ink" title={name}>{name}</h3>
            {pill && <Pill tone="warn" className="flex-none">{t(pill)}</Pill>}
          </div>
          <p className="m-0 mt-0.5 truncate text-[13px] text-muted" title={details || undefined}>
            {meta}
            {details && <span className="sr-only">{` · ${details}`}</span>}
          </p>
        </div>
      </div>
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

/** The tile names the kind, so the card needs no kind pill. */
function PluginKindTile({ kind }: { kind: PluginKind }) {
  const { t } = useLocale();
  const Icon = PLUGIN_KIND_ICONS[kind];
  const label = t(PLUGIN_KIND_LABELS[kind]);
  return (
    <span className="mt-0.5 grid size-9 flex-none place-items-center rounded-[11px] bg-accent-soft text-accent-ink" role="img" aria-label={label} title={label}>
      <Icon size={18} />
    </span>
  );
}

export function PluginCard({ item }: { item: Plugin }) {
  const meta = SIZED_KINDS.has(item.kind) ? `${item.author} · ${formatSize(item.size)}` : item.author;
  return (
    <TextCard
      name={item.name}
      icon={<PluginKindTile kind={item.kind} />}
      meta={meta}
      details={[item.version && `v${item.version}`, item.license].filter(Boolean).join(" · ")}
      description={item.description}
      pill={item.moderation === "removed" ? "已下架" : undefined}
      footer={<Reactions kind="plugin" id={item.id} ratingCount={item.rating_count} ratingAverage={item.rating_average} myRating={item.my_rating} owned={item.owned} saved={item.saved} saves={item.saves} downloads={item.downloads} />}
    />
  );
}
