import type { SkinContext } from "../../../shared/community-skins.ts";
import { serveOfficialPacks } from "../../../shared/official-packs.ts";

/** GET /api/dictionaries/official → `officialDictionariesSchema` (src/data/schemas.ts): the professional word lists in msime-dictionary `packs/`, cached at the edge for an hour. */
export const onRequest = (context: SkinContext) => serveOfficialPacks("dictionaries", context);
