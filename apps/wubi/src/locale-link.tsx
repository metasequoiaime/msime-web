import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { useLocale } from "./i18n";

/** The router's Link with `to` given as a base path; the current locale's prefix is added. */
function LocaleLinkComponent(props: ComponentProps<typeof Link>) {
  const { href } = useLocale();
  return <Link {...props} to={props.to ? (href(props.to) as typeof props.to) : props.to} />;
}

export const LocaleLink = LocaleLinkComponent as typeof Link;
