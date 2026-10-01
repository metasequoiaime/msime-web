// Kept apart from schemas.ts so the page bundle can read the kind list without loading zod.
export const PLUGIN_KINDS = ["sound", "music", "command_table", "effect", "helpcode", "symbol_set", "phrase_table", "wordbook"] as const;
export type PluginKind = (typeof PLUGIN_KINDS)[number];

/** The plugin kinds added after the first four. The backend only lists them to callers that declare them in `kinds` (docs/plugin-community.md), so released App versions that cannot install them never see them; the site can draw them all. */
export const DECLARED_PLUGIN_KINDS = "helpcode,symbol_set,phrase_table,wordbook";
