import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { readSeasonChoice, resolveSeason, SEASON_STORAGE_KEY, type Season, type SeasonChoice } from "./season";

export const THEME_CHOICES = ["light", "dark", "system"] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number];

export const THEME_LABELS: Record<ThemeChoice, string> = {
  light: "亮色",
  dark: "暗色",
  system: "跟随系统",
};

const STORAGE_KEY = "msime-theme";
const LIGHT_QUERY = "(prefers-color-scheme: light)";

const isThemeChoice = (value: unknown): value is ThemeChoice =>
  typeof value === "string" && (THEME_CHOICES as readonly string[]).includes(value);

/** The inline bootstrap in each HTML head already wrote `data-theme` before first paint, so read it back rather than storage: it is the value the document is actually rendering with. */
const readInitialTheme = (): ThemeChoice => {
  if (typeof window === "undefined") return "system";
  const applied = document.documentElement.dataset.theme;
  if (isThemeChoice(applied)) return applied;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemeChoice(stored) ? stored : "system";
  } catch {
    return "system";
  }
};

const prefersLight = () => typeof window !== "undefined" && window.matchMedia(LIGHT_QUERY).matches;

const resolveIsLight = (theme: ThemeChoice, systemIsLight: boolean) =>
  theme === "light" ? true : theme === "dark" ? false : systemIsLight;

/** 圆形擦除的圆心，用视口坐标。传的是刚点下的那个按钮的中心。 */
export type RevealOrigin = { x: number; y: number };

type ThemeContextValue = {
  theme: ThemeChoice;
  /** 当前实际渲染的是不是亮色。跟随系统时随系统设置变化，主题图标和 hero 演示媒体都按它选。 */
  isLight: boolean;
  setTheme: (theme: ThemeChoice, origin?: RevealOrigin) => void;
  /** The stored season preference; "auto" follows the month. */
  season: SeasonChoice;
  /** The season actually rendered (what `html[data-season]` holds). */
  resolvedSeason: Season;
  setSeason: (season: SeasonChoice, origin?: RevealOrigin) => void;
};

/** 圆心到视口四角的最远距离，擦除圆长到这个半径才能盖满整屏 */
const radiusToFarthestCorner = ({ x, y }: RevealOrigin) =>
  Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

/**
 * Applies a palette change, wiping it open from `origin` when the browser supports view transitions and the user has not asked for reduced motion. Theme and season share this: both repaint the whole page.
 *
 * `update` must commit synchronously (it runs inside flushSync): startViewTransition snapshots the new DOM as soon as its callback returns, and React's default batching would push the update past that point, so the "new" snapshot would still show the old colours.
 */
const applyWithReveal = (update: () => void, origin?: RevealOrigin) => {
  const root = document.documentElement;
  const canReveal =
    origin !== undefined &&
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!canReveal) {
    update();
    return;
  }

  root.style.setProperty("--theme-origin-x", `${origin.x}px`);
  root.style.setProperty("--theme-origin-y", `${origin.y}px`);
  root.style.setProperty("--theme-radius", `${radiusToFarthestCorner(origin)}px`);
  root.classList.add("theme-transition");

  const transition = document.startViewTransition(() => {
    flushSync(update);
  });

  void transition.finished
    .catch(() => {})
    .finally(() => {
      root.classList.remove("theme-transition");
    });
};

const store = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The choice still applies for this session when storage is unavailable.
  }
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Match the static snapshot during hydration, then apply the bootstrapped preference before paint.
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);
  const [theme, setThemeState] = useState<ThemeChoice>(readInitialTheme);
  const [systemIsLight, setSystemIsLight] = useState(prefersLight);
  // Season preference lives only in storage (the document holds the resolved season), so it is read after mount; the server and the hydration pass both render "auto".
  const [season, setSeasonState] = useState<SeasonChoice>("auto");
  const [resolvedSeason, setResolvedSeason] = useState<Season>("summer");

  useEffect(() => {
    const query = window.matchMedia(LIGHT_QUERY);
    const sync = () => {
      setSystemIsLight(query.matches);
    };

    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme =
      theme === "light" ? "light" : theme === "dark" ? "dark" : "light dark";

    // preload 只是给 dev 兜底：那时样式由脚本注入，得先把整页遮住。React 把首屏提交进 DOM 之后再放开，这一帧就已经是带样式的内容了。
    document.documentElement.classList.remove("preload");
  }, [theme]);

  useLayoutEffect(() => {
    const choice = readSeasonChoice();
    setSeasonState(choice);
    const resolved = resolveSeason(choice, new Date());
    document.documentElement.dataset.season = resolved;
    setResolvedSeason(resolved);
  }, []);

  const setTheme = useCallback((next: ThemeChoice, origin?: RevealOrigin) => {
    store(STORAGE_KEY, next);
    applyWithReveal(() => {
      setThemeState(next);
    }, origin);
  }, []);

  const setSeason = useCallback((next: SeasonChoice, origin?: RevealOrigin) => {
    store(SEASON_STORAGE_KEY, next);
    const resolved = resolveSeason(next, new Date());
    applyWithReveal(() => {
      // The attribute is what the tokens key off, so it changes inside the transition callback together with the state.
      document.documentElement.dataset.season = resolved;
      setSeasonState(next);
      setResolvedSeason(resolved);
    }, origin);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: mounted ? theme : "system",
      isLight: mounted ? resolveIsLight(theme, systemIsLight) : false,
      setTheme,
      season,
      resolvedSeason,
      setSeason,
    }),
    [mounted, theme, systemIsLight, setTheme, season, resolvedSeason, setSeason]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
};
