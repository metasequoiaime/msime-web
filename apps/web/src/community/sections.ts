import type { SectionGroup } from "../section-nav";

/** The three pages behind the header's 社区 entry, in the order their sub-navigation lists them. Plain data, so the site shell can mark 社区 current without loading the community pages' components. */
export const COMMUNITY_SECTIONS = {
  label: "社区栏目",
  sections: [
    { to: "/skins/", label: "皮肤" },
    { to: "/dictionaries/", label: "词库" },
    { to: "/plugins/", label: "插件" },
  ],
} as const satisfies SectionGroup;
