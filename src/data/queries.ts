import { queryOptions, useQuery } from "@tanstack/react-query";
import type { PlatformsManifest } from "../platforms-data.ts";
import type { ReleaseFilter } from "./platforms.ts";
import type { AppStats, Community, DownloadMirrors, Notices, Releases, UpdateManifest } from "./schemas.ts";
import { siteApi, staticSnapshot, withFallback } from "./source.ts";

/*
 * TanStack Query option factories, one per resource. The query keys `community`, `platforms` and `update-manifest` are a contract with `scripts/build-seo.mjs`, which seeds exactly those keys into prerendered pages; renaming one silently drops the data from static HTML. Every query function returns the resource itself (never a `Loaded` wrapper) because seeded data has the plain resource shape.
 */

// Schemas load on first fetch rather than at import, so zod is not part of the entry chunk. Seeded pages never call these during hydration.
const schemas = () => import("./schemas.ts");

// ---- community ----

/** Live statistics from the Pages Function; the bundled daily snapshot answers when the Function is unreachable. */
export const communitySource = withFallback<Community>(
  siteApi("/api/community", async value => (await schemas()).communitySchema.parse(value)),
  staticSnapshot("/community.json", async value => (await schemas()).communitySchema.parse(value))
);

/** Matches the Function's edge cache window (`freshFor` in shared/live-community.ts); polling faster would only fetch the same copy again. */
export const COMMUNITY_REFRESH_MS = 600_000;

export const communityQuery = () =>
  queryOptions({
    queryKey: ["community"] as const,
    queryFn: async ({ signal, client, queryKey }): Promise<Community> => {
      const { data, stale } = await communitySource.load(signal);
      if (!stale) return data;
      // A failed live refetch answers with the bundled snapshot (or the Function's cached copy), which can be older than what the page already shows from an earlier live read. Keep the newer copy, flagged as stale, instead of rolling the numbers back.
      const previous = client.getQueryData<Community>(queryKey);
      const kept = previous && Date.parse(previous.generatedAt) > Date.parse(data.generatedAt) ? previous : data;
      return kept.stale ? kept : { ...kept, stale: true };
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: COMMUNITY_REFRESH_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });

export const useCommunityQuery = () => useQuery(communityQuery());

// ---- platforms ----

/** Same file and schema as `fetchPlatforms` in platforms-data.ts, but with the schema loaded lazily so the home page's platform cards do not pull zod in. */
export const platformsSource = staticSnapshot<PlatformsManifest>("/platforms.json", async value => (await schemas()).platformsSchema.parse(value));

export const platformsQuery = () =>
  queryOptions({
    queryKey: ["platforms"] as const,
    queryFn: ({ signal }) => platformsSource.load(signal),
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });

export const usePlatformsQuery = () => useQuery(platformsQuery());

// ---- update-manifest ----

/** `no-store` plus a timestamp so neither the CDN nor the browser hands back the previous release's manifest. */
export const updateManifestSource = staticSnapshot<UpdateManifest>("/update.json", async value => (await schemas()).updateManifestSchema.parse(value), {
  init: { cache: "no-store" },
  bustCache: true,
});

export const updateManifestQuery = () =>
  queryOptions({
    queryKey: ["update-manifest"] as const,
    queryFn: ({ signal }) => updateManifestSource.load(signal),
    // The manifest only changes when a release ships; one read per session is enough.
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

export const useUpdateManifestQuery = () => useQuery(updateManifestQuery());

// ---- releases ----

export const releasesSource = (platform: ReleaseFilter = "all") =>
  siteApi<Releases>(`/api/releases${platform === "all" ? "" : `?platform=${platform}`}`, async value => (await schemas()).releasesSchema.parse(value));

/** Release history across all platforms, newest first. Pass `"all"` and filter locally when the page needs per-platform counts, which avoids one request per filter chip. */
export const releasesQuery = (platform: ReleaseFilter = "all") =>
  queryOptions({
    queryKey: ["releases", platform] as const,
    queryFn: ({ signal }) => releasesSource(platform).load(signal),
    staleTime: COMMUNITY_REFRESH_MS,
    retry: 1,
  });

export const useReleasesQuery = (platform: ReleaseFilter = "all") => useQuery(releasesQuery(platform));

// ---- app-stats ----

export const appStatsSource = siteApi<AppStats>("/api/app-stats", async value => (await schemas()).appStatsSchema.parse(value));

/** Community counters from msime-backend. The Function answers 503 when it has nothing to show; the section should render nothing unless `data` is present. */
export const appStatsQuery = () =>
  queryOptions({
    queryKey: ["app-stats"] as const,
    queryFn: ({ signal }) => appStatsSource.load(signal),
    staleTime: COMMUNITY_REFRESH_MS,
    retry: false,
  });

export const useAppStatsQuery = () => useQuery(appStatsQuery());

// ---- download-mirrors ----

export const downloadMirrorsSource = siteApi<DownloadMirrors>("/api/download-mirrors", async value => (await schemas()).downloadMirrorsSchema.parse(value));

/** The Lanzou link for the Windows installer. The Function answers 503 when the backend has never answered; the panel then simply leaves the mirror out. */
export const downloadMirrorsQuery = () =>
  queryOptions({
    queryKey: ["download-mirrors"] as const,
    queryFn: ({ signal }) => downloadMirrorsSource.load(signal),
    staleTime: COMMUNITY_REFRESH_MS,
    retry: false,
  });

export const useDownloadMirrorsQuery = () => useQuery(downloadMirrorsQuery());

// ---- notices ----

export const noticesSource = siteApi<Notices>("/api/notices", async value => (await schemas()).noticesSchema.parse(value));

/** Notices for the website banner. The Function caches the backend's feed for 60 s, so this never refetches sooner; a 503 means no banner. */
export const noticesQuery = () =>
  queryOptions({
    queryKey: ["notices"] as const,
    queryFn: ({ signal }) => noticesSource.load(signal),
    staleTime: 60_000,
    retry: false,
  });

export const useNoticesQuery = () => useQuery(noticesQuery());
