import MarkdownIt from "markdown-it";
import { z } from "zod";
import { officialDictionarySchema, officialPluginSchema, type DictionaryFile, type OfficialDictionaries, type OfficialDictionary, type OfficialPlugin, type OfficialPlugins } from "../src/data/schemas.ts";
import { PLUGIN_KINDS } from "../src/data/pack-kinds.ts";
import { edgeCache, jsonHeaders, type SkinContext } from "./community-skins.ts";
import { cachedJson, UpstreamUnavailable } from "./edge-cache.ts";
import { communityToken, githubAppConfig } from "./github-app.ts";

/*
 * The packs the project itself ships in two repositories, read live from GitHub so the pages follow `main` without a site deploy:
 *
 * - msime-plugins `packs/<id>/plugin.toml`, with each pack's .zip from the repository's `packs` release (scripts/build-release.sh names it `<id>-<version>.zip`).
 * - msime-dictionary `packs/<id>/`: a README whose title and first paragraph describe the pack, and the tab-separated word lists users import in the App's 词库 settings.
 *
 * Each sweep is one GitHub API call per repository for the tree (plus one for the plugins release) under the site's GitHub App token, which keeps clear of the 60-an-hour anonymous limit Cloudflare's shared addresses would hit; the file bodies come from raw.githubusercontent.com, which is not an API call. A sweep runs at most once an hour per edge location. Without App credentials (local `wrangler pages dev`) the API is called anonymously.
 */

const OWNER = "metasequoiaime";
export const PLUGINS_REPO = "msime-plugins";
export const DICTIONARY_REPO = "msime-dictionary";
const BRANCH = "main";
/** The release scripts/build-release.sh uploads every pack's zip to. */
const PLUGINS_RELEASE = "packs";

/** Packs read per sweep, so a repository that grows a lot cannot push one sweep past the Worker's subrequest limit. */
const MAX_PACKS = 40;
/** Word lists above this are not downloaded just to count their lines. */
const MAX_COUNTED_BYTES = 2 * 1024 * 1024;

/** msime-dictionary licenses what the project wrote itself, `packs/` included, under GPL-3.0 (its README, 许可); the rest of that repository has no single licence. */
const DICTIONARY_PACK_LICENSE = "GPL-3.0";

const treeSchema = z.object({ tree: z.array(z.object({ path: z.string(), type: z.string(), size: z.number().optional() })), truncated: z.boolean().optional() });
const releaseSchema = z.object({ assets: z.array(z.object({ name: z.string(), size: z.number(), browser_download_url: z.string() })) });

type Tree = z.infer<typeof treeSchema>["tree"];

/** What a sweep needs from the environment; tests pass their own `fetch`. */
export type GitHubAccess = { token?: string; request?: typeof fetch };

const apiHeaders = (token?: string) => ({
  Accept: "application/vnd.github+json",
  "User-Agent": "MSIME-Web-packs",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

async function githubApi(path: string, { token, request = fetch }: GitHubAccess, signal: AbortSignal): Promise<Response> {
  return request(`https://api.github.com/repos/${OWNER}/${path}`, { headers: apiHeaders(token), signal });
}

/** The repository's tree on `main`. A truncated tree would silently drop packs, so it is refused. */
async function loadTree(repo: string, access: GitHubAccess, signal: AbortSignal): Promise<Tree> {
  const response = await githubApi(`${repo}/git/trees/${BRANCH}?recursive=1`, access, signal);
  if (!response.ok) throw new Error(`GitHub tree unavailable: HTTP ${response.status} (${repo})`);
  const tree = treeSchema.parse(await response.json());
  if (tree.truncated) throw new Error(`GitHub tree truncated (${repo})`);
  return tree.tree;
}

export const rawUrl = (repo: string, path: string) => `https://raw.githubusercontent.com/${OWNER}/${repo}/${BRANCH}/${path.split("/").map(encodeURIComponent).join("/")}`;
const sourceUrl = (repo: string, path: string) => `https://github.com/${OWNER}/${repo}/tree/${BRANCH}/${path.split("/").map(encodeURIComponent).join("/")}`;

async function loadRaw(repo: string, path: string, { request = fetch }: GitHubAccess, signal: AbortSignal): Promise<string> {
  const response = await request(rawUrl(repo, path), { headers: { "User-Agent": "MSIME-Web-packs" }, signal });
  if (!response.ok) throw new Error(`Raw file unavailable: HTTP ${response.status} (${repo}/${path})`);
  return response.text();
}

/** The directories directly under `packs/`, in the tree's (alphabetical) order. */
const packDirectories = (tree: Tree) => tree.filter(entry => entry.type === "tree" && /^packs\/[^/]+$/.test(entry.path)).map(entry => entry.path.slice("packs/".length)).slice(0, MAX_PACKS);

// ---- msime-plugins ----

export type PluginManifest = { fields: Record<string, string>; commands: number };

/**
 * The parts of a plugin.toml the page shows: the top-level `key = "value"` strings (`kind`, `id`, `name`, `version`, `license`, `author`, `description`, `mode`) and how many `[[commands]]` tables it has.
 *
 * This reads that fixed subset rather than all of TOML. The site has no TOML parser among its dependencies, and msime-pack (which CI runs on every pack) only admits single-line basic strings for these keys, written before the first table. A TOML basic string is a JSON string apart from the `\U` and `\e` escapes, so JSON.parse decodes it; a value it cannot decode is left out, and a pack missing its kind, id or name is skipped by the caller.
 */
export function readPluginManifest(text: string): PluginManifest {
  const fields: Record<string, string> = {};
  let commands = 0;
  let inTable = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "[[commands]]") commands++;
    if (/^\[/.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable) continue;
    const match = /^([A-Za-z0-9_-]+)\s*=\s*("(?:[^"\\]|\\.)*")\s*(?:#.*)?$/.exec(line);
    if (!match || match[1] in fields) continue;
    try {
      const value: unknown = JSON.parse(match[2]);
      if (typeof value === "string") fields[match[1]] = value;
    } catch {
      // An escape JSON does not share with TOML: leave the field out.
    }
  }
  return { fields, commands };
}

/** Kind order, then the repository's alphabetical order within a kind. */
const byKind = (left: OfficialPlugin, right: OfficialPlugin) => PLUGIN_KINDS.indexOf(left.kind) - PLUGIN_KINDS.indexOf(right.kind);

export async function loadOfficialPlugins(access: GitHubAccess = {}): Promise<OfficialPlugins> {
  const signal = AbortSignal.timeout(20_000);
  const tree = await loadTree(PLUGINS_REPO, access, signal);
  const release = await githubApi(`${PLUGINS_REPO}/releases/tags/${PLUGINS_RELEASE}`, access, signal);
  // No release yet is not a failure: the packs are listed without a download.
  if (!release.ok && release.status !== 404) throw new Error(`GitHub release unavailable: HTTP ${release.status} (${PLUGINS_REPO})`);
  const assets = release.ok ? releaseSchema.parse(await release.json()).assets : [];
  const zipPrefix = `https://github.com/${OWNER}/${PLUGINS_REPO}/releases/download/`;
  const directories = packDirectories(tree).filter(directory => tree.some(entry => entry.path === `packs/${directory}/plugin.toml`));
  const manifests = await Promise.all(directories.map(directory => loadRaw(PLUGINS_REPO, `packs/${directory}/plugin.toml`, access, signal)));
  const items: OfficialPlugin[] = [];
  directories.forEach((directory, index) => {
    const { fields, commands } = readPluginManifest(manifests[index]);
    const asset = assets.find(item => item.name === `${fields.id}-${fields.version}.zip` && item.browser_download_url.startsWith(zipPrefix));
    const parsed = officialPluginSchema.safeParse({
      id: fields.id,
      kind: fields.kind,
      name: fields.name,
      description: fields.description ?? "",
      author: fields.author ?? "",
      version: fields.version ?? "",
      license: fields.license ?? "",
      ...(fields.kind === "sound" && (fields.mode === "keys" || fields.mode === "sequence") ? { mode: fields.mode } : {}),
      ...(fields.kind === "command_table" ? { commands } : {}),
      ...(asset ? { size: asset.size, download: asset.browser_download_url } : {}),
      source: sourceUrl(PLUGINS_REPO, `packs/${directory}`),
    });
    if (parsed.success) items.push(parsed.data);
    else console.warn("Skipped an official plugin pack the site cannot read", directory);
  });
  if (directories.length > 0 && items.length === 0) throw new Error("No official plugin pack could be read");
  return { items: items.sort(byKind), stale: false };
}

// ---- msime-dictionary ----

const markdown = new MarkdownIt();
type Token = ReturnType<typeof markdown.parse>[number];

/** The plain text of an inline token: text, code and line breaks, without link targets or markup. */
const inlineText = (token: Token) =>
  (token.children ?? []).map(child => (child.type === "text" || child.type === "code_inline" ? child.content : child.type === "softbreak" || child.type === "hardbreak" ? " " : "")).join("").trim();

/** A pack README's first-level heading and the paragraph after it. */
export function readPackReadme(text: string): { name: string; description: string } {
  const tokens = markdown.parse(text, {});
  let name = "";
  let description = "";
  for (const [index, token] of tokens.entries()) {
    if (!name && token.type === "heading_open" && token.tag === "h1") name = inlineText(tokens[index + 1]);
    else if (name && token.type === "paragraph_open" && token.level === 0) {
      description = inlineText(tokens[index + 1]);
      break;
    } else if (name && token.type === "heading_open") break;
  }
  return { name, description };
}

/** Counts the entries of a word list: every non-empty line that is not a `#` comment. */
export const countEntries = (text: string) => text.split(/\r?\n/).filter(line => line.trim() !== "" && !line.startsWith("#")).length;

export async function loadOfficialDictionaries(access: GitHubAccess = {}): Promise<OfficialDictionaries> {
  const signal = AbortSignal.timeout(20_000);
  const tree = await loadTree(DICTIONARY_REPO, access, signal);
  const items: OfficialDictionary[] = [];
  for (const directory of packDirectories(tree)) {
    const prefix = `packs/${directory}/`;
    const blobs = tree.filter(entry => entry.type === "blob" && entry.path.startsWith(prefix) && !entry.path.slice(prefix.length).includes("/"));
    const readme = blobs.find(entry => entry.path === `${prefix}README.md`);
    const lists = blobs.filter(entry => entry.path.endsWith(".txt"));
    if (lists.length === 0) continue;
    const [about, files] = await Promise.all([
      readme ? loadRaw(DICTIONARY_REPO, readme.path, access, signal).then(readPackReadme) : Promise.resolve({ name: "", description: "" }),
      Promise.all(lists.map(async (entry): Promise<DictionaryFile> => {
        const size = entry.size ?? 0;
        const entries = size <= MAX_COUNTED_BYTES ? countEntries(await loadRaw(DICTIONARY_REPO, entry.path, access, signal)) : undefined;
        return { name: entry.path.slice(prefix.length), size, ...(entries === undefined ? {} : { entries }), url: rawUrl(DICTIONARY_REPO, entry.path) };
      })),
    ]);
    const parsed = officialDictionarySchema.safeParse({ id: directory, name: about.name || directory, description: about.description, license: DICTIONARY_PACK_LICENSE, files, source: sourceUrl(DICTIONARY_REPO, `packs/${directory}`) });
    if (parsed.success) items.push(parsed.data);
    else console.warn("Skipped an official dictionary pack the site cannot read", directory);
  }
  return { items, stale: false };
}

// ---- Pages Functions ----

export type OfficialPackList = "plugins" | "dictionaries";

const NAMES: Record<OfficialPackList, string> = { plugins: "官方插件", dictionaries: "专业词库" };

/** The App token when the Function has the App's credentials, otherwise none (anonymous calls, for local development). */
async function access(env: Record<string, unknown>): Promise<GitHubAccess> {
  const config = githubAppConfig.safeParse(env);
  if (!config.success) {
    console.warn("GitHub App credentials missing: reading the pack repositories anonymously");
    return {};
  }
  // Public repositories need nothing beyond the metadata permission the community sweep already uses.
  return { token: await communityToken(config.data) };
}

/** GET /api/plugins/official and /api/dictionaries/official → `officialPluginsSchema` / `officialDictionariesSchema` (src/data/schemas.ts). One sweep an hour per edge location; a failed sweep keeps serving the last good copy marked `stale`, and 503 `{ error }` when there has never been one. */
export async function serveOfficialPacks(list: OfficialPackList, { request, env, waitUntil }: SkinContext): Promise<Response> {
  if (request.method !== "GET") return Response.json({ error: "不支持此请求方式" }, { status: 405, headers: { ...jsonHeaders, Allow: "GET" } });
  const key = new Request(new URL(`/api/${list}/official`, request.url));
  const load = async () => (list === "plugins" ? loadOfficialPlugins(await access(env)) : loadOfficialDictionaries(await access(env)));
  try {
    const { data, stale } = await cachedJson<OfficialPlugins | OfficialDictionaries>(key, edgeCache(), load, { freshFor: 3_600_000, retryAfter: 300_000, keepFor: 7 * 86_400_000, background: waitUntil });
    return Response.json({ ...data, stale }, { headers: jsonHeaders });
  } catch (error) {
    if (!(error instanceof UpstreamUnavailable)) throw error;
    return Response.json({ error: `${NAMES[list]}暂不可用，请稍后再试或前往 GitHub 查看。` }, { status: 503, headers: jsonHeaders });
  }
}
