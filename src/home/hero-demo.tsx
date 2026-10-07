import { useEffect, useRef } from "react";
import { useLocale } from "../use-locale";
import { cx } from "../ui";
import { CANDIDATE_ROWS, type HeroFrame, LANGUAGES, PAIRS, SCHEMES } from "./hero-cycle";

/**
 * The hero illustration: a candidate window that follows the headline. The composition line types the current scheme's code for 水杉, and the gloss column switches with the headline's language.
 *
 * It is a plain card on the page background with no motion of its own; only the typing inside it animates, driven by `useHeroCycle` in the hero. The dots jump to a pair and double as the cycle indicator.
 *
 * Pausing (WCAG 2.2.2): the pointer over the card, or keyboard focus anywhere in the demo, holds the cycle once the current pair is typed. The card itself has nothing focusable, so focus is tracked on the wrapper that also holds the dots, and the two sources are tracked separately so the pointer leaving the card does not resume the cycle while a dot still has focus. Activating a dot is a persistent stop: the chosen pair is typed and stays until the page is left, so a keyboard user who tabs away does not restart the motion.
 */
export function HeroDemo({ frame, onHover }: { frame: HeroFrame; onHover: (hovering: boolean) => void }) {
  const { t } = useLocale();
  const scheme = SCHEMES[frame.scheme];
  // Like a real IME the candidates are up once the first keys are in; before that the window only shows the composition.
  const composing = frame.code.length < 2;
  const wrapper = useRef<HTMLDivElement>(null);
  const pointer = useRef(false);
  const focus = useRef(false);
  const report = () => onHover(pointer.current || focus.current);

  // Native focusin/focusout: the wrapper is layout, not a control, so it gets no role, and React focus props on a role-less element trip the static-interaction lint.
  // biome-ignore lint/correctness/useExhaustiveDependencies: onHover is a state setter; report only reads refs.
  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const enter = () => {
      focus.current = true;
      report();
    };
    const leave = (event: FocusEvent) => {
      // Moving between dots keeps focus inside; only leaving the demo resumes the cycle.
      if (element.contains(event.relatedTarget as Node | null)) return;
      focus.current = false;
      report();
    };
    element.addEventListener("focusin", enter);
    element.addEventListener("focusout", leave);
    return () => {
      element.removeEventListener("focusin", enter);
      element.removeEventListener("focusout", leave);
    };
  }, []);

  return (
    <div ref={wrapper} className="rise-enter min-w-0 [--enter-delay:.15s]">
      <figure
        className="m-0 mx-auto w-full max-w-[400px] overflow-hidden rounded-tile bg-panel shadow-card [--row:clamp(34px,2.8vw,40px)]"
        aria-label={t("输入演示：键入编码后，候选窗在每个候选旁显示译文")}
        onPointerEnter={() => {
          pointer.current = true;
          report();
        }}
        onPointerLeave={() => {
          pointer.current = false;
          report();
        }}
      >
        <div className="flex min-h-[clamp(36px,3vw,40px)] items-center gap-2 px-[clamp(12px,1.2vw,16px)] py-1.5 shadow-divider-b">
          <span className="min-w-0 text-[clamp(14px,1.2vw,15px)] text-ink">
            {frame.code}
            <span className="ml-px inline-block h-[1.2em] w-[1.5px] bg-accent align-[-0.25em]" aria-hidden="true" />
          </span>
          <span className="ml-auto flex-none rounded-tab bg-accent-soft px-2 py-0.5 text-[clamp(12px,1vw,13px)] text-accent-ink">{t(scheme.label)}</span>
        </div>

        <ol
          className={cx("m-0 list-none p-1.5 transition-opacity duration-200", composing && "opacity-0")}
          // A full page's worth of height whatever the scheme offers, so the card never changes size mid-cycle. --row scales with the viewport so the card holds its own next to the headline.
          style={{ minHeight: `calc(${CANDIDATE_ROWS} * var(--row) + 12px)` }}
          aria-hidden={composing || undefined}
        >
          {/* Laid out like the settings app's candidate preview: one regular-weight face throughout, a smaller muted number, and the gloss right after the word. */}
          {scheme.candidates.map((candidate, index) => (
            <li
              key={candidate.word}
              className={cx("flex h-(--row) items-center gap-2 rounded-row px-[clamp(8px,0.8vw,10px)]", index === 0 && "bg-accent-soft")}
            >
              <span className="w-3 flex-none text-[clamp(12px,1vw,13px)] text-muted">{index + 1}</span>
              <span className="flex-none text-[clamp(15px,1.3vw,17px)] text-ink">{t(candidate.word)}</span>
              <span className="min-w-0 truncate text-[clamp(12px,1.1vw,14px)] text-muted">{candidate.gloss[frame.language]}</span>
            </li>
          ))}
        </ol>
      </figure>

      <div className="mt-4 flex justify-center gap-1.5">
        {PAIRS.map((pair, index) => (
          <button
            key={`${pair.scheme}-${pair.language}`}
            type="button"
            className={cx(
              "relative h-1.5 cursor-pointer rounded-[3px] border-0 p-0 transition-[width,background-color] duration-300 after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']",
              index === frame.pair ? "w-[22px] bg-accent" : "w-1.5 bg-hair-2 hover:bg-muted"
            )}
            aria-label={t(`示例 ${index + 1}：${SCHEMES[pair.scheme].label} · ${LANGUAGES[pair.language]}`)}
            aria-pressed={index === frame.pair}
            onClick={() => frame.select(index)}
          />
        ))}
      </div>
    </div>
  );
}
