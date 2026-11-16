import { proxyApi, type SessionContext } from "../../../shared/site-session.ts";

/** /api/v1/* → msime-backend /v1/*, limited to /v1/users/me and /v1/community/, with the session cookies turned into `Authorization: Bearer`. */
export const onRequest = (context: SessionContext) => proxyApi(context);
