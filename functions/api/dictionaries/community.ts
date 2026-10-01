import { serveCommunityPacks } from "../../../shared/community-packs.ts";
import type { SkinContext } from "../../../shared/community-skins.ts";

/** GET /api/dictionaries/community?offset=&q= → `communityDictionariesSchema` (src/data/schemas.ts): public shared dictionaries from msime-backend, cached at the edge for a minute. */
export const onRequest = (context: SkinContext) => serveCommunityPacks("dictionaries", context);
