import { useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { LOCALE_INFO, localeOf, localePath, type Locale } from "../../shared/site-seo.ts";
import { zh } from "./zh.ts";

/** Every locale module exports this shape; the primary locale's module is the reference. */
export type Messages = typeof zh;

const MESSAGES: Record<Locale, Messages> = { "zh-CN": zh };

export const messagesFor = (locale: Locale) => MESSAGES[locale];

/** Locale of the current route (from its prefix), its messages, and `href` to turn a base path into this locale's path. */
export function useLocale() {
  const path = useLocation({ select: (location) => location.pathname });
  return useMemo(() => {
    const locale = localeOf(path);
    return { locale, lang: LOCALE_INFO[locale].lang, messages: MESSAGES[locale], href: (base: string) => localePath(locale, base) };
  }, [path]);
}
