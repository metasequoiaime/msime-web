import { useEffect, useState } from "react";
import { useLocale } from "../use-locale";
import { ArrowUpIcon } from "./icons";
import { cx } from "./cx";

/** Round button in the bottom-right corner, shown after scrolling past 700px (design-home §3.3). */
export function BackToTop() {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(window.scrollY > 700);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <button
      type="button"
      title={t("回到顶部")}
      aria-label={t("回到顶部")}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }}
      className={cx(
        "fixed right-[clamp(16px,3vw,32px)] bottom-[clamp(16px,3vw,32px)] z-50 grid size-[46px] place-items-center rounded-full bg-panel text-ink shadow-card transition-[opacity,translate,color] duration-[250ms] hover:text-accent-ink",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <ArrowUpIcon />
    </button>
  );
}
