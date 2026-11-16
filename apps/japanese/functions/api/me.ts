import { serveMe, type SessionContext } from "../../shared/site-session.ts";

/** GET /api/me → `GET /v1/users/me` for the signed-in visitor; 401 when signed out. */
export const onRequest = (context: SessionContext) => serveMe(context);
