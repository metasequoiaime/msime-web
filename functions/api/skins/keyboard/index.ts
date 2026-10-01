import { serveSkinList, type SkinContext } from "../../../../shared/community-skins.ts";

/** GET /api/skins/keyboard?offset=&q= → `keyboardSkinsSchema` (src/data/schemas.ts): public keyboard skins from msime-backend, cached at the edge for a minute. */
export const onRequest = (context: SkinContext) => serveSkinList("keyboard", context);
