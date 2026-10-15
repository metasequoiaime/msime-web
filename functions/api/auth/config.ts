import { serveAuthConfig, type SessionContext } from "../../../shared/site-session.ts";

/** GET /api/auth/config → `{ google_client_id: string | null, email_enabled: boolean }`. */
export const onRequest = (context: SessionContext) => serveAuthConfig(context);
