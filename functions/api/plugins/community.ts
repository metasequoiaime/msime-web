import { serveCommunityPacks } from "../../../shared/community-packs.ts";
import type { SkinContext } from "../../../shared/community-skins.ts";

/** GET /api/plugins/community?offset=&q=&kind= → `communityPluginsSchema` (src/data/schemas.ts): public community plugin packs from msime-backend, cached at the edge for a minute. */
export const onRequest = (context: SkinContext) => serveCommunityPacks("plugins", context);
