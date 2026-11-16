import { useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { basePath, localeOf, localePath } from "../shared/locales";
import { MESSAGES } from "./i18n";

/** The locale chosen by the route prefix, its messages, and `href` that turns a base path (`/download/`) into this locale's address. External URLs pass through unchanged. */
export function useLocale() {
  const path = useLocation({ select: (value) => value.pathname });
  return useMemo(() => {
    const locale = localeOf(path);
    return {
      locale,
      messages: MESSAGES[locale],
      path,
      base: basePath(path),
      href: (url: string) => (url.startsWith("/") && !url.startsWith("//") ? localePath(url, locale) : url),
    };
  }, [path]);
}
