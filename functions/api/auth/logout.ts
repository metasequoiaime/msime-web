import { serveLogout, type SessionContext } from "../../../shared/site-session.ts";

/** POST /api/auth/logout → 204, ends the backend session and clears the cookies. */
export const onRequest = (context: SessionContext) => serveLogout(context);
