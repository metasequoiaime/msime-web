import type { ReactNode } from "react";
import { cx } from "./cx";

type SectionHeadingProps = {
  /** Small accent line above the title (14px / 600). */
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** Heading level; pages have exactly one h1, so sections default to h2. */
  as?: "h2" | "h3";
  align?: "start" | "center";
  /** Optional action rendered on the right on wide screens (e.g. "前往下载页 →"). */
  action?: ReactNode;
  id?: string;
  className?: string;
};

/** Home-page section heading: eyebrow, h2 at clamp(28px, 3.4vw, 42px), optional lead and action. */
export function SectionHeading({ eyebrow, title, lead, as: Tag = "h2", align = "start", action, id, className }: SectionHeadingProps) {
  const text = (
    <div className={cx("min-w-0", align === "center" && "mx-auto text-center")}>
      {eyebrow && <p className="m-0 text-sm font-semibold text-accent-ink">{eyebrow}</p>}
      <Tag id={id} className={cx("m-0 font-heading text-[clamp(28px,3.4vw,42px)] leading-[1.3] font-bold text-ink [word-break:keep-all] [overflow-wrap:anywhere]", Boolean(eyebrow) && "mt-3")}>
        {title}
      </Tag>
      {lead && <p className="m-0 mt-3 text-base leading-[1.8] text-muted">{lead}</p>}
    </div>
  );
  if (!action) return <div className={className}>{text}</div>;
  return (
    <div className={cx("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      {text}
      <div className="flex-none">{action}</div>
    </div>
  );
}
