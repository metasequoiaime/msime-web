import { useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { localeOf, localizedPath, type Locale } from "../shared/locales";
import { bo } from "./i18n/bo";
import type { Messages } from "./i18n/types";
import { zh } from "./i18n/zh";

const MESSAGES: Record<Locale, Messages> = { bo, zh };

/** The locale comes from the route prefix: Tibetan at the root, Chinese under /zh/. `href` turns a Tibetan page path into the current locale's path. */
export function useLocale() {
  const path = useLocation({ select: location => location.pathname });
  return useMemo(() => {
    const locale = localeOf(path);
    return { locale, path, messages: MESSAGES[locale], href: (page: string) => localizedPath(page, locale) };
  }, [path]);
}
