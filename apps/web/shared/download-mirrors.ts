import { z } from "zod";
import { downloadMirrorsSchema, type DownloadMirrors } from "../src/data/schemas.ts";

/** `GET /v1/site/download-mirrors` on msime-backend; admins edit the link in the admin site. An empty string means no link is configured. */
const backendMirrorsSchema = z.object({
  lanzou_url: z.string(),
  updated_at: z.string(),
});

export async function loadDownloadMirrors(origin: string, request: typeof fetch = fetch): Promise<DownloadMirrors> {
  const response = await request(`${origin}/v1/site/download-mirrors`, {
    headers: { Accept: "application/json", "User-Agent": "MSIME-Web-download-mirrors" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Download mirrors unavailable: HTTP ${response.status}`);
  const mirrors = backendMirrorsSchema.parse(await response.json());
  // Validated again here, not only in the backend: the value becomes an `href` on the download page.
  return downloadMirrorsSchema.parse({ lanzouUrl: mirrors.lanzou_url, stale: false });
}
