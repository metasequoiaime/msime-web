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
        className="m-0 mx-auto w-full max-w-[420px] overflow-hidden rounded-tile bg-panel shadow-card"
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
        <div className="flex min-h-[48px] items-center gap-3 px-[18px] py-3 shadow-divider-b">
          <span className="min-w-0 font-mono text-[15px] text-accent-ink">
            <span className="shadow-[inset_0_-2px_0_var(--accent)]">{frame.code}</span>
            <span className="ml-0.5 inline-block h-[1.1em] w-0.5 bg-accent align-[-3px]" aria-hidden="true" />
          </span>
          <span className="ml-auto flex-none rounded-tab bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent-ink">{t(scheme.label)}</span>
        </div>

        <ol
          className={cx("m-0 list-none p-1.5 transition-opacity duration-200", composing && "opacity-0")}
          // Three rows' worth of height whatever the scheme offers, so the card never changes size mid-cycle.
          style={{ minHeight: `calc(${CANDIDATE_ROWS} * 46px + 12px)` }}
          aria-hidden={composing || undefined}
        >
          {scheme.candidates.map((candidate, index) => (
            <li
              key={candidate.word}
              className={cx("flex h-[46px] items-center gap-3 rounded-row px-3", index === 0 && "bg-accent-soft")}
            >
              <span className={cx("w-3 flex-none font-mono text-[12px]", index === 0 ? "text-accent-ink" : "text-muted")}>{index + 1}</span>
              <span className={cx("flex-none text-[18px]", index === 0 ? "font-bold text-accent-ink" : "text-ink")}>{t(candidate.word)}</span>
              <span className={cx("ml-auto min-w-0 truncate text-[13.5px]", index === 0 ? "text-body" : "text-muted")}>
                {candidate.gloss[frame.language]}
              </span>
            </li>
          ))}
        </ol>
      </figure>

      <div className="mt-5 flex justify-center gap-1.5">
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
