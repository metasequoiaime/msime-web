import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, Ref } from "react";
import { useLocale } from "../use-locale";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost";
export type ButtonSize = "lg" | "md" | "sm";

const VARIANTS: Record<ButtonVariant, string> = {
  /** Filled with the season's button colour. */
  primary: "bg-btn text-btn-fg hover:text-btn-fg hover:-translate-y-px hover:brightness-[1.06]",
  /** Panel with a hairline ring. */
  secondary: "bg-panel text-ink shadow-ring-2 hover:bg-panel-2 hover:text-ink",
  /** Tinted accent, for secondary actions inside sections ("前往下载页 →"). */
  soft: "bg-accent-soft text-accent-ink hover:bg-accent-ring hover:text-accent-ink",
  /** Transparent with a ring, for dense rows of actions. */
  ghost: "bg-transparent text-ink shadow-ring-2 hover:bg-panel-2 hover:text-ink",
};

const SIZES: Record<ButtonSize, string> = {
  lg: "h-[52px] px-7 rounded-btn text-base font-semibold gap-2.5",
  md: "h-[46px] px-[22px] rounded-btn text-[15px] font-semibold gap-2",
  sm: "h-9 px-3.5 rounded-tab text-sm font-semibold gap-1.5",
};

/** Class string for any element that should look like a button (useful for `<summary>` or third-party links). */
export const buttonClass = ({ variant = "primary", size = "md", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) =>
  cx(
    "inline-flex select-none items-center justify-center whitespace-nowrap no-underline transition-[background-color,color,transform,filter,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
    VARIANTS[variant],
    SIZES[size],
    className
  );

type Look = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & Look) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}

function ButtonAnchor({ variant, size, className, ref, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & Look & { ref?: Ref<HTMLAnchorElement> }) {
  return <a ref={ref} className={buttonClass({ variant, size, className })} {...props} />;
}

const RouterButtonAnchor = createLink(ButtonAnchor);

function LinkButtonComponent(props: ComponentProps<typeof RouterButtonAnchor>) {
  const { href } = useLocale();
  return <RouterButtonAnchor {...props} to={props.to ? (href(props.to) as typeof props.to) : props.to} />;
}

/** Internal navigation styled as a button, with the router's typed `to` / `params` / `search`. Like LocaleLink, it prefixes `/zh-TW` on Traditional pages. */
export const LinkButton = LinkButtonComponent as typeof RouterButtonAnchor;

/** External link styled as a button. Opens in a new tab unless `target` says otherwise. */
export function AnchorButton({ variant, size, className, target = "_blank", rel = "noreferrer", ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & Look) {
  return <a className={buttonClass({ variant, size, className })} target={target} rel={rel} {...props} />;
}
