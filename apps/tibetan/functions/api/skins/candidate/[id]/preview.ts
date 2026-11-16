import { serveSkinImage, type SkinContext } from "../../../../../shared/community-skins.ts";

/** GET /api/skins/candidate/<id>/preview?v=<version> → the preview image of a candidate-window skin package. */
export const onRequest = (context: SkinContext) => serveSkinImage("candidate", context);
