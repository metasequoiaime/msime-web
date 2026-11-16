import { Outlet, useLocation, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { basePath, isPagePath, LOCALE_LANG, LOCALE_NAME, LOCALES, localePath, type Locale } from "../shared/locales";
import { MSIME_ORIGIN } from "../shared/site-seo";
import { LocaleLink as Link } from "./locale-link";
import { SEASON_CHOICES, SEASON_OPTIONS } from "./season";
import { THEME_CHOICES, useTheme, type RevealOrigin, type ThemeChoice } from "./theme";
import { BackToTop, CloseIcon, DownloadIcon, GitHubIcon, LinkButton, LogoMark, MenuIcon, MonitorIcon, MoonIcon, PaletteIcon, SeasonBackdrop, SunIcon, ToastProvider, cx } from "./ui";
import { useLocale } from "./use-locale";

type NavKey = "home" | "download" | "guide" | "faq";
const NAV_ITEMS: readonly { key: NavKey; to: "/" | "/download/" | "/guide/" | "/faq/" }[] = [
  { key: "home", to: "/" },
  { key: "download", to: "/download/" },
  { key: "guide", to: "/guide/" },
  { key: "faq", to: "/faq/" },
];

export const GITHUB_REPO = "https://github.com/metasequoiaime/msime";
export const GITHUB_ISSUES = `${GITHUB_REPO}/issues`;
export const FEEDBACK_URL = `${MSIME_ORIGIN}/feedback/`;

// Same query Tailwind emits for the `xl:` variant (--breakpoint-xl in app.css), so JS and CSS switch layouts at the same width.
const DESKTOP_NAV_QUERY = "(width >= 56.25rem)";

const isCurrent = (to: string, path: string) => (to === "/" ? path === "/" : path.startsWith(to));

/** Round 36px header control. No display utility here: each use adds its own. */
const roundControl = "h-9 min-w-9 items-center justify-center rounded-full text-ink shadow-ring-2 transition-colors hover:bg-panel-2 hover:text-ink";

/** Closes a header dropdown on Escape, on a pointer press outside it, or when keyboard focus moves out of it. */
function useDismiss(ref: RefObject<HTMLElement | null>, isOpen: boolean, close: (restoreFocus: boolean) => void) {
  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (!ref.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
    };
  }, [ref, isOpen, close]);
}

/** Moves focus between the popover's options with the arrow keys, as the menu role promises. */
const onMenuKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
  const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
  const backward = event.key === "ArrowUp" || event.key === "ArrowLeft";
  if (!forward && !backward && event.key !== "Home" && event.key !== "End") return;
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]'));
  const index = items.indexOf(document.activeElement as HTMLElement);
  const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : forward ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
  event.preventDefault();
  items[next]?.focus();
};

const buttonCenter = (button: HTMLElement | null): RevealOrigin | undefined => {
  const box = button?.getBoundingClientRect();
  return box && { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

const optionClass = (checked: boolean) =>
  cx(
    "flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-tab px-1 py-2 text-[13px] font-semibold no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
    checked ? "bg-accent-soft text-accent-ink shadow-ring-accent hover:text-accent-ink" : "text-body hover:bg-panel-2 hover:text-ink"
  );

function OptionGroup({ label, columns, children }: { label: string; columns: string; children: ReactNode }) {
  const labelId = useId();
  return (
    <div className="not-first:mt-2 not-first:pt-2 not-first:shadow-divider-t">
      <p id={labelId} className="m-0 px-1.5 pt-0.5 pb-1.5 text-xs font-semibold text-muted">
        {label}
      </p>
      <fieldset aria-labelledby={labelId} className={cx("m-0 grid min-w-0 gap-1 border-0 p-0", columns)}>
        {children}
      </fieldset>
    </div>
  );
}

function OptionButton({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={checked} data-checked={checked || undefined} onClick={onSelect} className={optionClass(checked)}>
      {children}
    </button>
  );
}

const THEME_ICONS: Record<ThemeChoice, ReactNode> = {
  light: <SunIcon />,
  dark: <MoonIcon />,
  system: <MonitorIcon />,
};

/** The language pair in the palette popover. The other language is a plain link to the same page (a full page load, since `<html lang>` and the static text change); the current one only closes the popover. */
function LanguageOptions({ onCurrent }: { onCurrent: () => void }) {
  const { locale } = useLocale();
  const path = useLocation({ select: (location) => location.pathname });
  const base = basePath(path);
  const target = (other: Locale) => localePath(other, isPagePath(base) ? base : "/");
  return LOCALES.map((option) =>
    option === locale ? (
      <OptionButton key={option} checked onSelect={onCurrent}>
        <span lang={LOCALE_LANG[option]}>{LOCALE_NAME[option]}</span>
      </OptionButton>
    ) : (
      <a key={option} role="menuitemradio" aria-checked={false} className={cx("header-language", optionClass(false))} lang={LOCALE_LANG[option]} hrefLang={LOCALE_LANG[option]} href={target(option)}>
        {LOCALE_NAME[option]}
      </a>
    )
  );
}

/** One round palette button: light/dark/system, the seasonal colours and the language switch in a single popover. */
function PaletteMenu({ isOpen, setOpen }: { isOpen: boolean; setOpen: (open: boolean) => void }) {
  const { messages } = useLocale();
  const text = messages.shell;
  const { theme, setTheme, season, setSeason } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(
    (restoreFocus: boolean) => {
      setOpen(false);
      if (restoreFocus) buttonRef.current?.focus();
    },
    [setOpen]
  );
  useDismiss(rootRef, isOpen, close);

  useEffect(() => {
    if (isOpen) rootRef.current?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]')?.focus();
  }, [isOpen]);

  return (
    <div className="relative" id="theme-switcher" ref={rootRef}>
      <button
        ref={buttonRef}
        className={cx(roundControl, "inline-flex w-9", isOpen && "bg-panel-2")}
        id="theme-button"
        type="button"
        title={text.appearance}
        aria-label={text.appearance}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? "theme-options" : undefined}
        onClick={() => setOpen(!isOpen)}
      >
        <PaletteIcon />
      </button>

      {isOpen && (
        <div
          id="theme-options"
          role="menu"
          aria-label={text.appearance}
          onKeyDown={onMenuKeyDown}
          className="absolute top-11 right-0 z-40 w-[300px] rounded-menu bg-panel p-2 shadow-card max-sm:fixed max-sm:inset-x-3 max-sm:top-[62px] max-sm:w-auto"
        >
          <OptionGroup label={text.theme} columns="grid-cols-3">
            {THEME_CHOICES.map((choice) => (
              <OptionButton key={choice} checked={theme === choice} onSelect={() => setTheme(choice, buttonCenter(buttonRef.current))}>
                <span className="flex size-4 items-center justify-center" aria-hidden="true">
                  {THEME_ICONS[choice]}
                </span>
                {text.themes[choice]}
              </OptionButton>
            ))}
          </OptionGroup>

          <OptionGroup label={text.season} columns="grid-cols-5">
            {SEASON_CHOICES.map((choice) => (
              <OptionButton key={choice} checked={season === choice} onSelect={() => setSeason(choice, buttonCenter(buttonRef.current))}>
                <span className="size-4 flex-none rounded-full shadow-hair" style={{ background: SEASON_OPTIONS[choice].dot }} aria-hidden="true" />
                <span title={choice === "auto" ? text.seasonAuto : undefined}>{text.seasons[choice]}</span>
              </OptionButton>
            ))}
          </OptionGroup>

          <OptionGroup label={text.language} columns="grid-cols-2">
            <LanguageOptions onCurrent={() => close(true)} />
          </OptionGroup>
        </div>
      )}
    </div>
  );
}

/** A thin progress line under the header, shown only when a page change takes long enough to notice. */
function RouteProgress() {
  const isPending = useRouterState({ select: (state) => state.status === "pending" });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setIsVisible(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, 150);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isPending]);

  return <div className={`route-progress${isVisible ? " is-active" : ""}`} aria-hidden="true" />;
}

/** Desktop pill group (≥900px). */
function DesktopNav() {
  const { messages } = useLocale();
  const path = useLocation({ select: (location) => basePath(location.pathname) });
  const listRef = useRef<HTMLUListElement>(null);
  const activeLinkRef = useRef<HTMLElement | null>(null);

  // The current tab's pill slides over from the previous page's tab. The offset has to be written before the browser paints, or the pill shows at the end first and jumps back.
  // biome-ignore lint/correctness/useExhaustiveDependencies: path is the trigger, not an input: after a page change, measure the old and new tab.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('.nav-link[aria-current="page"]');
    const previous = activeLinkRef.current;
    activeLinkRef.current = active;
    if (!active || !previous || previous === active) return;
    list.style.setProperty("--pill-from", `${previous.offsetLeft - active.offsetLeft}px`);
    list.classList.add("is-sliding");
  }, [path]);

  return (
    <nav aria-label={messages.shell.navLabel} className="hidden min-w-0 flex-1 justify-center xl:flex">
      <ul className="nav-list" ref={listRef} onAnimationEnd={() => listRef.current?.classList.remove("is-sliding")}>
        {NAV_ITEMS.map((item) => (
          <li key={item.key}>
            <Link to={item.to} className="nav-link" activeOptions={{ exact: true, includeSearch: false }} activeProps={{}} aria-current={isCurrent(item.to, path) ? "page" : undefined}>
              {messages.shell.nav[item.key]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The menu panel below 900px. */
function MobileNav({ isOpen, onNavigate }: { isOpen: boolean; onNavigate: () => void }) {
  const { messages } = useLocale();
  const path = useLocation({ select: (location) => basePath(location.pathname) });

  return (
    <nav id="nav-menu" aria-label={messages.shell.navLabel} hidden={!isOpen} className="px-[clamp(16px,3.6vw,40px)] pt-2 pb-[18px] shadow-divider-t xl:hidden">
      <ul className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-1.5">
        {NAV_ITEMS.map((item) => {
          const current = isCurrent(item.to, path);
          return (
            <li key={item.key}>
              <Link
                to={item.to}
                activeOptions={{ exact: true, includeSearch: false }}
                activeProps={{}}
                aria-current={current ? "page" : undefined}
                onClick={onNavigate}
                className={cx(
                  "flex h-[46px] items-center rounded-field px-4 text-[15px] transition-colors",
                  current ? "bg-accent-soft font-semibold text-accent-ink hover:text-accent-ink" : "font-medium text-body hover:bg-hover hover:text-ink"
                )}
              >
                {messages.shell.nav[item.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Hides the header while scrolling down and shows it again on scrolling up or near the top; past 8px, or while a menu is open, it carries a shadow.
 *
 * Works on the DOM directly, so scrolling never re-renders the shell.
 */
function useHeaderBehaviour(pinned: boolean) {
  const pinnedRef = useRef(pinned);
  pinnedRef.current = pinned;

  useEffect(() => {
    const headerWrap = document.querySelector<HTMLElement>(".header-wrap");
    if (!headerWrap) return;
    headerWrap.toggleAttribute("data-raised", pinned || window.scrollY > 8);
    if (pinned) headerWrap.classList.remove("header--hidden");
  }, [pinned]);

  useEffect(() => {
    const headerWrap = document.querySelector<HTMLElement>(".header-wrap");
    if (!headerWrap) return;
    let lastScrollY = Math.max(0, window.scrollY);
    let ticking = false;
    let hidden = false;

    const updateHeader = () => {
      ticking = false;
      const currentY = Math.max(0, window.scrollY);
      headerWrap.toggleAttribute("data-raised", pinnedRef.current || currentY > 8);
      if (pinnedRef.current) {
        if (hidden) {
          headerWrap.classList.remove("header--hidden");
          hidden = false;
        }
        lastScrollY = currentY;
        return;
      }
      const delta = currentY - lastScrollY;
      if (delta > 2 && currentY > 68 && !hidden) {
        headerWrap.classList.add("header--hidden");
        hidden = true;
      } else if ((delta < -2 || currentY <= 68) && hidden) {
        headerWrap.classList.remove("header--hidden");
        hidden = false;
      }
      lastScrollY = currentY;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateHeader);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
}

/** While the menu panel is open, Tab cycles inside the header and Escape closes the panel; resizing to the desktop layout closes it too. */
function useMenuFocus(isOpen: boolean, close: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const header = document.querySelector<HTMLElement>(".header-wrap");
    const opener = document.getElementById("btn-toggle");
    (header?.querySelector<HTMLElement>('#nav-menu [aria-current="page"]') ?? header?.querySelector<HTMLElement>("#nav-menu a[href]"))?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (header?.querySelector('[role="menu"]')) return;
        event.preventDefault();
        close();
        opener?.focus();
        return;
      }
      if (event.key !== "Tab" || !header) return;
      const items = Array.from(header.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")).filter((element) => element.offsetParent !== null);
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const desktop = window.matchMedia(DESKTOP_NAV_QUERY);
    const onResize = () => {
      if (desktop.matches) close();
    };
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
    };
  }, [isOpen, close]);
}

const footerLink = "w-max max-w-full text-sm text-muted no-underline transition-colors hover:text-accent-ink";

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="m-0 mb-3.5 text-[13px] font-semibold text-ink">{title}</p>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function ExternalFooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className={footerLink} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function SiteFooter({ inert }: { inert: boolean }) {
  const { messages } = useLocale();
  const text = messages.shell;
  return (
    <footer className="site-footer" inert={inert}>
      <div className="mx-auto max-w-[1240px] overflow-hidden rounded-shell bg-panel shadow-hair">
        <div className="grid grid-cols-2 gap-[clamp(28px,4vw,48px)] p-[clamp(28px,4vw,48px)] sm:grid-cols-3 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-full min-w-0 xl:col-span-1">
            <div className="flex items-center gap-2.5">
              <LogoMark size={36} />
              <span className="text-lg font-bold tracking-[.03em] text-ink">水杉越南语</span>
            </div>
            <p className="m-0 mt-3.5 text-sm leading-[1.85] text-muted">{text.footer.tagline}</p>
          </div>

          <FooterColumn title={text.footer.product}>
            {NAV_ITEMS.map((item) => (
              <Link key={item.key} className={footerLink} to={item.to}>
                {text.nav[item.key]}
              </Link>
            ))}
          </FooterColumn>

          <FooterColumn title={text.footer.support}>
            <ExternalFooterLink href={FEEDBACK_URL}>{text.footer.feedback}</ExternalFooterLink>
            <ExternalFooterLink href={GITHUB_ISSUES}>{text.footer.issues}</ExternalFooterLink>
          </FooterColumn>

          <FooterColumn title={text.footer.project}>
            <ExternalFooterLink href={`${MSIME_ORIGIN}/`}>{text.footer.fullApp}</ExternalFooterLink>
            <ExternalFooterLink href={GITHUB_REPO}>{text.footer.source}</ExternalFooterLink>
            <ExternalFooterLink href={`${MSIME_ORIGIN}/privacy/`}>{text.footer.privacy}</ExternalFooterLink>
            <ExternalFooterLink href={`${MSIME_ORIGIN}/terms/`}>{text.footer.terms}</ExternalFooterLink>
          </FooterColumn>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-panel-2 px-[clamp(28px,4vw,48px)] py-[18px] text-[13px] text-muted">
          <span>
            Copyright © 2026-present{" "}
            <a href="https://github.com/fanlusky" target="_blank" rel="noreferrer">
              fanlusky
            </a>
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
            <a className="inline-flex items-center gap-1.5 text-muted hover:text-ink" href={GITHUB_REPO} target="_blank" rel="noreferrer">
              <GitHubIcon size={15} />
              GitHub
            </a>
            <a className="text-muted hover:text-ink" href={`${MSIME_ORIGIN}/`} target="_blank" rel="noreferrer">
              msime.app
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

/** Header, nav, footer and the global overlays around the current route. `children` replaces the route outlet; the not-found page uses it so unmatched addresses still get the full chrome. */
export function SiteShell({ children }: { children?: ReactNode }) {
  return (
    <ToastProvider>
      <Shell>{children}</Shell>
    </ToastProvider>
  );
}

function Shell({ children }: { children?: ReactNode }) {
  const { messages } = useLocale();
  const text = messages.shell;
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [paletteIsOpen, setPaletteIsOpen] = useState(false);
  const closeMenu = useCallback(() => {
    setMenuIsOpen(false);
  }, []);

  useHeaderBehaviour(menuIsOpen || paletteIsOpen);
  useMenuFocus(menuIsOpen, closeMenu);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuIsOpen);
    return () => {
      document.body.classList.remove("menu-open");
    };
  }, [menuIsOpen]);

  return (
    <>
      <a className="skip-link" href="#site-content">
        {text.skip}
      </a>

      <SeasonBackdrop />

      <div className="header-wrap">
        <header className="mx-auto flex h-[68px] max-w-[calc(1240px+2*clamp(16px,3.6vw,40px))] items-center gap-3 px-[clamp(16px,3.6vw,40px)] sm:gap-4">
          <Link className="flex flex-none items-center gap-2.5 text-ink no-underline hover:text-ink" to="/" activeOptions={{ exact: true, includeSearch: false }} aria-label={text.homeLabel}>
            <LogoMark size={34} ring />
            <span className="text-[17px] font-bold tracking-[.03em] whitespace-nowrap" lang="zh-CN">
              水杉越南语
            </span>
          </Link>

          <DesktopNav />

          <div className="ml-auto flex flex-none items-center gap-1.5">
            <PaletteMenu isOpen={paletteIsOpen} setOpen={setPaletteIsOpen} />
            <LinkButton to="/download/" size="pill">
              <DownloadIcon size={16} />
              <span className="max-xs:sr-only">{text.download}</span>
            </LinkButton>
            <button
              className={cx(roundControl, "inline-flex w-9 xl:hidden", menuIsOpen && "bg-panel-2")}
              id="btn-toggle"
              type="button"
              title={menuIsOpen ? text.closeMenu : text.openMenu}
              aria-label={menuIsOpen ? text.closeMenu : text.openMenu}
              aria-expanded={menuIsOpen}
              aria-controls="nav-menu"
              onClick={() => {
                setMenuIsOpen((open) => !open);
              }}
            >
              {menuIsOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </header>

        <MobileNav isOpen={menuIsOpen} onNavigate={closeMenu} />
      </div>

      <RouteProgress />

      <div id="site-content" className="focus:outline-none" tabIndex={-1} inert={menuIsOpen}>
        {children ?? <Outlet />}
      </div>

      <SiteFooter inert={menuIsOpen} />
      <BackToTop />
    </>
  );
}
