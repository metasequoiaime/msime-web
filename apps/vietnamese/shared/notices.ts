import { z } from "zod";
import { noticesSchema, type Notices } from "../src/data/schemas.ts";

/** `GET /v1/notices` on msime-backend (internal/account/admin_notices.go), newest first, at most 20. */
const backendNoticesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      body: z.string(),
      targets: z.array(z.string()),
      channels: z.array(z.string()),
      published_at: z.string(),
    })
  ),
});

/** Only the website channel, and no platform filter: one cached copy serves every visitor, and the page filters by platform itself. */
export async function loadNotices(origin: string, request: typeof fetch = fetch): Promise<Notices> {
  const response = await request(`${origin}/v1/notices?channel=site`, {
    headers: { Accept: "application/json", "User-Agent": "MSIME-Web-notices" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Notices unavailable: HTTP ${response.status}`);
  const { items } = backendNoticesSchema.parse(await response.json());
  return noticesSchema.parse({
    items: items.map(item => ({ id: item.id, title: item.title, body: item.body, targets: item.targets, publishedAt: item.published_at })),
    stale: false,
  });
}
