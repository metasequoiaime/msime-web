import { useMemo, useState } from "react";
import { useReleasesQuery } from "../data/queries";
import { PLATFORM_CATALOG, PLATFORM_NAMES, RELEASE_FILTERS, type ReleaseFilter } from "../data/platforms";
import { Button, ExternalIcon, cx } from "../ui";
import { useLocale } from "../use-locale";
import { usePageSearch } from "../use-page-search";
import { ReleaseCard } from "./release-card";
import { releaseDate } from "./release-notes";

/** Where each platform publishes. Windows ships from msime-windows; the merged msime repository now carries macOS, Linux, mobile and web engine releases; msime-linux remains as the archived historical source. */
const RELEASE_SOURCES = [
  { repo: "msime-windows", platforms: "Windows", note: "安装程序与签名信息随每个版本发布" },
  { repo: "msime", platforms: "macOS · Linux · iOS · Android · HarmonyOS · Web", note: "Rust 输入引擎与各原生宿主的版本，各平台按 macos-v、linux-v、ios-v、web-engine-v 等前缀分别发布；Android 与 HarmonyOS 尚未发布" },
  { repo: "msime-linux", platforms: "Linux 历史版本", note: "旧版 IBus 发布，仓库已归档" },
] as const;

const releasesUrl = (repo: string) => `https://github.com/metasequoiaime/${repo}/releases`;

/** Releases rendered at first; "显示更早的版本" adds this many more each time. The API returns every release of the three repositories (about 150). */
const PAGE_SIZE = 30;

function RepoLink({ repo }: { repo: string }) {
  return (
    <a className="inline-flex items-center gap-0.5 whitespace-nowrap" href={releasesUrl(repo)} target="_blank" rel="noreferrer">
      {repo} Releases
      <ExternalIcon size={13} />
    </a>
  );
}

/**
 * 更新日志，下载页的最后一节（`#releases`，旧的 /releases/ 301 到这里）。
 *
 * The list comes from `/api/releases` on the client only, so the static HTML carries just the heading, the filter chips and the repository links, identical in both locales (the locale-parity test counts `main button`, `main section` and `main h2`). The filter uses its own `release` search param because `platform` already belongs to the download picker above.
 */
export function ReleasesSection() {
  const { t } = useLocale();
  const { choice, update, ready } = usePageSearch();
  const filter = choice("release", RELEASE_FILTERS, "all");
  // One request for every platform; the chips filter locally so each can show its count.
  const releases = useReleasesQuery("all");
  const items = releases.data?.items;
  const [limit, setLimit] = useState(PAGE_SIZE);

  const counts = useMemo(() => {
    const result = Object.fromEntries(RELEASE_FILTERS.map((value) => [value, 0])) as Record<ReleaseFilter, number>;
    for (const item of items ?? []) result[item.platform] += 1;
    result.all = items?.length ?? 0;
    return result;
  }, [items]);
  const list = useMemo(() => (items ?? []).filter((item) => filter === "all" || item.platform === filter), [items, filter]);

  const pick = (value: ReleaseFilter) => {
    setLimit(PAGE_SIZE);
    update({ release: value === "all" ? undefined : value });
  };

  const empty = filter === "all" ? null : PLATFORM_CATALOG[filter];

  return (
    <section id="releases" aria-labelledby="releases-title" className="mt-[clamp(56px,7vw,96px)] scroll-mt-[84px] pt-[clamp(32px,4vw,48px)] shadow-divider-t-2">
      <p className="m-0 text-sm font-semibold text-accent-ink">Release Notes</p>
      <h2 id="releases-title" className="m-0 mt-2 font-heading text-[clamp(24px,2.8vw,30px)] leading-[1.35] font-bold text-ink">
        {t("更新日志")}
      </h2>
      <p className="m-0 mt-3 max-w-[64ch] text-[15px] leading-[1.85] text-body">
        {t("各平台各自发布。这里汇总所有平台的 GitHub Release，按发布时间倒序排列。")}
      </p>

      <fieldset className="m-0 mt-6 min-w-0 border-0 p-0">
        <legend className="sr-only">{t("按平台筛选")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {RELEASE_FILTERS.map((value) => {
            const active = value === filter;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => pick(value)}
                className={cx(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border-0 px-3.5 text-sm transition-colors",
                  active ? "bg-btn text-btn-fg" : "bg-transparent text-body shadow-ring-2 hover:bg-panel-2 hover:text-ink"
                )}
              >
                {value === "all" ? t("全部") : PLATFORM_NAMES[value]}
                {items && <span className="text-xs opacity-70">{counts[value]}</span>}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6" aria-live="polite" aria-busy={ready && releases.isPending}>
        {ready && releases.isPending && (
          <p className="m-0 rounded-group bg-panel-2 p-8 text-center text-[15px] text-muted">{t("正在读取 GitHub Releases…")}</p>
        )}
        {ready && releases.isError && (
          <div className="rounded-group bg-warn-soft p-7 text-[15px] leading-[1.8] text-body">
            <p className="m-0">
              {t("暂时无法读取 GitHub（可能触发了访问频率限制）。可以直接前往")} <RepoLink repo="msime" />、<RepoLink repo="msime-windows" /> {t("和")} <RepoLink repo="msime-linux" /> {t("查看。")}
            </p>
            <Button variant="ghost" size="sm" className="mt-4" disabled={releases.isFetching} onClick={() => void releases.refetch()}>
              {releases.isFetching ? t("正在重试…") : t("重试")}
            </Button>
          </div>
        )}
        {releases.data?.stale && (
          <p className="m-0 mb-2 rounded-group bg-panel-2 px-5 py-3.5 text-[13.5px] leading-[1.75] text-muted">
            {t(`暂时连不上 GitHub，下面是 ${releaseDate(releases.data.generatedAt)} 保存的列表，最新发布可能还没有显示。`)}
          </p>
        )}
      </div>

      {list.length > 0 && (
        <div>
          {list.slice(0, limit).map((item) => (
            <ReleaseCard key={item.id} release={item} />
          ))}
          {list.length > limit && (
            <div className="pt-2 pb-2 text-center shadow-divider-t-2">
              <Button variant="ghost" size="md" className="mt-6" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
                {t(`显示更早的版本（还有 ${list.length - limit} 个）`)}
              </Button>
            </div>
          )}
        </div>
      )}

      {items && list.length === 0 && (
        <div className="rounded-group bg-panel-2 p-8 text-center text-[15px] leading-[1.8] text-muted">
          <p className="m-0">{t("这个平台还没有发布版本。")}</p>
          {empty && empty.distribution === "source" && (
            <p className="m-0 mt-1.5 text-sm">
              {t(`${empty.name} 版本仍在开发中，可以先`)}{" "}
              <a className="inline-flex items-center gap-0.5" href={empty.sourceUrl} target="_blank" rel="noreferrer">
                {t("在 GitHub 查看源码")}
                <ExternalIcon size={13} />
              </a>
            </p>
          )}
        </div>
      )}

      <div className="mt-10 rounded-panel bg-panel-2 p-[clamp(20px,3vw,28px)]">
        <h3 className="m-0 font-heading text-lg leading-[1.4] font-bold text-ink">{t("在 GitHub 查看各平台的发布")}</h3>
        <p className="m-0 mt-2 text-sm leading-[1.8] text-muted">
          {t("每个平台的版本号互不相同。预发布版本会在 GitHub 上标注为 Pre-release，升级前请先阅读对应版本的发布说明，确认是否有额外的操作要求。")}
        </p>
        <ul className="m-0 mt-4 grid list-none gap-2 p-0">
          {RELEASE_SOURCES.map((source) => (
            <li key={source.repo}>
              <a
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-field bg-panel px-4 py-3 no-underline shadow-hair transition-colors hover:bg-accent-soft"
                href={releasesUrl(source.repo)}
                target="_blank"
                rel="noreferrer"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="font-mono text-sm text-accent-ink">{source.repo}</span>
                    <span className="text-sm font-semibold text-ink">{source.platforms}</span>
                  </span>
                  <span className="mt-1 block text-[13.5px] leading-[1.7] text-muted">{t(source.note)}</span>
                </span>
                <ExternalIcon className="text-accent-ink" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
