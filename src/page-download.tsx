import { useEffect, useLayoutEffect, useMemo } from "react";
import { sitePlatforms } from "./data/platforms";
import { usePlatformsQuery, useUpdateManifestQuery } from "./data/queries";
import { DownloadGuide } from "./download/guide";
import { DownloadPanel } from "./download/panel";
import { fillTemplate, parseGuide } from "./download/template";
import { LocaleLink } from "./locale-link";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { detectPlatform, PLATFORMS, type Platform } from "./platform";
import { Container } from "./ui";
import { useLocale } from "./use-locale";
import { usePageSearch } from "./use-page-search";

/**
 * 下载页（design-home §6）：页头、六个平台的选择卡、所选平台的安装说明。
 *
 * Test hooks kept from the previous layout: `.content-flow` wraps both `.download-panel` and `#download-content`; there is no `aside` in `main` and no `.doc-card` inside `.content-flow`. The static HTML renders the Windows choice with every platform's guide visible; `?platform=` applies after hydration.
 */
export function DownloadPage() {
  const { t } = useLocale();
  const { choice, update, get, ready } = usePageSearch();
  const requestedPlatform = get("platform");
  const platform = choice("platform", PLATFORMS, "windows");
  // 页面自己的三平台清单。update.json 另有其主（Windows 客户端的「检查更新」），两者互不干扰。
  const platforms = usePlatformsQuery();
  const manifest = useUpdateManifestQuery();

  usePageMeta();

  // Explicit links take precedence over device detection, including on back/forward.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only normalize when the URL platform changes.
  useLayoutEffect(() => {
    if (ready && !PLATFORMS.includes(requestedPlatform as Platform)) update({ platform: detectPlatform() }, true);
  }, [requestedPlatform, ready]);

  useEffect(() => {
    if (manifest.error) console.warn("[download] failed to load update manifest:", manifest.error);
  }, [manifest.error]);

  const entries = useMemo(() => sitePlatforms(platforms.data?.platforms), [platforms.data]);

  const sections = useMemo(() => {
    // 两份清单都在路上时先不渲染正文，免得先写一版「暂时无法获取」再改口
    if (manifest.isPending || platforms.isPending) return null;
    return parseGuide(fillTemplate(manifest.data ?? {}, platforms.data?.platforms));
  }, [manifest.isPending, manifest.data, platforms.isPending, platforms.data]);

  return (
    <>
      <PageHero
        kicker="全平台下载"
        title="下载水杉输入法"
        lead={
          <>
            {t("六个平台各自发布，版本号互不相同。选择你的平台下载，安装前请先看看对应版本的")}
            <LocaleLink to="/releases/" className="text-accent-ink hover:text-ink">
              {t("更新日志")}
            </LocaleLink>
            {t("。")}
          </>
        }
      />
      <main className="w-full">
        <Container className="pt-[clamp(28px,4vw,44px)]">
          <div className="content-flow m-0 grid min-w-0 gap-[clamp(40px,5vw,64px)] p-0">
            <DownloadPanel
              entries={entries}
              platform={platform}
              onSelect={(value) => {
                update({ platform: value });
              }}
            />
            <DownloadGuide sections={sections} platform={platform} filter={ready} />
          </div>
        </Container>
      </main>
    </>
  );
}
