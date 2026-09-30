import { useCommunityQuery } from "./data/queries";
import type { Community } from "./data/schemas";
import { AppStatsCard } from "./home/app-stats";
import { StarHistoryChart, daysTracked, groupThousands, starCurves } from "./star-history-chart";
import { useLocale } from "./use-locale";
import { useReveal } from "./use-reveal";
import { Card, Container, SectionHeading } from "./ui";

/** The design lists at most this many contributors. */
const MAX_CONTRIBUTORS = 15;

/** "2026-09-30T06:40:40.023Z" → "2026-09-30 06:40", the design's footnote format (UTC). */
const snapshotTime = (iso: string) => iso.slice(0, 16).replace("T", " ");

/** Avatars come from avatars.githubusercontent.com (the only image host the CSP allows); 96px covers the 44px circle on 2x screens. */
const avatarUrl = (url: string) => `${url}${url.includes("?") ? "&" : "?"}s=96`;

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: "var(--accent)" }} aria-hidden="true" focusable="false">
      <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />
    </svg>
  );
}

/**
 * "社区在成长": organisation stars over time, core contributors, and the App's community counters when msime-backend answers.
 *
 * The prerendered home page is seeded with `public/community.json` under the `community` key, so the section is part of the static HTML; the client then refreshes it from `/api/community`, falling back to the bundled snapshot.
 */
export function CommunitySection() {
  const { t } = useLocale();
  const community = useCommunityQuery();

  // The section can appear after the page's own reveal pass (client navigation without seeded data), so register its nodes again once data lands.
  useReveal([community.data]);

  const data = community.data;

  return (
    <Container as="section" width="page" className="pt-[clamp(80px,10vw,128px)]" id="community">
      <SectionHeading title={t("社区在成长")} lead={t("Star 与贡献者数据来自 GitHub。")} />

      {data ? (
        <CommunityCards data={data} refreshFailed={community.isRefetchError} />
      ) : (
        <Card tone="raised" className="mt-8 grid min-h-[220px] place-items-center rounded-shell p-8 text-sm text-muted">
          {t(community.isError ? "暂时无法读取社区数据，请稍后再试。" : "正在读取 Star 历史…")}
        </Card>
      )}

      <AppStatsCard />
    </Container>
  );
}

function CommunityCards({ data, refreshFailed }: { data: Community; refreshFailed: boolean }) {
  const { t } = useLocale();
  const { curves, perRepository, end } = starCurves(data);
  const contributors = data.contributors.filter((person) => !person.login.endsWith("[bot]")).slice(0, MAX_CONTRIBUTORS);
  const delta = data.starDelta30d;

  const stats = [
    { value: groupThousands(data.repoCount), label: "个仓库" },
    { value: groupThousands(daysTracked(curves, end)), label: "天" },
    { value: groupThousands(contributors.length), label: "贡献者" },
  ];

  const note = data.stale || refreshFailed ? "暂时无法更新，显示最近可用数据" : "";

  return (
    <>
      <Card tone="raised" className="mt-8 overflow-hidden rounded-shell" data-reveal>
        <div className="flex flex-wrap items-end justify-between gap-5 px-[clamp(22px,3vw,34px)] pt-[clamp(22px,3vw,34px)]">
          <div>
            <p className="m-0 flex items-center gap-2 text-sm font-semibold text-accent-ink">
              <StarIcon />
              {t("GitHub Star 累计")}
            </p>
            <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3.5 gap-y-2.5">
              <strong className="text-[clamp(44px,5.4vw,68px)] leading-none font-bold tracking-[-.02em] text-ink tabular-nums">{groupThousands(data.totalStars)}</strong>
              {delta !== undefined && delta > 0 && (
                <span className="inline-flex h-7 items-center gap-1 rounded-full bg-accent-soft px-2.5 text-[13.5px] font-semibold text-accent-ink tabular-nums">
                  {t(`↑ ${groupThousands(delta)} · 近 30 天`)}
                </span>
              )}
            </div>
          </div>
          <dl className="m-0 flex gap-[clamp(20px,3vw,40px)]">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse">
                <dt className="mt-0.5 text-[12.5px] text-muted">{t(stat.label)}</dt>
                <dd className="m-0 text-[clamp(20px,2vw,26px)] font-bold text-ink tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <StarHistoryChart curves={curves} end={end} legend={perRepository} />

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 px-[clamp(22px,3vw,34px)] py-[18px] text-[13px] text-muted shadow-divider-t">
          <span>
            {note && `${t(note)} · `}
            {t("数据更新于 ")}
            <time dateTime={data.generatedAt}>{snapshotTime(data.generatedAt)}</time> UTC
          </span>
          <a className="font-semibold text-accent-ink no-underline hover:text-ink" href="https://github.com/metasequoiaime" target="_blank" rel="noreferrer">
            {t("在 GitHub 查看 →")}
          </a>
        </div>
      </Card>

      <Card className="mt-4 p-[clamp(20px,3vw,32px)]" data-reveal>
        <h3 className="m-0 text-sm font-semibold text-accent-ink">{t("核心贡献者")}</h3>
        <ul className="m-0 mt-5 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-x-5 gap-y-3.5 p-0">
          {contributors.map((person) => (
            <li key={person.login} className="min-w-0">
              <a
                className="-m-1.5 flex min-w-0 items-center gap-3 rounded-btn p-1.5 text-ink no-underline transition-colors hover:bg-panel-2 hover:text-ink"
                href={person.url}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  className="size-11 flex-none rounded-full bg-panel-2 object-cover"
                  src={avatarUrl(person.avatarUrl)}
                  alt=""
                  width="44"
                  height="44"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold">{person.login}</span>
                  <span className="mt-0.5 block text-[12.5px] text-muted tabular-nums">
                    {t(`${groupThousands(person.contributions)} 次提交 · ${person.repos} 个仓库`)}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
