import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { sitePlatforms } from "./data/platforms";
import { usePlatformsQuery, useUpdateManifestQuery } from "./data/queries";
import { DownloadGuide } from "./download/guide";
import { DownloadPanel } from "./download/panel";
import { ReleasesSection } from "./download/releases";
import { fillTemplate, parseGuide } from "./download/template";
import { usePageMeta } from "./page-meta";
import { detectPlatform, PLATFORMS, type Platform } from "./platform";
import { Container } from "./ui";
import { usePageSearch } from "./use-page-search";

/**
 * 下载页（design-home §6）：六个平台的选择卡、所选平台的安装说明，最后是各平台的更新日志（`#releases`）。没有单独的页头：选择卡自带 h1，紧贴导航栏，下载按钮不用滚动就能点到。
 *
 * Test hooks kept from the previous layout: `.content-flow` wraps both `.download-panel` and `#download-content`; there is no `aside` in `main` and no `.doc-card` inside `.content-flow`. The release list sits after `.content-flow`, not inside it. The static HTML renders the Windows choice with every platform's guide visible; `?platform=` applies after hydration.
 */
export function DownloadPage() {
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

  // A visit to /download/#releases (the old /releases/ redirects here) lands before hydration hides the other platforms' guides and before the guide loads in dev, both of which move the section. Scroll to it once more after the layout settles.
  const hash = useLocation({ select: (location) => location.hash });
  const settledHash = useRef(false);
  useEffect(() => {
    if (settledHash.current || !ready || !sections) return;
    settledHash.current = true;
    if (hash === "releases") document.getElementById("releases")?.scrollIntoView();
  }, [ready, sections, hash]);

  return (
    <main className="w-full">
      <Container className="pt-[clamp(12px,2.4vw,32px)]">
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
        <ReleasesSection />
      </Container>
    </main>
  );
}
