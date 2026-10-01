import { serveSkinImage, type SkinContext } from "../../../../../shared/community-skins.ts";

/** GET /api/skins/keyboard/<id>/photo → the JPEG wallpaper of a photo keyboard skin, or 404 when it has none. */
export const onRequest = (context: SkinContext) => serveSkinImage("keyboard", context);
