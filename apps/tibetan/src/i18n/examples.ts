/**
 * Keys typed and the Tibetan they produce. A space in `keys` is the Space key, which ends a syllable with a tsheg; `/` ends it with a shad. Each pair was checked against the msime engine (crates/engine/src/tibetan/scheme.rs tests, the golden scenario bo_ewts_syllable_marks and the session rules in crates/engine/src/session/input.rs) and against the `ewts` 0.1.4 crate the engine links.
 */
export const EWTS_EXAMPLES: readonly { keys: string; result: string }[] = [
  { keys: "bkra shis bde legs/", result: "བཀྲ་ཤིས་བདེ་ལེགས།" },
  { keys: "bod skad/", result: "བོད་སྐད།" },
  { keys: "thugs rje che/", result: "ཐུགས་རྗེ་ཆེ།" },
  { keys: "nga/", result: "ང་།" },
  { keys: "'od", result: "འོད" },
  { keys: "g.yag", result: "གཡག" },
  { keys: "gyag", result: "གྱག" },
  { keys: "pad+ma", result: "པདྨ" },
  { keys: "Ta", result: "ཊ" },
  { keys: "kA", result: "ཀཱ" },
  { keys: "oM", result: "ཨོཾ" },
  { keys: "k-i", result: "ཀྀ" },
];

/** The home page demo: one phrase typed syllable by syllable. */
export const HOME_DEMO = EWTS_EXAMPLES[0];
