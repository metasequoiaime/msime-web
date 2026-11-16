import { serveCatalogList } from "../../shared/community-catalog.ts";
import type { SkinContext } from "../../shared/community-skins.ts";

/** GET /api/plugins?offset=&q=&kind= → `{ items, nextOffset, stale }`: public community plugins from msime-backend for anonymous visitors, cached at the edge for a minute. */
export const onRequest = (context: SkinContext) => serveCatalogList("plugins", context);
