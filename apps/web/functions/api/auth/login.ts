import { serveLogin, type SessionContext } from "../../../shared/site-session.ts";

/** POST /api/auth/login `{ challenge_id, credential }` → `{ user }`, with the session in HttpOnly cookies. */
export const onRequest = (context: SessionContext) => serveLogin(context);
