import { useLocation } from '@tanstack/react-router';
import { useMemo } from 'react';
import { isTraditional, localeHref } from '../shared/locales';
import { toTraditional } from '../shared/translate';
export function useLocale() {
  const path = useLocation({ select: value => value.pathname });
  return useMemo(() => ({
    tw: isTraditional(path),
    path,
    href: (url: string) => localeHref(url, path),
    t: <T,>(value: T): T => (isTraditional(path) && typeof value === 'string' ? toTraditional(value) : value) as T,
  }), [path]);
}
