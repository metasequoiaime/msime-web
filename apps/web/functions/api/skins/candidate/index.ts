import { serveSkinList, type SkinContext } from "../../../../shared/community-skins.ts";

/** GET /api/skins/candidate?offset=&q=&category= → `candidateSkinsSchema` (src/data/schemas.ts): public candidate-window skins from msime-backend, cached at the edge for a minute. */
export const onRequest = (context: SkinContext) => serveSkinList("candidate", context);
