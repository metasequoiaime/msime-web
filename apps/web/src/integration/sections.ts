import type { SectionGroup } from "../section-nav";

/** The two pages behind the header's 接入 entry, both for developers who build the engine or the models into their own input methods, in the order their sub-navigation lists them. 引擎库 comes first and the entry opens it: the engine is the part another input method builds on and works on its own, while 神经联想 is an optional add-on that reranks the sentences the engine composes. Plain data, so the site shell can mark 接入 current without loading either page. */
export const INTEGRATION_SECTIONS = {
  label: "接入栏目",
  sections: [
    { to: "/engine/", label: "引擎库" },
    { to: "/model/", label: "神经联想" },
  ],
} as const satisfies SectionGroup;
