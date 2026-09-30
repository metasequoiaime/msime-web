import type { HTMLAttributes } from "react";
import { cx } from "./cx";

const TONES = {
  /** White panel with a hairline outline (feature cards, platform cards). */
  plain: "bg-panel shadow-hair",
  /** Panel lifted with the theme shadow (community cards, form cards, search card). */
  raised: "bg-panel shadow-card",
  /** Tinted secondary surface (sidebars, "还没找到答案" card uses accent instead). */
  muted: "bg-panel-2",
  /** Accent-tinted call-out. */
  accent: "bg-accent-soft",
} as const;

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article" | "aside" | "li";
  tone?: keyof typeof TONES;
};

/** Surface block. Radius defaults to 24px (`rounded-card`); pass `rounded-panel`, `rounded-tile`… via className for the design's other card sizes — the default is omitted when className already sets a `rounded-*` class. */
export function Card({ as: Tag = "div", tone = "plain", className, ...props }: CardProps) {
  const hasRadius = className?.split(/\s+/).some((name) => name.startsWith("rounded-"));
  return <Tag className={cx(TONES[tone], !hasRadius && "rounded-card", className)} {...props} />;
}
