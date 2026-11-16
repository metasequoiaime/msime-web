import { z } from "zod";

export type TurnstileResult = "ok" | "rejected" | "unavailable";

/**
 * Server-side Turnstile check shared by the site's write endpoints.
 *
 * `action` must match the `action` the page passed to `turnstile.render`, so a token solved for one form cannot be replayed against another; `hostname` pins it to the production origin. `unavailable` means Cloudflare could not be asked (network or 5xx) and the caller should answer 503; `rejected` means the token itself is invalid, expired or for another action, and the caller should answer 403.
 */
export async function verifyTurnstile(secret: string, token: string, action: string, hostname: string, request: typeof fetch = fetch): Promise<TurnstileResult> {
  try {
    const response = await request("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return "unavailable";
    const result = z.object({ success: z.literal(true), action: z.literal(action), hostname: z.literal(hostname) }).safeParse(await response.json());
    return result.success ? "ok" : "rejected";
  } catch {
    return "unavailable";
  }
}
