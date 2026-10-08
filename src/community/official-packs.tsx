import type { UseQueryResult } from "@tanstack/react-query";
import { useId, type ReactNode } from "react";
import { MAX_SKIN_QUERY_BYTES, useOfficialPacksQuery } from "../data/queries";
import type { DictionaryFile, OfficialDictionary, OfficialPlugin, PluginKind } from "../data/schemas";
import { PLUGIN_KINDS } from "../data/plugin-kinds";
import { LocaleLink } from "../locale-link";
import { AnchorButton, Button, Card, DownloadIcon, ExternalIcon, Pill } from "../ui";
import { useLocale } from "../use-locale";
import { cardGridClass, Chips, SearchBox, StatusCard, useSearch } from "./parts";
import { PLUGIN_KIND_LABELS } from "./resource-card";

/*
 * 官方插件 and 专业词库: the packs the project ships in msime-plugins and msime-dictionary `packs/`, read from `/api/plugins/official` and `/api/dictionaries/official` (shared/official-packs.ts). They need no account, so the cards link straight to the .zip or word list instead of the favourite and rating row the community cards carry. The lists are short and come whole, so search and kind filter run in the page.
 */

const PLUGINS_REPO_URL = "https://github.com/metasequoiaime/msime-plugins";
const DICTIONARY_REPO_URL = "https://github.com/metasequoiaime/msime-dictionary";

export const OFFICIAL_PLUGINS_HINT = "收录在 msime-plugins 仓库、通过 CI 校验的插件，每个包都声明了自己的许可证。无需登录，下载 .zip 后在水杉输入法设置的「插件」页导入。";
export const OFFICIAL_DICTIONARIES_HINT = "面向特定领域的词库，收录在 msime-dictionary 仓库中。它们不会进入默认词库，导入后才作为你的用户词条生效，所以领域里的短缩写不会干扰日常输入。";

/** What each word list of a pack holds, by the file names msime-dictionary uses (its packs/*\/README.md). A file not named here shows its name alone. */
const FILE_LABELS: Record<string, string> = {
  "quanpin.txt": "拼音词条",
  "english.txt": "英文词条",
  "translations.txt": "术语对照",
};

/** Matches a name the way the backend's `q` does for the community lists: a case-insensitive substring. */
const nameMatches = (name: string, query: string) => !query || name.toLowerCase().includes(query.toLowerCase());

function formatBytes(bytes: number) {
  const [value, unit] = bytes >= 1024 * 1024 ? [bytes / 1024 / 1024, "MB"] : [Math.max(bytes / 1024, 0.1), "KB"];
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${unit}`;
}

const emptyText = (noun: string, query: string, where = "") => (query ? `${where}没有名称包含「${query}」的${noun}。` : `${where}还没有${noun}。`);

/** Pending, error, empty and stale states around an official list, worded like `PagedList` in ./parts. A failed sweep also points to the repository, where the same packs can be read. */
function OfficialStates<T>({ query, noun, repo, items, empty, children }: { query: UseQueryResult<{ stale: boolean }>; noun: string; repo: string; items: T[] | undefined; empty: string; children: (items: T[]) => ReactNode }) {
  const { t } = useLocale();
  if (query.isPending) return <StatusCard busy>{t(`正在读取${noun}…`)}</StatusCard>;
  if (query.isError || items === undefined)
    return (
      <StatusCard>
        <p className="m-0">{t(`暂时无法读取${noun}，请稍后再试，或前往 GitHub 查看。`)}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>{t("重试")}</Button>
          <a className="inline-flex items-center gap-1 text-[13px]" href={repo} target="_blank" rel="noreferrer">
            {t("在 GitHub 查看")}
            <ExternalIcon size={13} />
          </a>
        </div>
      </StatusCard>
    );
  if (items.length === 0) return <StatusCard>{t(empty)}</StatusCard>;
  return (
    <>
      {query.data.stale && <p className="m-0 mb-4 text-sm text-muted">{t("暂时无法更新，显示最近可用数据。")}</p>}
      {children(items)}
    </>
  );
}

/** The community cards' surface (`TextCard` in ./resource-card), with room for a file list and a download row. */
function OfficialCard({ name, meta, description, pills, children, footer }: { name: string; meta: string; description: string; pills?: ReactNode; children?: ReactNode; footer: ReactNode }) {
  return (
    <Card as="li" tone="raised" className="flex min-w-0 flex-col rounded-tile px-[18px] pt-4 pb-3">
      <div className="flex min-w-0 items-start gap-2">
        <h3 className="m-0 min-w-0 flex-1 truncate font-heading text-base font-bold text-ink" title={name}>{name}</h3>
        {pills}
      </div>
      <p className="m-0 mt-0.5 truncate text-[13px] text-muted">{meta}</p>
      {description && <p className="m-0 mt-2 line-clamp-2 text-[13.5px] leading-[1.7] text-body [overflow-wrap:anywhere]">{description}</p>}
      {children}
      <div className="mt-auto pt-3">{footer}</div>
    </Card>
  );
}

function SourceLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a className="inline-flex items-center gap-1 text-[13px]" href={href} target="_blank" rel="noreferrer" aria-label={label}>
      {children}
      <ExternalIcon size={13} />
    </a>
  );
}

// ---- 官方插件 ----

function OfficialPluginCard({ pack }: { pack: OfficialPlugin }) {
  const { t } = useLocale();
  const extra = pack.mode === "sequence" ? "按键旋律" : pack.commands !== undefined ? `${pack.commands} 条指令` : undefined;
  const meta = [pack.author || t("水杉输入法"), pack.version && `v${pack.version}`, pack.license, pack.size !== undefined && formatBytes(pack.size)].filter(Boolean).join(" · ");
  return (
    <OfficialCard
      name={pack.name}
      meta={meta}
      description={pack.description}
      pills={
        <>
          {extra && <Pill tone="neutral" className="flex-none">{t(extra)}</Pill>}
          <Pill tone="neutral" className="flex-none">{t(PLUGIN_KIND_LABELS[pack.kind])}</Pill>
        </>
      }
      footer={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {pack.download && (
            <AnchorButton variant="secondary" size="sm" href={pack.download} target="_self" aria-label={t(`下载 ${pack.name} 的 .zip`)}>
              <DownloadIcon size={15} />
              {t("下载 .zip")}
            </AnchorButton>
          )}
          {pack.mirror && (
            <AnchorButton variant="secondary" size="sm" href={pack.mirror} target="_self" aria-label={t(`从国内镜像下载 ${pack.name} 的 .zip`)}>
              <DownloadIcon size={15} />
              {t("国内镜像")}
            </AnchorButton>
          )}
          <SourceLink href={pack.source} label={t(`在 GitHub 查看 ${pack.name} 的源文件`)}>{t("源文件")}</SourceLink>
        </div>
      }
    />
  );
}

/**
 * The 官方插件 tab of /plugins/: kind chips (only the kinds msime-plugins has), a search box, the cards and how to import a .zip. `kind` is the page's `?kind=`, shared with the community tab, which the page clears when the tab changes.
 */
export function OfficialPluginsPanel({ kind, onKind }: { kind: PluginKind | undefined; onKind: (kind: PluginKind | undefined) => void }) {
  const { t } = useLocale();
  const packs = useOfficialPacksQuery("plugins");
  const search = useSearch();
  const howId = useId();
  const all = packs.data?.items;
  const kinds = PLUGIN_KINDS.filter(value => all?.some(item => item.kind === value));
  const items = all?.filter(item => (!kind || item.kind === kind) && nameMatches(item.name, search.query));
  const where = kind ? `「${PLUGIN_KIND_LABELS[kind]}」中` : "";
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        {kinds.length > 1 ? <Chips legend="插件类型" values={kinds} labels={PLUGIN_KIND_LABELS} value={kind} onChange={onKind} /> : <span />}
        <SearchBox label="搜索插件名称" maxBytes={MAX_SKIN_QUERY_BYTES} search={search} />
      </div>
      <p className="m-0 mt-4 text-sm leading-[1.75] text-muted">{t(OFFICIAL_PLUGINS_HINT)}</p>
      <section className="mt-6" aria-label={t("官方插件列表")}>
        <OfficialStates query={packs} noun="官方插件" repo={PLUGINS_REPO_URL} items={items} empty={emptyText("官方插件", search.query, where)}>
          {rows => (
            <ul className={cardGridClass}>
              {rows.map(item => <OfficialPluginCard key={item.id} pack={item} />)}
            </ul>
          )}
        </OfficialStates>
      </section>
      <Card tone="muted" as="section" className="mt-12 rounded-tile px-6 py-[22px]" aria-labelledby={howId}>
        <h2 id={howId} className="m-0 font-heading text-[15.5px] font-bold text-ink">{t("如何安装官方插件")}</h2>
        <ol className="m-0 mt-2 list-decimal pl-5 text-sm leading-[1.85] text-body">
          <li>{t("安装水杉输入法 macOS 或 Linux 版。")}<LocaleLink to="/download/">{t("前往下载页")}</LocaleLink></li>
          <li>{t("下载 .zip，在水杉输入法设置的「插件」页点「导入 .zip」选中它。导入时输入法会再校验一遍，不合格的包不会被安装。")}</li>
          <li>{t("导入后在「插件」页点开对应的包，设为当前音效包、按键旋律、特效包或背景音乐，开关和音量在「声音与效果」里；指令表在包详情里启用，并在「输入 → 快捷模式」打开「指令(/ 模式)」后，按 / 再输入指令字母即可使用。")}</li>
        </ol>
        <p className="m-0 mt-3 text-sm leading-[1.85] text-body">
          {t("想制作自己的插件？格式说明和模板见")}{" "}
          <a href={PLUGINS_REPO_URL} target="_blank" rel="noreferrer">msime-plugins</a>
          {t("，也可以向仓库提交 Pull Request。")}
        </p>
      </Card>
    </>
  );
}

// ---- 专业词库 ----

function FileRow({ file }: { file: DictionaryFile }) {
  const { t } = useLocale();
  const label = FILE_LABELS[file.name];
  const facts = [label && t(label), file.entries !== undefined && t(`${file.entries.toLocaleString("en-US")} 条`), formatBytes(file.size)].filter(Boolean).join(" · ");
  return (
    <li className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 py-1.5 not-first:shadow-divider-t">
      <a className="font-mono text-[13px] [overflow-wrap:anywhere]" href={file.url} target="_blank" rel="noreferrer" aria-label={t(`打开 ${file.name}`)}>
        {file.name}
      </a>
      <span className="flex items-baseline gap-3 text-[12.5px] text-muted tabular-nums">
        {file.mirror && (
          <a className="font-medium" href={file.mirror} target="_blank" rel="noreferrer" aria-label={t(`从国内镜像打开 ${file.name}`)}>
            {t("国内镜像")}
          </a>
        )}
        {facts}
      </span>
    </li>
  );
}

function OfficialDictionaryCard({ pack }: { pack: OfficialDictionary }) {
  const { t } = useLocale();
  return (
    <OfficialCard
      name={pack.name}
      meta={[t("水杉输入法"), pack.license].filter(Boolean).join(" · ")}
      description={pack.description}
      footer={<SourceLink href={pack.source} label={t(`在 GitHub 查看 ${pack.name} 的说明`)}>{t("说明与导入方式")}</SourceLink>}
    >
      <ul className="m-0 mt-2.5 list-none rounded-field bg-panel-2 px-3 py-1 text-body" aria-label={t("词库文件")}>
        {pack.files.map(file => <FileRow key={file.name} file={file} />)}
      </ul>
    </OfficialCard>
  );
}

/** The cards of the 专业词库 tab of /dictionaries/, narrowed by the page's search box. */
export function OfficialDictionaryList({ query }: { query: string }) {
  const packs = useOfficialPacksQuery("dictionaries");
  const items = packs.data?.items.filter(item => nameMatches(item.name, query));
  return (
    <OfficialStates query={packs} noun="专业词库" repo={DICTIONARY_REPO_URL} items={items} empty={emptyText("专业词库", query)}>
      {rows => (
        <ul className={cardGridClass}>
          {rows.map(item => <OfficialDictionaryCard key={item.id} pack={item} />)}
        </ul>
      )}
    </OfficialStates>
  );
}

/** How to import a 专业词库, in place of the community how-to on that tab. */
export function OfficialDictionariesHowTo() {
  const { t } = useLocale();
  const id = useId();
  return (
    <Card tone="muted" as="section" className="mt-12 rounded-tile px-6 py-[22px]" aria-labelledby={id}>
      <h2 id={id} className="m-0 font-heading text-[15.5px] font-bold text-ink">{t("如何导入专业词库")}</h2>
      <ol className="m-0 mt-2 list-decimal pl-5 text-sm leading-[1.85] text-body">
        <li>{t("安装水杉输入法。")}<LocaleLink to="/download/">{t("前往下载页")}</LocaleLink></li>
        <li>{t("打开词库文件后另存到本机，在水杉输入法设置的「词库」页，于「本地词库管理」中选择对应的词库类型后点「导入」。每个词库的文件格式和导入方式见它的说明。")}</li>
        <li>
          {t("想补充专业词库，可以向")}{" "}
          <a href={DICTIONARY_REPO_URL} target="_blank" rel="noreferrer">msime-dictionary</a>{" "}
          {t("提交 Pull Request。")}
        </li>
      </ol>
    </Card>
  );
}
