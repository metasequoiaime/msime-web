import { cx } from "./cx";

/** The logo sits on a near-black disc in both themes (design: header 34/24, footer 36/26, CTA 72/52, demo window 18/13 and 24/17). */
export function LogoMark({ size = 34, className, ring = false }: { size?: number; className?: string; ring?: boolean }) {
  const image = Math.round(size * 0.72);
  return (
    <span
      className={cx("grid flex-none place-items-center rounded-full bg-logo", ring && "shadow-logo", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img className="block" src="/msime-logo.png" width={image} height={image} decoding="async" alt="" />
    </span>
  );
}
