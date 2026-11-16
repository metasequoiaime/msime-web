import type { ReactNode } from "react";
import { cx } from "./cx";

/** The hero's pill with a leading dot ("开源中文输入法 · GPL-3.0"). */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex h-8 items-center gap-2 rounded-full bg-accent-soft px-3.5 text-[13.5px] font-medium text-accent-ink", className)}>
      <span className="size-1.5 flex-none rounded-full bg-accent" aria-hidden="true" />
      {children}
    </span>
  );
}

const PILL_TONES = {
  accent: "bg-accent-soft text-accent-ink",
  warn: "bg-warn-soft text-warn",
  neutral: "bg-panel-2 text-muted",
} as const;

/** Small label: platform tags, "预发布", counts. `mono` switches to the code font used for tags and versions. */
export function Pill({ children, tone = "accent", mono = false, className }: { children: ReactNode; tone?: keyof typeof PILL_TONES; mono?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap", mono && "font-mono", PILL_TONES[tone], className)}>
      {children}
    </span>
  );
}

/** Rounded chip for secondary links and contacts (footer Telegram / QQ / 邮箱). Renders the classes only; use it on an `<a>` or `<button>`. */
export const chipClass = (className?: string) =>
  cx("inline-flex h-8 items-center rounded-full bg-panel-2 px-3 text-[13px] text-ink no-underline transition-colors hover:text-accent-ink", className);
