import { serveAuthConfig, type SessionContext } from "../../../shared/site-session.ts";

/** GET /api/auth/config → `{ google_client_id: string | null }`. */
export const onRequest = (context: SessionContext) => serveAuthConfig(context);
