import type { ReactNode } from "react";
import { cx } from "./cx";

const WIDTHS = {
  /** Home page and the header/footer: 1240px. */
  page: "max-w-page",
  /** Inner pages: 1200px. */
  inner: "max-w-inner",
  /** FAQ and release notes: 960px. */
  narrow: "max-w-narrow",
} as const;

type ContainerProps = {
  width?: keyof typeof WIDTHS;
  as?: "div" | "section" | "main" | "header" | "footer" | "nav";
  className?: string;
  id?: string;
  children?: ReactNode;
};

/** Centred column with the design's fluid side padding, clamp(20px, 4.4vw, 48px). */
export function Container({ width = "inner", as: Tag = "div", className, id, children }: ContainerProps) {
  return (
    <Tag id={id} className={cx("mx-auto w-full px-[clamp(20px,4.4vw,48px)]", WIDTHS[width], className)}>
      {children}
    </Tag>
  );
}
