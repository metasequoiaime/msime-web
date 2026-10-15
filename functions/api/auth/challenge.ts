import { serveChallenge, type SessionContext } from "../../../shared/site-session.ts";

/** POST /api/auth/challenge: request an email code or a Google nonce. */
export const onRequest = (context: SessionContext) => serveChallenge(context);
