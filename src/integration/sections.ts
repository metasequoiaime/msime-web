import type { SectionGroup } from "../section-nav";

/** The two pages behind the header's 接入 entry, both for developers who build the engine or the models into their own input methods, in the order their sub-navigation lists them. 神经联想 comes first because the entry opens it, the address the tab had before 引擎库 joined it. Plain data, so the site shell can mark 接入 current without loading either page. */
export const INTEGRATION_SECTIONS = {
  label: "接入栏目",
  sections: [
    { to: "/model/", label: "神经联想" },
    { to: "/engine/", label: "引擎库" },
  ],
} as const satisfies SectionGroup;
