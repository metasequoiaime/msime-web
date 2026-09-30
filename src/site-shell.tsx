import { useSearchReady } from "./use-page-search";
import { LocaleLink as Link } from "./locale-link";
import { useLocale } from "./use-locale";
import { baseLocalePath, traditionalPages, traditionalPath, isTraditional } from "../shared/locales";
import { Outlet, useLocation, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { THEME_CHOICES, THEME_LABELS, useTheme, type RevealOrigin, type ThemeChoice } from "./theme";
import { SEASON_CHOICES, SEASON_NAMES, SEASON_OPTIONS, seasonForMonth } from "./season";
import { BackToTop, CheckIcon, CloseIcon, GitHubIcon, LogoMark, MenuIcon, MonitorIcon, MoonIcon, SeasonBackdrop, SunIcon, ToastProvider, chipClass, copyText, cx, useToast } from "./ui";

/** Wide screens show these as a pill group in the header; below 1180px they move into the menu panel. 常见问题 is reached from the docs toolbar and the footer, 价格 from the footer. */
const NAV_ITEMS = [
  { to: "/", label: "首页" },
  { to: "/features/", label: "功能" },
  { to: "/docs/$guide/", label: "文档" },
  { to: "/download/", label: "下载" },
  { to: "/releases/", label: "更新日志" },
  { to: "/feedback/", label: "问题与建议" },
  { to: "/words/", label: "词库共建" },
  { to: "/code/", label: "开源代码" },
  { to: "/about/", label: "关于" },
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

const ORG_URL = "https://github.com/metasequoiaime";
const DESKTOP_NAV_QUERY = "(min-width: 1180px)";
const QQ_GROUP = "829919142";

/** The docs tab also covers the FAQ, which lives under the docs toolbar in the design. */
const isCurrent = (item: NavItem, path: string) =>
  item.to === "/" ? path === "/" : item.to === "/docs/$guide/" ? path.startsWith("/docs/") || path === "/faq/" : path.startsWith(item.to);

const linkParams = (item: NavItem) => (item.to === "/docs/$guide/" ? { guide: "windows" } : {});

/** Round 36px header control. No display utility here: each use adds its own (`inline-flex`, or `hidden sm:inline-flex`), because two display utilities on one element resolve by stylesheet order, not class order. */
const roundControl = "h-9 min-w-9 items-center justify-center rounded-full text-ink shadow-ring-2 transition-colors hover:bg-panel-2 hover:text-ink";

/** Closes a header dropdown on Escape or on a pointer press outside it. */
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
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, isOpen, close]);
}

/** Moves focus between menu items with the arrow keys, as the menu role promises. */
const onMenuKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]'));
  const index = items.indexOf(document.activeElement as HTMLElement);
  const next =
    event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
  event.preventDefault();
  items[next]?.focus();
};

const buttonCenter = (button: HTMLElement | null): RevealOrigin | undefined => {
  const box = button?.getBoundingClientRect();
  return box && { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

function MenuPanel({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div
      id={id}
      role="menu"
      aria-label={label}
      onKeyDown={onMenuKeyDown}
      className="absolute top-11 right-0 z-40 w-[220px] rounded-menu bg-panel p-1.5 shadow-card"
    >
      {children}
    </div>
  );
}

function MenuItem({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      data-checked={checked || undefined}
      onClick={onSelect}
      className={cx("flex w-full items-center gap-2.5 rounded-tab px-3 py-2.5 text-left transition-colors", checked ? "bg-accent-soft" : "hover:bg-panel-2")}
    >
      {children}
      <span className="ml-auto flex w-4 flex-none justify-center text-accent-ink">{checked && <CheckIcon size={14} />}</span>
    </button>
  );
}

function SeasonSwitcher({ isOpen, setOpen }: { isOpen: boolean; setOpen: (open: boolean) => void }) {
  const { t } = useLocale();
  const { season, setSeason } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, [setOpen]);
  useDismiss(rootRef, isOpen, close);

  useEffect(() => {
    if (isOpen) rootRef.current?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]')?.focus();
  }, [isOpen]);

  const monthSeason = SEASON_NAMES[seasonForMonth(new Date().getMonth() + 1)];

  return (
    <div className="relative" data-season-menu ref={rootRef}>
      <button
        ref={buttonRef}
        id="season-button"
        type="button"
        title={t("切换季节皮肤")}
        aria-label={t("切换季节皮肤")}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? "season-options" : undefined}
        onClick={() => setOpen(!isOpen)}
        className={cx(roundControl, "inline-flex gap-1.5 pr-3 pl-2.5 text-sm")}
      >
        <span className="size-2.5 flex-none rounded-full bg-accent shadow-[0_0_0_3px_var(--accent-soft)]" aria-hidden="true" />
        {/* The label follows html[data-season] through CSS, so the static HTML and the hydrated page always agree with the colours on screen. */}
        <span aria-hidden="true">
          <span className="hidden spring:inline">{t(SEASON_NAMES.spring)}</span>
          <span className="hidden summer:inline">{t(SEASON_NAMES.summer)}</span>
          <span className="hidden autumn:inline">{t(SEASON_NAMES.autumn)}</span>
          <span className="hidden winter:inline">{t(SEASON_NAMES.winter)}</span>
        </span>
      </button>

      {isOpen && (
        <MenuPanel id="season-options" label={t("季节皮肤")}>
          {SEASON_CHOICES.map((choice) => {
            const option = SEASON_OPTIONS[choice];
            return (
              <MenuItem
                key={choice}
                checked={season === choice}
                onSelect={() => {
                  close(true);
                  setSeason(choice, buttonCenter(buttonRef.current));
                }}
              >
                <span className="size-3.5 flex-none rounded-full" style={{ background: option.dot }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-ink">{t(option.name)}</span>
                  <span className="mt-px block text-xs text-muted">{t(choice === "auto" ? `${option.sub} · 当前${monthSeason}` : option.sub)}</span>
                </span>
              </MenuItem>
            );
          })}
        </MenuPanel>
      )}
    </div>
  );
}

const THEME_ICONS: Record<ThemeChoice, ReactNode> = {
  light: <SunIcon />,
  dark: <MoonIcon />,
  system: <MonitorIcon />,
};

function ThemeSwitcher({ isOpen, setOpen }: { isOpen: boolean; setOpen: (open: boolean) => void }) {
  const { t } = useLocale();
  const { theme, setTheme } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, [setOpen]);
  useDismiss(rootRef, isOpen, close);

  useEffect(() => {
    if (isOpen) rootRef.current?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]')?.focus();
  }, [isOpen]);

  return (
    <div className="relative" id="theme-switcher" ref={rootRef}>
      <button
        ref={buttonRef}
        className={cx(roundControl, "inline-flex w-9")}
        id="theme-button"
        type="button"
        title={t("切换深浅色")}
        aria-label={t("切换深浅色")}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? "theme-options" : undefined}
        onClick={() => setOpen(!isOpen)}
      >
        {/* As in the design: a moon while light, a sun while dark. Chosen by CSS from html[data-theme], so it is right from the first paint. */}
        <MoonIcon className="dark:hidden" />
        <SunIcon className="hidden dark:block" />
      </button>

      {isOpen && (
        <MenuPanel id="theme-options" label={t("主题模式")}>
          {THEME_CHOICES.map((choice) => (
            <MenuItem
              key={choice}
              checked={theme === choice}
              onSelect={() => {
                // 关菜单要排在换主题前面：setTheme 里的 flushSync 会把这之前排队的更新一起冲掉，菜单才不会留在擦除后的新画面里。
                close(true);
                // 擦除从主题按钮的中心铺开，而不是从被点的那个菜单项 —— 按钮才是这个控件在页面上的位置
                setTheme(choice, buttonCenter(buttonRef.current));
              }}
            >
              <span className="flex size-3.5 flex-none items-center justify-center text-muted" aria-hidden="true">
                {THEME_ICONS[choice]}
              </span>
              <span className="text-[14.5px] font-semibold text-ink">{t(THEME_LABELS[choice])}</span>
            </MenuItem>
          ))}
        </MenuPanel>
      )}
    </div>
  );
}

/**
 * 顶栏下沿的换页进度线。
 *
 * 路由预取通常让换页在一两帧内完成，那种时候不该闪一下进度条；只有等待长到看得出来才显示。这段时间里旧内容一直留在原地 —— 比清空成骨架屏更不容易让人以为点击没生效。
 */
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

/** Desktop pill group (≥1180px). */
function DesktopNav() {
  const { t } = useLocale();
  const path = useLocation({ select: (location) => baseLocalePath(location.pathname) });
  const listRef = useRef<HTMLUListElement>(null);
  const activeLinkRef = useRef<HTMLElement | null>(null);

  // 当前 tab 的胶囊从上一页的位置滑过来。偏移要在浏览器画这一帧之前写好，否则胶囊会先出现在终点再跳回起点。
  // biome-ignore lint/correctness/useExhaustiveDependencies: path 不在函数体里用，它是触发条件 —— 换页之后才去量新旧两个标签的位置差
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
    <nav aria-label={t("站点导航")} className="hidden min-w-0 flex-1 justify-center nav:flex">
      <ul
        className="nav-list"
        ref={listRef}
        // 动画挂在活动链接的 ::before 上，事件从伪元素冒泡到链接再到这里。跑完就摘掉 is-sliding，下次换页才能重新触发。
        onAnimationEnd={() => listRef.current?.classList.remove("is-sliding")}
      >
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <Link to={item.to} params={linkParams(item)} className="nav-link" activeOptions={{ exact: true, includeSearch: false }} activeProps={{}} aria-current={isCurrent(item, path) ? "page" : undefined}>
              {t(item.label)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The menu panel below 1180px: a grid of large targets that opens under the header (design-home §3.1). */
function MobileNav({ isOpen, onNavigate }: { isOpen: boolean; onNavigate: () => void }) {
  const { t } = useLocale();
  const path = useLocation({ select: (location) => baseLocalePath(location.pathname) });

  return (
    <nav id="nav-menu" aria-label={t("站点导航")} hidden={!isOpen} className="px-[clamp(16px,3.6vw,40px)] pt-2 pb-[18px] shadow-divider-t nav:hidden">
      <ul className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-1.5">
        {NAV_ITEMS.map((item) => {
          const current = isCurrent(item, path);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                params={linkParams(item)}
                activeOptions={{ exact: true, includeSearch: false }}
                activeProps={{}}
                aria-current={current ? "page" : undefined}
                onClick={onNavigate}
                className={cx(
                  "flex h-[46px] items-center rounded-field px-4 text-[15px] transition-colors",
                  current ? "bg-accent-soft font-semibold text-accent-ink hover:text-accent-ink" : "font-medium text-body hover:bg-hover hover:text-ink"
                )}
              >
                {t(item.label)}
              </Link>
            </li>
          );
        })}
        <li className="sm:hidden">
          <a href={ORG_URL} target="_blank" rel="noreferrer" className="flex h-[46px] items-center gap-2 rounded-field bg-panel-2 px-4 text-[15px] text-muted transition-colors hover:text-ink">
            <GitHubIcon size={16} />
            GitHub
          </a>
        </li>
      </ul>
    </nav>
  );
}

/**
 * 向下滚动时收起顶栏，向上滚或回到顶部时放出来；滚过 8px 或菜单展开时顶栏带一道阴影。
 *
 * Works on the DOM directly (class and attribute), so scrolling never re-renders the shell. React owns neither `header--hidden` nor `data-raised`, so its renders leave them alone.
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

      // 菜单打开时保持顶栏可见
      if (pinnedRef.current) {
        if (hidden) {
          headerWrap.classList.remove("header--hidden");
          hidden = false;
        }
        lastScrollY = currentY;
        return;
      }

      const delta = currentY - lastScrollY;
      const shouldHide = delta > 2 && currentY > 68;
      const shouldShow = delta < -2 || currentY <= 68;

      if (shouldHide && !hidden) {
        headerWrap.classList.add("header--hidden");
        hidden = true;
      } else if (shouldShow && hidden) {
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
        // A header dropdown handles its own Escape first.
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

function LanguageToggle() {
  const languagePath = useLocation({ select: (value) => value.pathname });
  const languageSearch = useLocation({ select: (value) => value.searchStr });
  const searchReady = useSearchReady();
  const tw = isTraditional(languagePath);
  const base = baseLocalePath(languagePath);
  const target = tw ? (base === "/docs/" ? "/docs/windows/" : base) : traditionalPath(base in traditionalPages ? base : "/");
  return (
    <a
      className="header-language"
      lang={tw ? "zh-Hans" : "zh-Hant-TW"}
      hrefLang={tw ? "zh-Hans" : "zh-Hant-TW"}
      href={target + (searchReady ? languageSearch : "")}
      aria-label={tw ? "切換到簡體中文" : "切换到繁体中文"}
      title={tw ? "切換到簡體中文" : "切换到繁体中文"}
    >
      {tw ? "简" : "繁"}
    </a>
  );
}

const footerLink = "w-max max-w-full text-sm text-muted no-underline transition-colors hover:text-accent-ink";

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useLocale();
  return (
    <div>
      <p className="m-0 mb-3.5 text-[13px] font-semibold text-ink">{t(title)}</p>
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
  const { t } = useLocale();
  const { show } = useToast();
  return (
    <footer className="site-footer" inert={inert}>
      <div className="mx-auto max-w-[1240px] overflow-hidden rounded-shell bg-panel shadow-hair">
        <div className="grid grid-cols-2 gap-[clamp(28px,4vw,48px)] p-[clamp(28px,4vw,48px)] sm:grid-cols-3 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-full min-w-0 xl:col-span-1">
            <div className="flex items-center gap-2.5">
              <LogoMark size={36} />
              <span className="text-lg font-bold tracking-[.03em] text-ink">{t("水杉输入法")}</span>
            </div>
            <p className="m-0 mt-3.5 text-sm leading-[1.85] text-muted">{t("开源多平台中文输入法，覆盖 Windows、macOS、Linux、Android、iOS 与 HarmonyOS，各平台原生实现。")}</p>
            <div className="mt-[18px] flex flex-wrap gap-2">
              <a className={chipClass()} href="https://t.me/msimegroup" target="_blank" rel="noreferrer">Telegram</a>
              <button
                type="button"
                className={chipClass()}
                title={t("点击复制群号")}
                onClick={async () => {
                  show(t((await copyText(QQ_GROUP)) ? `已复制 QQ 群号 ${QQ_GROUP}` : `QQ 群号：${QQ_GROUP}`));
                }}
              >
                {t(`QQ 群 ${QQ_GROUP}`)}
              </button>
              <a className={chipClass()} href="mailto:metasequoiaime@gmail.com">{t("邮箱")}</a>
            </div>
          </div>

          <FooterColumn title="产品">
            <Link className={footerLink} to="/download/">{t("下载")}</Link>
            <Link className={footerLink} to="/releases/">{t("更新日志")}</Link>
            <Link className={footerLink} to="/docs/$guide/" params={{ guide: "windows" }}>{t("使用指南")}</Link>
            <Link className={footerLink} to="/faq/">{t("常见问题")}</Link>
            <Link className={footerLink} to="/price/">{t("价格")}</Link>
          </FooterColumn>

          <FooterColumn title="参与">
            <Link className={footerLink} to="/feedback/">{t("问题与建议")}</Link>
            <Link className={footerLink} to="/words/">{t("词库共建")}</Link>
            <ExternalFooterLink href="https://github.com/metasequoiaime/.github/blob/main/RECRUITING.md">{t("招募开发者")}</ExternalFooterLink>
            <ExternalFooterLink href="https://github.com/metasequoiaime/.github/blob/main/CONTRIBUTING.md">{t("贡献指南")}</ExternalFooterLink>
            <ExternalFooterLink href="https://github.com/metasequoiaime/.github/blob/main/CODE_OF_CONDUCT.md">{t("行为准则")}</ExternalFooterLink>
          </FooterColumn>

          <FooterColumn title="项目">
            <Link className={footerLink} to="/code/">{t("开源代码")}</Link>
            <Link className={footerLink} to="/about/">{t("关于")}</Link>
            <Link className={footerLink} to="/privacy/">{t("隐私说明")}</Link>
            <ExternalFooterLink href={ORG_URL}>{t("GitHub 组织")}</ExternalFooterLink>
          </FooterColumn>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-panel-2 px-[clamp(28px,4vw,48px)] py-[18px] text-[13px] text-muted">
          <span>
            Copyright © 2026-present{" "}
            <a href="https://github.com/fanlusky" target="_blank" rel="noreferrer">fanlusky</a>
            {" @"}
            {t("乱序楼")}
          </span>
          <span className="ml-auto flex flex-wrap gap-x-4 gap-y-2">
            <span>GPL-3.0</span>
            <a className="text-muted hover:text-ink" href="https://msime.app" target="_blank" rel="noreferrer">msime.app</a>
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
  const { t } = useLocale();
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<"season" | "theme" | null>(null);
  const closeMenu = useCallback(() => {
    setMenuIsOpen(false);
  }, []);
  const setSeasonOpen = useCallback((open: boolean) => setOpenMenu(open ? "season" : null), []);
  const setThemeOpen = useCallback((open: boolean) => setOpenMenu(open ? "theme" : null), []);

  useHeaderBehaviour(menuIsOpen || openMenu !== null);
  useMenuFocus(menuIsOpen, closeMenu);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuIsOpen);
    return () => {
      document.body.classList.remove("menu-open");
    };
  }, [menuIsOpen]);

  return (
    <>
      {/* 键盘和读屏用户的第一站：不加这个，每换一页都要按十几次 Tab 才走完顶栏 */}
      <a className="skip-link" href="#site-content">
        {t("跳到正文")}
      </a>

      <SeasonBackdrop />

      <div className="header-wrap">
        <header className="mx-auto flex h-[68px] max-w-[calc(1240px+2*clamp(16px,3.6vw,40px))] items-center gap-3 px-[clamp(16px,3.6vw,40px)] sm:gap-4">
          <Link className="flex flex-none items-center gap-2.5 text-ink no-underline hover:text-ink" to="/" aria-label={t("水杉输入法 首页")}>
            <LogoMark size={34} ring />
            {/* Below 360px the wordmark plus the four round controls outgrow the bar, so the mark alone stands in (the link keeps its label). */}
            <span className="text-[17px] font-bold tracking-[.03em] whitespace-nowrap max-[360px]:hidden">{t("水杉输入法")}</span>
          </Link>

          <DesktopNav />

          <div className="ml-auto flex flex-none items-center gap-1.5">
            <a className={cx(roundControl, "hidden w-9 sm:inline-flex")} title="GitHub" aria-label="GitHub" href={ORG_URL} target="_blank" rel="noreferrer">
              <GitHubIcon />
            </a>
            <LanguageToggle />
            <SeasonSwitcher isOpen={openMenu === "season"} setOpen={setSeasonOpen} />
            <ThemeSwitcher isOpen={openMenu === "theme"} setOpen={setThemeOpen} />
            <button
              className={cx(roundControl, "inline-flex w-9 nav:hidden", menuIsOpen && "bg-panel-2")}
              id="btn-toggle"
              type="button"
              title={t("菜单")}
              aria-label={t(menuIsOpen ? "关闭导航菜单" : "打开导航菜单")}
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
