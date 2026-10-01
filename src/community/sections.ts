/** The three pages behind the header's 社区 entry, in the order their sub-navigation shows them. Plain data, so the site shell can mark 社区 current without loading the community pages' components. */
export const COMMUNITY_SECTIONS = [
  { to: "/skins/", label: "皮肤" },
  { to: "/dictionaries/", label: "词库" },
  { to: "/plugins/", label: "插件" },
] as const;
export type CommunitySection = (typeof COMMUNITY_SECTIONS)[number]["to"];
