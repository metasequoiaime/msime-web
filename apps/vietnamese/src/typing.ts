/**
 * Telex and VNI examples shown on the site. Language-neutral: the page text around them lives in src/i18n.
 *
 * Every pair was checked against the engine's rules (msime crates/engine/src/vietnamese/scheme.rs, which runs keystrokes through the `vi` crate pinned at 0.8.0 with the modern tone style unless noted), not written from memory. The engine's own tests cover hoaf, thuyr, khoer, tieengs, nguoiwf, dduwowngf, NGUOWIF, w, ww, aaa, ddd, Vieejt, DDuwowngf, viet65, nguo72i, hoa2, VIET65 and the coffee/Esc and vieejt/Backspace sequences.
 */

export type Example = readonly [keys: string, result: string];

export type ToneId = "sac" | "huyen" | "hoi" | "nga" | "nang" | "remove";

export const TONES: readonly { id: ToneId; mark: string; telex: string; vni: string; telexExample: Example; vniExample: Example }[] = [
  { id: "sac", mark: "á", telex: "s", vni: "1", telexExample: ["sawcs", "sắc"], vniExample: ["sa8c1", "sắc"] },
  { id: "huyen", mark: "à", telex: "f", vni: "2", telexExample: ["huyeenf", "huyền"], vniExample: ["huye6n2", "huyền"] },
  { id: "hoi", mark: "ả", telex: "r", vni: "3", telexExample: ["hoir", "hỏi"], vniExample: ["hoi3", "hỏi"] },
  { id: "nga", mark: "ã", telex: "x", vni: "4", telexExample: ["ngax", "ngã"], vniExample: ["nga4", "ngã"] },
  { id: "nang", mark: "ạ", telex: "j", vni: "5", telexExample: ["nawngj", "nặng"], vniExample: ["na8ng5", "nặng"] },
  { id: "remove", mark: "a", telex: "z", vni: "0", telexExample: ["hoirz", "hoi"], vniExample: ["hoi30", "hoi"] },
];

export const LETTERS: readonly { letter: string; telex: string; vni: string; telexExample: Example; vniExample: Example }[] = [
  { letter: "â", telex: "aa", vni: "a6", telexExample: ["ddaau", "đâu"], vniExample: ["d9a6u", "đâu"] },
  { letter: "ă", telex: "aw", vni: "a8", telexExample: ["awn", "ăn"], vniExample: ["a8n", "ăn"] },
  { letter: "ê", telex: "ee", vni: "e6", telexExample: ["ddeem", "đêm"], vniExample: ["d9e6m", "đêm"] },
  { letter: "ô", telex: "oo", vni: "o6", telexExample: ["coo", "cô"], vniExample: ["co6", "cô"] },
  { letter: "ơ", telex: "ow", vni: "o7", telexExample: ["mow", "mơ"], vniExample: ["mo7", "mơ"] },
  { letter: "ư", telex: "uw", vni: "u7", telexExample: ["tuw", "tư"], vniExample: ["tu7", "tư"] },
  { letter: "đ", telex: "dd", vni: "d9", telexExample: ["ddi", "đi"], vniExample: ["d9i", "đi"] },
];

export const TELEX_WORDS: readonly Example[] = [
  ["Vieejt", "Việt"],
  ["tieengs", "tiếng"],
  ["nguoiwf", "người"],
  ["dduwowngf", "đường"],
  ["chaof", "chào"],
  ["chuwx", "chữ"],
];

export const VNI_WORDS: readonly Example[] = [
  ["Viet65", "Việt"],
  ["tieng61", "tiếng"],
  ["nguo72i", "người"],
  ["d9u7o7ng2", "đường"],
  ["chao2", "chào"],
  ["chu74", "chữ"],
];

/** Telex keys with the modern and the classic tone style. */
export const TONE_STYLES: readonly [keys: string, modern: string, classic: string][] = [
  ["hoaf", "hoà", "hòa"],
  ["thuyr", "thuỷ", "thủy"],
  ["khoer", "khoẻ", "khỏe"],
];

/** The hero's demonstration: one phrase in each method, word by word (Space ends a word). */
export const HERO_DEMO: readonly { method: "Telex" | "VNI"; words: readonly Example[] }[] = [
  { method: "Telex", words: [["Tieengs", "Tiếng"], ["Vieejt", "Việt"]] },
  { method: "VNI", words: [["Tie6ng1", "Tiếng"], ["Vie65t", "Việt"]] },
];
