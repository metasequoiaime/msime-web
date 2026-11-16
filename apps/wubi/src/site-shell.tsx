import { Outlet, useLocation, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { basePath } from "../shared/site-seo";
import { useLocale, type Messages } from "./i18n";
import { LocaleLink as Link } from "./locale-link";
import { THEME_CHOICES, useTheme, type RevealOrigin, type ThemeChoice } from "./theme";
import { BackToTop, CloseIcon, DownloadIcon, GitHubIcon, LinkButton, LogoMark, MenuIcon, MonitorIcon, MoonIcon, PaletteIcon, SeasonBackdrop, SunIcon, ToastProvider, cx } from "./ui";

type NavKey = keyof Messages["shell"]["nav"];

const NAV_ITEMS: readonly { to: "/" | "/download/" | "/guide/" | "/faq/"; key: NavKey }[] = [
  { to: "/", key: "home" },
  { to: "/download/", key: "download" },
  { to: "/guide/", key: "guide" },
  { to: "/faq/", key: "faq" },
];

const FULL_SITE = "https://msime.app";
const REPOSITORY = "https://github.com/metasequoiaime/msime";
// Same query Tailwind emits for the `lg:` variant (--breakpoint-lg in app.css), where the pill nav replaces the menu button.
const DESKTOP_NAV_QUERY = "(width >= 47.5rem)";

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

/** The round palette button: light/dark/system in one popover (this site has one palette, so there is no seasonal choice). It stays open while options are picked; Escape closes it and returns focus to the button. */
function PaletteMenu({ isOpen, setOpen }: { isOpen: boolean; setOpen: (open: boolean) => void }) {
  const { messages } = useLocale();
  const shell = messages.shell;
  const { theme, setTheme } = useTheme();
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
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        className={cx(roundControl, "inline-flex w-9", isOpen && "bg-panel-2")}
        type="button"
        title={shell.appearance}
        aria-label={shell.appearance}
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
          aria-label={shell.appearance}
          onKeyDown={onMenuKeyDown}
          className="absolute top-11 right-0 z-40 w-[300px] rounded-menu bg-panel p-2 shadow-card max-sm:fixed max-sm:inset-x-3 max-sm:top-[62px] max-sm:w-auto"
        >
          <OptionGroup label={shell.theme} columns="grid-cols-3">
            {THEME_CHOICES.map((choice) => (
              <OptionButton key={choice} checked={theme === choice} onSelect={() => setTheme(choice, buttonCenter(buttonRef.current))}>
                <span className="flex size-4 items-center justify-center" aria-hidden="true">
                  {THEME_ICONS[choice]}
                </span>
                {shell.themes[choice]}
              </OptionButton>
            ))}
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

const isCurrent = (to: string, path: string) => (to === "/" ? path === "/" : path.startsWith(to));

/** Desktop pill group (≥760px). The current pill slides from the previous tab's position. */
function DesktopNav() {
  const { messages } = useLocale();
  const path = useLocation({ select: (location) => basePath(location.pathname) });
  const listRef = useRef<HTMLUListElement>(null);
  const activeLinkRef = useRef<HTMLElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: path is the trigger, not an input: the offsets are measured after the page changes.
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
    <nav aria-label={messages.shell.navLabel} className="hidden min-w-0 flex-1 justify-center lg:flex">
      <ul className="nav-list" ref={listRef} onAnimationEnd={() => listRef.current?.classList.remove("is-sliding")}>
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="nav-link" activeOptions={{ exact: true, includeSearch: false }} activeProps={{}} aria-current={isCurrent(item.to, path) ? "page" : undefined}>
              {messages.shell.nav[item.key]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The menu panel below 760px. */
function MobileNav({ isOpen, onNavigate }: { isOpen: boolean; onNavigate: () => void }) {
  const { messages } = useLocale();
  const path = useLocation({ select: (location) => basePath(location.pathname) });

  return (
    <nav id="nav-menu" aria-label={messages.shell.navLabel} hidden={!isOpen} className="px-[clamp(16px,3.6vw,40px)] pt-2 pb-[18px] shadow-divider-t lg:hidden">
      <ul className="mx-auto grid max-w-[1240px] grid-cols-2 gap-1.5">
        {NAV_ITEMS.map((item) => {
          const current = isCurrent(item.to, path);
          return (
            <li key={item.to}>
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

/** Hides the header while scrolling down and shows it again on the way up; adds a shadow once the page has scrolled or a menu is open. Works on the DOM directly so scrolling never re-renders the shell. */
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

/** While the menu panel is open, Escape closes it; resizing to the desktop layout closes it too. */
function useMenuFocus(isOpen: boolean, close: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.getElementById("btn-toggle");
    document.querySelector<HTMLElement>('#nav-menu [aria-current="page"], #nav-menu a[href]')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector('.header-wrap [role="menu"]')) return;
      event.preventDefault();
      close();
      opener?.focus();
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
  const { shell } = messages;
  return (
    <footer className="site-footer" inert={inert}>
      <div className="mx-auto max-w-[1240px] overflow-hidden rounded-shell bg-panel shadow-hair">
        <div className="grid grid-cols-2 gap-[clamp(28px,4vw,48px)] p-[clamp(28px,4vw,48px)] lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
          <div className="col-span-full min-w-0 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <LogoMark size={36} />
              <span className="text-lg font-bold tracking-[.03em] text-ink">{shell.siteName}</span>
            </div>
            <p className="m-0 mt-3.5 max-w-[46ch] text-sm leading-[1.85] text-muted">{shell.footer.about}</p>
          </div>

          <FooterColumn title={shell.footer.edition}>
            {NAV_ITEMS.map((item) => (
              <Link key={item.to} className={footerLink} to={item.to}>
                {shell.nav[item.key]}
              </Link>
            ))}
          </FooterColumn>

          <FooterColumn title={shell.footer.project}>
            <ExternalFooterLink href={`${FULL_SITE}/`}>{shell.footer.fullSite}</ExternalFooterLink>
            <ExternalFooterLink href={`${FULL_SITE}/download/`}>{shell.footer.fullDownload}</ExternalFooterLink>
            <ExternalFooterLink href={`${FULL_SITE}/feedback/`}>{shell.footer.feedback}</ExternalFooterLink>
            <ExternalFooterLink href={`${REPOSITORY}/issues`}>{shell.footer.issues}</ExternalFooterLink>
            <ExternalFooterLink href={REPOSITORY}>{shell.footer.source}</ExternalFooterLink>
          </FooterColumn>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-panel-2 px-[clamp(28px,4vw,48px)] py-[18px] text-[13px] text-muted">
          <span>
            Copyright © 2026-present{" "}
            <a href="https://github.com/fanlusky" target="_blank" rel="noreferrer">
              fanlusky
            </a>
          </span>
          <span className="ml-auto flex flex-wrap gap-x-4 gap-y-2">
            <a className="text-muted hover:text-ink" href={`${FULL_SITE}/privacy/`} target="_blank" rel="noreferrer">
              {shell.footer.privacy}
            </a>
            <a className="text-muted hover:text-ink" href={`${FULL_SITE}/terms/`} target="_blank" rel="noreferrer">
              {shell.footer.terms}
            </a>
            <a className="inline-flex items-center gap-1.5 text-muted hover:text-ink" href="https://github.com/metasequoiaime" target="_blank" rel="noreferrer">
              <GitHubIcon size={14} />
              GitHub
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
  const { shell } = messages;
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
        {shell.skipToContent}
      </a>

      <SeasonBackdrop />

      <div className="header-wrap">
        <header className="mx-auto flex h-[68px] max-w-[calc(1240px+2*clamp(16px,3.6vw,40px))] items-center gap-3 px-[clamp(16px,3.6vw,40px)] sm:gap-4">
          <Link className="flex flex-none items-center gap-2.5 text-ink no-underline hover:text-ink" to="/" activeOptions={{ exact: true, includeSearch: false }} aria-label={shell.homeLabel}>
            <LogoMark size={34} ring />
            <span className="text-[17px] font-bold tracking-[.03em] whitespace-nowrap">{shell.siteName}</span>
          </Link>

          <DesktopNav />

          <div className="ml-auto flex flex-none items-center gap-1.5">
            <PaletteMenu isOpen={paletteIsOpen} setOpen={setPaletteIsOpen} />
            <LinkButton to="/download/" size="pill">
              <DownloadIcon size={16} />
              {shell.download}
            </LinkButton>
            <button
              className={cx(roundControl, "inline-flex w-9 lg:hidden", menuIsOpen && "bg-panel-2")}
              id="btn-toggle"
              type="button"
              title={shell.menu}
              aria-label={menuIsOpen ? shell.menuClose : shell.menuOpen}
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
