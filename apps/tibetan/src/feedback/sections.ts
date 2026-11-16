import type { SectionGroup } from "../section-nav";

/** The two forms behind the header's 反馈 entry, in the order their sub-navigation lists them. 反馈栏目 becomes 回報欄目 on Traditional pages. */
export const FEEDBACK_SECTIONS = {
  label: "反馈栏目",
  sections: [
    { to: "/feedback/", label: "Bug 与需求" },
    { to: "/words/", label: "词库缺失" },
  ],
} as const satisfies SectionGroup;
