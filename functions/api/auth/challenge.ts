import { serveChallenge, type SessionContext } from "../../../shared/site-session.ts";

/** POST /api/auth/challenge → `{ challenge_id, nonce }` for Google Identity Services. */
export const onRequest = (context: SessionContext) => serveChallenge(context);
