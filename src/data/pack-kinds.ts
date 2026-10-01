/*
 * Kinds and labels of plugin packs and shared dictionary entries, plain data so the pages read them without pulling zod into their chunks while schemas.ts and the Functions validate against the same lists.
 *
 * Plugin kinds are `pluginKinds` in msime-backend (internal/account/community_plugin_archive.go) and the `kind` of a plugin.toml in msime-plugins; labels are `kindLabels` in the App (packages/ui/src/settings/plugin-catalog-helpers.ts). Entry kinds are `dictionaryKind` in msime-backend (internal/account/dictionary_http.go); labels are the App's 社区词库 publish dialog (packages/ui/src/community/community-resources.tsx).
 */

export const PLUGIN_KINDS = ["sound", "music", "command_table", "effect"] as const;
export type PluginKind = (typeof PLUGIN_KINDS)[number];

export const PLUGIN_KIND_LABELS: Record<PluginKind, string> = {
  sound: "音效包",
  music: "音乐包",
  command_table: "指令表",
  effect: "特效包",
};

/** The kinds the App's 社区插件 gallery lists. It cannot install a community effect pack and leaves those rows out, so the site does too; official effect packs install from their .zip like any other. */
export const COMMUNITY_PLUGIN_KINDS = ["sound", "music", "command_table"] as const satisfies readonly PluginKind[];
export type CommunityPluginKind = (typeof COMMUNITY_PLUGIN_KINDS)[number];

export const isPluginKind = (value: string): value is PluginKind => (PLUGIN_KINDS as readonly string[]).includes(value);
export const isCommunityPluginKind = (value: string): value is CommunityPluginKind => (COMMUNITY_PLUGIN_KINDS as readonly string[]).includes(value);

export const ENTRY_KINDS = ["pinyin", "wubi", "english", "quick"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  pinyin: "拼音",
  wubi: "五笔",
  english: "英文",
  quick: "快捷短语",
};
