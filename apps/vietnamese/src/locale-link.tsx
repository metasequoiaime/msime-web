import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { useLocale } from "./use-locale";

/** The router link with the locale prefix applied to `to`. */
function LocaleLinkComponent(props: ComponentProps<typeof Link>) {
  const { href } = useLocale();
  return <Link {...props} to={props.to ? (href(props.to) as typeof props.to) : props.to} />;
}

export const LocaleLink = LocaleLinkComponent as typeof Link;
