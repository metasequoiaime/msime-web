import { serveCatalogList } from "../../shared/community-catalog.ts";
import type { SkinContext } from "../../shared/community-skins.ts";

/** GET /api/resources?kind=&offset=&q= → `{ items, nextOffset, stale }`: public word packs or reply templates from msime-backend for anonymous visitors, cached at the edge for a minute. */
export const onRequest = (context: SkinContext) => serveCatalogList("resources", context);
