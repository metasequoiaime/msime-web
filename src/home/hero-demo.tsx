import { useEffect, useState } from "react";
import { useLocale } from "../use-locale";
import { Grove, LogoMark, cx, type GroveTree } from "../ui";

/** The rotating examples of the hero's note window (design `EX`): the pinyin being typed and the first page of candidates, each with its gloss. */
const EXAMPLES = [
  { code: "da'zi", candidates: [["打字", "type · typing"], ["大字", "large print"], ["搭子", "buddy · partner"]] },
  { code: "fan'yi", candidates: [["翻译", "translate"], ["反义", "opposite meaning"], ["翻译器", "translator"]] },
  { code: "kai'yuan", candidates: [["开源", "open source"], ["开元", "Kaiyuan era"], ["开园", "park opening"]] },
  { code: "shui'shan", candidates: [["水杉", "dawn redwood"], ["水衫", "water shirt"], ["睡衫", "nightshirt"]] },
] as const;

/** Per keystroke while the pinyin is typed out, and how long a finished example stays up. Together they keep the design's 3.2 s cycle. */
const TYPE_MS = 75;
const HOLD_MS = 2600;

/** The hero grove (viewBox 0 0 600 220), far row faint and near row solid. */
const FAR_TREES: GroveTree[] = [[10, 118, 0.6], [90, 101, 0.7], [250, 110, 0.65], [400, 101, 0.7], [530, 118, 0.6]];
const MID_TREES: GroveTree[] = [[-10, 50, 1], [160, 67, 0.9], [330, 33, 1.1], [480, 58, 0.95]];
const NEAR_TREES: GroveTree[] = [[40, -4, 1.3], [520, 12, 1.2]];

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * The hero illustration: a note window where a pinyin code is typed and the vertical candidate window offers translated candidates.
 *
 * The server renders the first example fully typed, so the prerendered page shows a finished candidate list. After hydration the examples rotate, each code typed out key by key; rotation pauses while the pointer or focus is inside and stays off under reduced motion, where the dots still switch examples.
 */
export function HeroDemo() {
  const { t } = useLocale();
  const [step, setStep] = useState({ index: 0, typed: EXAMPLES[0].code.length });
  const [animate, setAnimate] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION);
    const sync = () => setAnimate(!query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const code = EXAMPLES[step.index].code;
    if (step.typed < code.length) {
      const timer = window.setTimeout(() => setStep((current) => ({ ...current, typed: current.typed + 1 })), TYPE_MS);
      return () => window.clearTimeout(timer);
    }
    if (!animate || paused) return;
    const timer = window.setTimeout(() => setStep({ index: (step.index + 1) % EXAMPLES.length, typed: 0 }), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [step, animate, paused]);

  const example = EXAMPLES[step.index];
  const code = example.code.slice(0, step.typed);
  // Like a real IME, the candidate list is already there for a partial code (kai'y → 开源); it only waits for the first syllable's opening letters.
  const composing = step.typed < Math.min(2, example.code.length);

  const pick = (index: number) => setStep({ index, typed: animate ? 0 : EXAMPLES[index].code.length });

  return (
    <div className="rise-enter relative min-w-0 overflow-hidden rounded-hero bg-[linear-gradient(165deg,var(--hero-a)_0%,var(--hero-b)_55%,var(--hero-c)_100%)] px-[clamp(20px,3vw,40px)] pt-[clamp(28px,4vw,52px)] pb-[clamp(96px,11vw,150px)] transition-[background] duration-600 [--enter-delay:.15s]">
      <div className="pointer-events-none absolute top-[6%] right-[8%] size-[120px] rounded-full bg-[radial-gradient(circle,var(--sun)_0,transparent_70%)]" aria-hidden="true" />
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 w-full" viewBox="0 0 600 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <Grove trees={FAR_TREES} opacity={0.22} />
        <Grove trees={MID_TREES} opacity={0.45} />
        <Grove trees={NEAR_TREES} />
      </svg>

      <figure
        className="relative m-0 w-full animate-float-y overflow-hidden rounded-tile bg-panel shadow-card"
        aria-label={t("输入演示：键入拼音后，候选窗在每个候选旁显示译文")}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
        }}
      >
        <div className="flex items-center gap-2 px-3.5 py-2.5 shadow-divider-b">
          <LogoMark size={18} ring />
          <span className="text-[12.5px] text-muted">{t("便签")}</span>
          <span className="ml-auto flex gap-1.5" aria-hidden="true">
            <span className="size-[9px] rounded-full bg-hair-2" />
            <span className="size-[9px] rounded-full bg-hair-2" />
          </span>
        </div>

        <div className="bg-panel px-[clamp(20px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-[18px]">
          <p className="m-0 text-[clamp(16px,1.5vw,18px)] leading-[1.9] text-ink">
            {t("周末去江汉油田看水杉，顺便 ")}
            <span className="font-mono text-[.92em] text-accent-ink shadow-[inset_0_-2px_0_var(--accent)]">{code}</span>
            <span className="ml-0.5 inline-block h-[1.05em] w-0.5 bg-accent align-[-3px]" aria-hidden="true" />
          </p>

          <div className="mt-2.5 ml-[clamp(0px,4vw,80px)] w-[min(calc(100%-clamp(0px,4vw,80px)),320px)] overflow-hidden rounded-field bg-panel shadow-[0_12px_32px_rgba(15,36,25,.16),0_0_0_1px_var(--hair-2)]">
            <div className="min-h-[35px] px-3.5 py-2 font-mono text-[12.5px] text-muted shadow-divider-b">{code}</div>
            <ol className={cx("m-0 list-none p-[5px] transition-opacity duration-200", composing && "opacity-0")} aria-hidden={composing || undefined}>
              {example.candidates.map(([word, gloss], index) => (
                <li
                  key={`${example.code}-${word}`}
                  className={cx("flex items-baseline gap-2.5 rounded-row px-2.5 py-2", index === 0 && "bg-accent-soft")}
                >
                  <span className={cx("font-mono text-[11.5px]", index === 0 ? "text-accent-ink" : "text-muted")}>{index + 1}</span>
                  <span className={cx("text-[16.5px]", index === 0 ? "font-bold text-accent-ink" : "text-ink")}>{t(word)}</span>
                  <span className={cx("ml-auto min-w-0 truncate text-[12.5px]", index === 0 ? "text-body" : "text-muted")}>{gloss}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-[22px] flex items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {EXAMPLES.map((item, index) => (
                <button
                  key={item.code}
                  type="button"
                  className={cx(
                    "relative h-1.5 cursor-pointer rounded-[3px] border-0 p-0 transition-[width,background-color] duration-300 after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']",
                    index === step.index ? "w-[22px] bg-accent" : "w-1.5 bg-hair-2 hover:bg-muted"
                  )}
                  aria-label={t(`示例 ${index + 1}：${item.code}`)}
                  aria-pressed={index === step.index}
                  onClick={() => pick(index)}
                />
              ))}
            </div>
            <div className="flex h-[34px] items-center gap-3 rounded-tab bg-panel pr-3 pl-1.5 text-sm text-ink shadow-hair-2" aria-hidden="true">
              <LogoMark size={24} ring />
              <span>{t("中")}</span>
              <span>。</span>
              <span>{t("半")}</span>
            </div>
          </div>
        </div>
      </figure>
    </div>
  );
}
