import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Light, dark or follow the system. The inline script in index.html writes `data-theme` (and the month's `data-season`, which the colour tokens key off) before first paint; this provider only takes over the theme choice after hydration. The season is not user-selectable on this site.
 */
export const THEME_CHOICES = ["light", "dark", "system"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

const STORAGE_KEY = "msime-theme";

const isThemeChoice = (value: unknown): value is ThemeChoice => typeof value === "string" && (THEME_CHOICES as readonly string[]).includes(value);

const readInitialTheme = (): ThemeChoice => {
  if (typeof window === "undefined") return "system";
  const applied = document.documentElement.dataset.theme;
  return isThemeChoice(applied) ? applied : "system";
};

type ThemeContextValue = { theme: ThemeChoice; setTheme: (theme: ThemeChoice) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Match the static snapshot during hydration, then show the bootstrapped preference.
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);
  const [theme, setThemeState] = useState<ThemeChoice>(readInitialTheme);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme === "light" ? "light" : theme === "dark" ? "dark" : "light dark";
    // `preload` hides #root in dev until the styles are injected; the first commit is styled.
    root.classList.remove("preload");
  }, [theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still applies for this visit when storage is unavailable.
    }
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ theme: mounted ? theme : "system", setTheme }), [mounted, theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
};
