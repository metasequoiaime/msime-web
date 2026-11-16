import { z } from "zod";

export const githubAppConfig = z.object({
  GITHUB_APP_ID: z.string().trim().regex(/^\d+$/),
  GITHUB_APP_INSTALLATION_ID: z.string().trim().regex(/^\d+$/),
  GITHUB_APP_PRIVATE_KEY: z.string().trim().min(1),
});

const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const encode = (data: unknown) => base64url(new TextEncoder().encode(JSON.stringify(data)));

// WebCrypto imports PKCS#8. Wrap GitHub's downloaded PKCS#1 RSA key without Node APIs.
function der(tag: number, bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const length = bytes.length < 128 ? [bytes.length] : bytes.length < 256 ? [0x81, bytes.length] : [0x82, bytes.length >> 8, bytes.length & 255];
  return new Uint8Array([tag, ...length, ...bytes]);
}

async function createInstallationToken(config: z.infer<typeof githubAppConfig>, scope: object) {
  const pem = config.GITHUB_APP_PRIVATE_KEY;
  const match = pem.match(/^-----BEGIN (RSA PRIVATE KEY|PRIVATE KEY)-----\s+([A-Za-z0-9+/=\s]+)\s+-----END \1-----$/);
  if (!match || pem.length > 16_384) throw new Error("Invalid App key");
  let bytes = Uint8Array.from(atob(match[2].replace(/\s/g, "")), char => char.charCodeAt(0));
  if (match[1] === "RSA PRIVATE KEY") {
    bytes = der(0x30, new Uint8Array([
      0x02, 0x01, 0x00, // version
      0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
      ...der(0x04, bytes),
    ]));
  }
  const key = await crypto.subtle.importKey("pkcs8", bytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const payload = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iat: now - 60, exp: now + 540, iss: config.GITHUB_APP_ID })}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(payload));
  const response = await fetch(`https://api.github.com/app/installations/${config.GITHUB_APP_INSTALLATION_ID}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${payload}.${base64url(new Uint8Array(signature))}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "MSIME-Web-feedback",
    },
    body: JSON.stringify(scope),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`App authentication failed: HTTP ${response.status}`);
  return z.object({ token: z.string().min(1) }).parse(await response.json()).token;
}

export const installationToken = (config: z.infer<typeof githubAppConfig>, repo: string) =>
  createInstallationToken(config, { repositories: [repo], permissions: { issues: "write" } });

export const communityToken = (config: z.infer<typeof githubAppConfig>) =>
  createInstallationToken(config, { permissions: { metadata: "read" } });
