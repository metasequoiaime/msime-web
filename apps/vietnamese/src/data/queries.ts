import { queryOptions, useQuery } from "@tanstack/react-query";
import type { PlatformsManifest } from "../platforms-data.ts";
import { staticSnapshot } from "./source.ts";

/*
 * The query key `platforms` is a contract with scripts/build-seo.mjs, which seeds it into the prerendered home and download pages; renaming it silently drops the data from the static HTML.
 */

// The schema loads on first fetch rather than at import, so zod stays out of the entry chunk. Seeded pages never call this during hydration.
export const platformsSource = staticSnapshot<PlatformsManifest>("/platforms.json", async (value) => (await import("../platforms-data.ts")).platformsSchema.parse(value));

export const platformsQuery = () =>
  queryOptions({
    queryKey: ["platforms"] as const,
    queryFn: ({ signal }) => platformsSource.load(signal),
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });

export const usePlatformsQuery = () => useQuery(platformsQuery());
