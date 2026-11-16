import { useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { LOCALE_LANG, localeHref, localeOf, type Locale } from "../shared/locales";
import { MESSAGES, type Messages } from "./i18n";

export type LocaleContext = {
  locale: Locale;
  /** `<html lang>` value: `vi` or `zh-CN`. */
  lang: string;
  messages: Messages;
  /** Prefixes an internal page path with the current locale (`/guide/` → `/zh/guide/` on Chinese pages). */
  href: (path: string) => string;
};

/** The locale comes from the route prefix: `/zh/...` is Chinese, everything else Vietnamese. */
export function useLocale(): LocaleContext {
  const path = useLocation({ select: (location) => location.pathname });
  return useMemo(() => {
    const locale = localeOf(path);
    return { locale, lang: LOCALE_LANG[locale], messages: MESSAGES[locale], href: (url: string) => localeHref(url, locale) };
  }, [path]);
}
