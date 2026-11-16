import type { SkinContext } from "../../../shared/community-skins.ts";
import { serveOfficialPacks } from "../../../shared/official-packs.ts";

/** GET /api/plugins/official → `officialPluginsSchema` (src/data/schemas.ts): the packs in msime-plugins with their release zips, cached at the edge for an hour. */
export const onRequest = (context: SkinContext) => serveOfficialPacks("plugins", context);
