import { type RefObject, useCallback, useEffect, useState } from "react";

export type SchemeId = "quanpin" | "shuangpin" | "wubi";
export type LanguageId = "en" | "ja";

type Candidate = { word: string; gloss: Record<LanguageId, string> };

const METASEQUOIA: Candidate = { word: "水杉", gloss: { en: "metasequoia", ja: "メタセコイア" } };
// 全拼和双拼敲的是同一组音节，候选一致。只放完整匹配 shui'shan 的三个词组，和真实输入法排在最前面的一样；首音节的单字不放，让首屏的演示卡片保持紧凑。
const PINYIN_CANDIDATES: Candidate[] = [
  METASEQUOIA,
  { word: "水山", gloss: { en: "water and mountains", ja: "水と山" } },
  { word: "睡衫", gloss: { en: "nightshirt", ja: "寝間着" } },
];

/**
 * 标题里轮换的输入方案，以及候选窗里对应的编码和候选。
 *
 * 编码都对过 MSIME-Engine 的码表：小鹤双拼 shui→uv、shan→uj（shuangpin_profile.cpp 的 xiaohe 方案，xiaoheshuangpindb 里「水杉」就是 uvuj）；五笔 86 两字词取每字前两码，水 = ii（键名字 iiii）、杉 = set，所以「水杉」是 iise，Wubi86.txt 里同码的只有「消极」。
 */
export const SCHEMES: Record<SchemeId, { word: string; label: string; code: string; candidates: Candidate[] }> = {
  quanpin: { word: "全拼", label: "全拼", code: "shui'shan", candidates: PINYIN_CANDIDATES },
  shuangpin: { word: "双拼", label: "小鹤双拼", code: "uv'uj", candidates: PINYIN_CANDIDATES },
  wubi: { word: "五笔", label: "五笔 86", code: "iise", candidates: [METASEQUOIA, { word: "消极", gloss: { en: "negative · passive", ja: "消極的" } }] },
};

/** 候选窗最多几行；五笔只有两个候选，按最长的一组留高度，免得切换方案时卡片跳动。 */
export const CANDIDATE_ROWS = Math.max(...Object.values(SCHEMES).map((scheme) => scheme.candidates.length));

/** Language names are shown as written in that language, so they never go through the zh-TW converter. */
export const LANGUAGES: Record<LanguageId, string> = { en: "English", ja: "日本語" };

/** Every scheme meets both languages once; the first pair is what SSR and reduced motion show. */
export const PAIRS: readonly { scheme: SchemeId; language: LanguageId }[] = [
  { scheme: "quanpin", language: "en" },
  { scheme: "shuangpin", language: "ja" },
  { scheme: "wubi", language: "en" },
  { scheme: "quanpin", language: "ja" },
  { scheme: "shuangpin", language: "en" },
  { scheme: "wubi", language: "ja" },
];

const TYPE_MS = 120;
const ERASE_MS = 55;
const HOLD_MS = 2600;
const NEXT_MS = 280;

type Phase = "type" | "hold" | "erase";
/** `pinned` is set once a visitor picks a pair from the dots: the cycle types that pair and then holds it for good. */
type CycleState = { pair: number; keys: number; phase: Phase; pinned: boolean };

/** A complete, still frame: every key typed and the candidates up. What SSR renders and what reduced motion freezes on. */
const STILL: CycleState = { pair: 0, keys: Number.POSITIVE_INFINITY, phase: "hold", pinned: false };

/**
 * Keystrokes a pair takes to type in full: the scheme word, then the language name, while the composition code types alongside.
 *
 * The headline strings are the displayed ones (after zh-TW conversion), counted in code points so 日本語 is three keys.
 */
const keyCount = (scheme: string, language: string, code: string) => Math.max([...scheme].length + [...language].length, code.length);

export type HeroFrame = {
  pair: number;
  scheme: SchemeId;
  language: LanguageId;
  schemeText: string;
  languageText: string;
  code: string;
  /** Which headline slot the caret sits in; null when the cycle is not animating. */
  caret: "scheme" | "language" | null;
  /** Show this pair and stop cycling for the rest of the visit. */
  select: (pair: number) => void;
};

/**
 * 首页首屏的打字轮换：标题里的方案和语言逐字打出、停留、删掉再换下一组，右侧候选窗的编码同步敲入。
 *
 * 服务端和水合时都是第一组的完整文字，挂载后才开始动。标签页在后台或首屏滚出视口时停在当前帧；开启「减少动态效果」时（包括轮换途中才打开）回到第一组的完整一帧，关掉后从那里接着轮换；`hovering` 为真（指针或焦点在演示区里）时打完当前这组就停住不往下切；点过圆点（`select`）后打出所选的一组并一直停在那里。只用一个 setTimeout 驱动，卸载时清掉。
 */
export function useHeroCycle(target: RefObject<HTMLElement | null>, schemeWord: (id: SchemeId) => string, hovering: boolean): HeroFrame {
  const [state, setState] = useState<CycleState>(STILL);
  const [motion, setMotion] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setMotion(!query.matches);
      // Freezing wherever the cycle happened to be could leave a half-typed headline ("五笔Englis") on screen for good. A pair the visitor picked stays, shown in full.
      if (query.matches) setState((current) => (current.pinned ? { ...current, keys: Number.POSITIVE_INFINITY, phase: "hold" } : STILL));
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const element = target.current;
    let onScreen = true;
    const sync = () => setVisible(onScreen && document.visibilityState === "visible");
    // Entries arrive in order and several can be batched into one callback; the last one is the current state.
    const observer = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      sync();
    });
    if (element) observer.observe(element);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [target]);

  const { scheme, language } = PAIRS[state.pair];
  const schemeText = schemeWord(scheme);
  const languageText = LANGUAGES[language];
  const code = SCHEMES[scheme].code;
  const total = keyCount(schemeText, languageText, code);
  const keys = Math.min(state.keys, total);
  const running = motion && visible;

  useEffect(() => {
    if (!running) return;
    const next = (): [number, CycleState] | null => {
      if (state.phase === "type") return keys < total ? [TYPE_MS, { ...state, keys: keys + 1 }] : [0, { ...state, keys, phase: "hold" }];
      if (state.phase === "hold") return hovering || state.pinned ? null : [HOLD_MS, { ...state, keys, phase: "erase" }];
      return keys > 0 ? [ERASE_MS, { ...state, keys: keys - 1 }] : [NEXT_MS, { ...state, pair: (state.pair + 1) % PAIRS.length, keys: 0, phase: "type" }];
    };
    const step = next();
    if (!step) return;
    const timer = window.setTimeout(() => setState(step[1]), step[0]);
    return () => window.clearTimeout(timer);
  }, [running, hovering, state, keys, total]);

  const select = useCallback(
    (pair: number) => setState({ pair, keys: running ? 0 : Number.POSITIVE_INFINITY, phase: running ? "type" : "hold", pinned: true }),
    [running]
  );

  const schemeLength = [...schemeText].length;
  const typedScheme = Math.min(keys, schemeLength);
  const typedLanguage = Math.max(0, keys - schemeLength);
  return {
    pair: state.pair,
    scheme,
    language,
    schemeText: [...schemeText].slice(0, typedScheme).join(""),
    languageText: [...languageText].slice(0, typedLanguage).join(""),
    code: code.slice(0, keys),
    caret: running ? (keys <= schemeLength && state.phase !== "hold" ? "scheme" : "language") : null,
    select,
  };
}
