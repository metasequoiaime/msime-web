import { useQuery } from "@tanstack/react-query";
import { platformsSchema, type PlatformsManifest } from "../platforms-data";

/**
 * The release manifest, read from this site's own copy (`/platforms.json`). The query key `platforms` is a contract with scripts/build-seo.mjs, which seeds the parsed manifest into the prerendered download page so its file list is in the static HTML.
 */
export const platformsQuery = () => ({
  queryKey: ["platforms"] as const,
  queryFn: async ({ signal }: { signal?: AbortSignal }): Promise<PlatformsManifest> => {
    const response = await fetch("/platforms.json", { signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`/platforms.json returned HTTP ${response.status}`);
    return platformsSchema.parse(await response.json());
  },
  staleTime: 5 * 60 * 1000,
});

export const usePlatformsQuery = () => useQuery(platformsQuery());
