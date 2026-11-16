import { otherEditionSites } from "./edition-sites";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { LOCALES, localePath } from "../shared/locales";
import { PAGE_PATHS } from "../shared/site-seo";
import { MESSAGES } from "./i18n";
import { LocaleLink as Link } from "./locale-link";
import { THEME_CHOICES, useTheme, type ThemeChoice } from "./theme";
import { BackToTop, CloseIcon, DownloadIcon, GitHubIcon, LinkButton, LogoMark, MenuIcon, MonitorIcon, MoonIcon, SunIcon, cx } from "./ui";
import { useLocale } from "./use-locale";

type NavItem = { to: "/" | "/download/" | "/guide/" | "/faq/"; label: "home" | "download" | "guide" | "faq" };

const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "home" },
  { to: "/download/", label: "download" },
  { to: "/guide/", label: "guide" },
  { to: "/faq/", label: "faq" },
];

const FULL_PRODUCT = "https://msime.app/";
const MSIME_REPO = "https://github.com/metasequoiaime/msime";
// Same query Tailwind emits for the `lg:` variant (--breakpoint-lg in app.css): the four tabs fit the bar from 760px.
const DESKTOP_NAV_QUERY = "(width >= 47.5rem)";

/** Round 36px header control. No display utility here: each use adds its own, because two display utilities on one element resolve by stylesheet order, not class order. */
const roundControl = "h-9 min-w-9 items-center justify-center rounded-full text-ink shadow-ring-2 transition-colors hover:bg-panel-2 hover:text-ink";

const THEME_ICONS: Record<ThemeChoice, ReactNode> = { light: <SunIcon />, dark: <MoonIcon />, system: <MonitorIcon /> };

/** One button that steps through light, dark and system; its label names the current choice. */
function ThemeButton() {
  const { messages } = useLocale();
  const { theme, setTheme } = useTheme();
  const ref = useRef<HTMLButtonElement>(null);
  const label = `${messages.common.theme}: ${messages.common.themes[theme]}`;
  return (
    <button
      ref={ref}
      type="button"
      className={cx(roundControl, "inline-flex w-9")}
      title={label}
      aria-label={label}
      onClick={() => {
        const box = ref.current?.getBoundingClientRect();
        const next = THEME_CHOICES[(THEME_CHOICES.indexOf(theme) + 1) % THEME_CHOICES.length];
        setTheme(next, box && { x: box.left + box.width / 2, y: box.top + box.height / 2 });
      }}
    >
      {THEME_ICONS[theme]}
    </button>
  );
}

/** Links to the same page in the other language (its home page from an unknown address). A plain link: a full page load gives the visitor the other language's prerendered HTML and `<html lang>`. */
function LanguageSwitch() {
  const { locale, base: current, messages } = useLocale();
  const base = PAGE_PATHS.includes(current) ? current : "/";
  const others = LOCALES.filter((value) => value !== locale);
  return (
    <>
      {others.map((other) => (
        <a
          key={other}
          className={cx(roundControl, "inline-flex px-3 text-[13px] font-semibold whitespace-nowrap no-underline")}
          href={localePath(base, other)}
          hrefLang={MESSAGES[other].lang}
          lang={MESSAGES[other].lang}
          title={`${messages.common.language}: ${MESSAGES[other].languageName}`}
        >
          {MESSAGES[other].languageName}
        </a>
      ))}
    </>
  );
}

/** A 2px line under the header while a slow navigation is pending; quick ones never show it. */
function RouteProgress() {
  const isPending = useRouterState({ select: (state) => state.status === "pending" });
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    if (!isPending) {
      setIsVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setIsVisible(true), 150);
    return () => window.clearTimeout(timer);
  }, [isPending]);
  return <div className={`route-progress${isVisible ? " is-active" : ""}`} aria-hidden="true" />;
}

const isCurrent = (item: NavItem, base: string) => (item.to === "/" ? base === "/" : base.startsWith(item.to));

/** The pill group on screens from 760px. */
function DesktopNav() {
  const { messages, base } = useLocale();
  const listRef = useRef<HTMLUListElement>(null);
  const activeLinkRef = useRef<HTMLElement | null>(null);

  // The current tab's pill slides over from the previous tab; the offset is written before paint.
  // biome-ignore lint/correctness/useExhaustiveDependencies: base is the trigger, not an input of the effect body.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('.nav-link[aria-current="page"]');
    const previous = activeLinkRef.current;
    activeLinkRef.current = active;
    if (!active || !previous || previous === active) return;
    list.style.setProperty("--pill-from", `${previous.offsetLeft - active.offsetLeft}px`);
    list.classList.add("is-sliding");
  }, [base]);

  return (
    <nav aria-label={messages.common.siteNav} className="hidden min-w-0 flex-1 justify-center lg:flex">
      <ul className="nav-list" ref={listRef} onAnimationEnd={() => listRef.current?.classList.remove("is-sliding")}>
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="nav-link" activeOptions={{ exact: true, includeSearch: false }} activeProps={{}} aria-current={isCurrent(item, base) ? "page" : undefined}>
              {messages.common[item.label]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The menu panel below 760px. */
function MobileNav({ isOpen, onNavigate }: { isOpen: boolean; onNavigate: () => void }) {
  const { messages, base } = useLocale();
  return (
    <nav id="nav-menu" aria-label={messages.common.siteNav} hidden={!isOpen} className="px-[clamp(16px,3.6vw,40px)] pt-2 pb-[18px] shadow-divider-t lg:hidden">
      <ul className="m-0 mx-auto grid max-w-[1240px] list-none grid-cols-2 gap-1.5 p-0">
        {NAV_ITEMS.map((item) => {
          const current = isCurrent(item, base);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                activeOptions={{ exact: true, includeSearch: false }}
                activeProps={{}}
                aria-current={current ? "page" : undefined}
                onClick={onNavigate}
                className={cx(
                  "flex h-[46px] items-center rounded-field px-4 text-[15px] no-underline transition-colors",
                  current ? "bg-accent-soft font-semibold text-accent-ink hover:text-accent-ink" : "font-medium text-body hover:bg-hover hover:text-ink"
                )}
              >
                {messages.common[item.label]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Hides the header while scrolling down and brings it back on the way up; a shadow appears once the page has scrolled. Works on the DOM directly so scrolling never re-renders the shell. */
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
    const update = () => {
      ticking = false;
      const currentY = Math.max(0, window.scrollY);
      headerWrap.toggleAttribute("data-raised", pinnedRef.current || currentY > 8);
      const delta = currentY - lastScrollY;
      lastScrollY = currentY;
      const shouldHide = !pinnedRef.current && delta > 2 && currentY > 68;
      const shouldShow = pinnedRef.current || delta < -2 || currentY <= 68;
      if (shouldHide && !hidden) {
        headerWrap.classList.add("header--hidden");
        hidden = true;
      } else if (shouldShow && hidden) {
        headerWrap.classList.remove("header--hidden");
        hidden = false;
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

/** While the menu panel is open, Escape closes it and resizing to the desktop layout closes it too. */
function useMenuClose(isOpen: boolean, close: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.getElementById("btn-toggle");
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
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
  const { locale, messages } = useLocale();
  const { common, footer } = messages;
  return (
    <footer className="site-footer" inert={inert}>
      <div className="mx-auto max-w-[1240px] overflow-hidden rounded-shell bg-panel shadow-hair">
        <div className="grid grid-cols-2 gap-[clamp(28px,4vw,48px)] p-[clamp(28px,4vw,48px)] sm:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-full min-w-0 sm:col-span-1">
            <div className="flex items-center gap-2.5">
              <LogoMark size={36} />
              <span className="text-lg font-bold tracking-[.03em] text-ink">{common.productName}</span>
            </div>
            <p className="m-0 mt-3.5 max-w-[42ch] text-sm leading-[1.85] text-muted">{footer.tagline}</p>
          </div>

          <FooterColumn title={footer.pages}>
            {NAV_ITEMS.map((item) => (
              <Link key={item.to} className={footerLink} to={item.to}>
                {common[item.label]}
              </Link>
            ))}
          </FooterColumn>

          <FooterColumn title={footer.project}>
            <ExternalFooterLink href={FULL_PRODUCT}>{footer.fullProduct}</ExternalFooterLink>
            <ExternalFooterLink href="https://msime.app/feedback/">{footer.feedback}</ExternalFooterLink>
            <ExternalFooterLink href={`${MSIME_REPO}/issues`}>{footer.issues}</ExternalFooterLink>
            <ExternalFooterLink href={MSIME_REPO}>{footer.source}</ExternalFooterLink>
            <ExternalFooterLink href="https://msime.app/privacy/">{footer.privacy}</ExternalFooterLink>
            <ExternalFooterLink href="https://msime.app/terms/">{footer.terms}</ExternalFooterLink>
          </FooterColumn>

          <FooterColumn title={footer.family}>
            {otherEditionSites("japanese", locale !== "zh").map((site) => (
              <a key={site.url} className={footerLink} href={site.url}>{site.label}</a>
            ))}
          </FooterColumn>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-panel-2 px-[clamp(28px,4vw,48px)] py-[18px] text-[13px] text-muted">
          <span>
            Copyright © 2026-present{" "}
            <a href="https://github.com/fanlusky" target="_blank" rel="noreferrer">
              fanlusky
            </a>
          </span>
          <a className="ml-auto inline-flex items-center gap-1.5 text-muted hover:text-ink" href="https://github.com/metasequoiaime" target="_blank" rel="noreferrer">
            <GitHubIcon size={15} />
            metasequoiaime
          </a>
        </div>
      </div>
    </footer>
  );
}

/** Header, navigation and footer around the current route. `children` replaces the route outlet; the not-found page uses it so unmatched addresses still get the full chrome. */
export function SiteShell({ children }: { children?: ReactNode }) {
  const { messages } = useLocale();
  const { common } = messages;
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuIsOpen(false), []);

  useHeaderBehaviour(menuIsOpen);
  useMenuClose(menuIsOpen, closeMenu);

  return (
    <>
      <a className="skip-link" href="#site-content">
        {common.skipToContent}
      </a>

      <div className="header-wrap">
        <header className="mx-auto flex h-[68px] max-w-[calc(1240px+2*clamp(16px,3.6vw,40px))] items-center gap-3 px-[clamp(16px,3.6vw,40px)] sm:gap-4">
          <Link className="flex flex-none items-center gap-2.5 text-ink no-underline hover:text-ink" to="/" activeOptions={{ exact: true, includeSearch: false }} aria-label={common.homeLink}>
            <LogoMark size={34} ring />
            <span className="hidden text-[17px] font-bold tracking-[.03em] whitespace-nowrap xs:inline">{common.productName}</span>
          </Link>

          <DesktopNav />

          <div className="ml-auto flex flex-none items-center gap-1.5">
            <LanguageSwitch />
            <ThemeButton />
            <LinkButton to="/download/" size="pill" className="max-sm:hidden">
              <DownloadIcon size={16} />
              {common.download}
            </LinkButton>
            <button
              className={cx(roundControl, "inline-flex w-9 lg:hidden", menuIsOpen && "bg-panel-2")}
              id="btn-toggle"
              type="button"
              title={common.menu}
              aria-label={common.menu}
              aria-expanded={menuIsOpen}
              aria-controls="nav-menu"
              onClick={() => setMenuIsOpen((open) => !open)}
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
