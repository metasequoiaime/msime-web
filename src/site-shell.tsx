import { useSearchReady } from "./use-page-search";
import { LocaleLink as Link } from "./locale-link";
import { useLocale } from "./use-locale";
import { baseLocalePath, traditionalPages, traditionalPath, isTraditional } from "../shared/locales";
import { Outlet, useLocation, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { NoticeBanner } from "./notice-banner";
import { COMMUNITY_SECTIONS } from "./community/sections";
import { THEME_CHOICES, THEME_LABELS, useTheme, type RevealOrigin, type ThemeChoice } from "./theme";
import { SEASON_CHOICES, SEASON_NAMES, SEASON_OPTIONS, seasonForMonth } from "./season";
import { BackToTop, CloseIcon, DownloadIcon, GitHubIcon, LinkButton, LogoMark, MenuIcon, MonitorIcon, MoonIcon, PaletteIcon, QQIcon, SeasonBackdrop, SunIcon, TelegramIcon, ToastProvider, chipClass, copyText, cx, useToast } from "./ui";

type NavItem = {
  to: "/" | "/download/" | "/skins/" | "/feedback/" | "/words/" | "/docs/$guide/" | "/code/" | "/about/";
  label: string;
  /** Shows the GitHub mark before the label: the open-source page is also where the site's GitHub link now lives. */
  github?: boolean;
};

/** Wide screens show these as a pill group in the header; below 1180px they move into the menu panel. 下载 is both a tab and the accent button at the right end of the bar; 功能, 常见问题, 价格 and 更新日志 are reached from the footer (常见问题 also from the docs toolbar). 社区 opens the skins page and stands for all three community pages (皮肤, 词库, 插件), which link to each other under their leads: as separate tabs the Traditional bar left 12px spare at 1180px, and 词库 would sit next to 词库缺失反馈. */
const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "首页" },
  { to: "/download/", label: "下载" },
  { to: "/skins/", label: "社区" },
  { to: "/feedback/", label: "Bug 与需求反馈" },
  { to: "/words/", label: "词库缺失反馈" },
  { to: "/docs/$guide/", label: "文档" },
  { to: "/code/", label: "开源代码", github: true },
  { to: "/about/", label: "关于" },
];

const ORG_URL = "https://github.com/metasequoiaime";
// Same query Tailwind emits for the `nav:` variant (--breakpoint-nav in app.css), so JS and CSS switch layouts at the same width whatever the root font size.
const DESKTOP_NAV_QUERY = "(width >= 73.75rem)";
const QQ_GROUP = "829919142";

/** The docs tab also covers the FAQ, which lives under the docs toolbar in the design; the 社区 tab covers every community page. */
const isCurrent = (item: NavItem, path: string) =>
  item.to === "/" ? path === "/" : item.to === "/docs/$guide/" ? path.startsWith("/docs/") || path === "/faq/" : item.to === "/skins/" ? COMMUNITY_SECTIONS.some(section => path.startsWith(section.to)) : path.startsWith(item.to);

const linkParams = (item: NavItem) => (item.to === "/docs/$guide/" ? { guide: "windows" } : {});

/** Round 36px header control. No display utility here: each use adds its own (`inline-flex`, or `hidden sm:inline-flex`), because two display utilities on one element resolve by stylesheet order, not class order. */
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

/** Moves focus between the popover's options with the arrow keys, as the menu role promises. Left and right step too, because the options sit in rows. */
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

/** One option tile in the palette popover. */
const optionClass = (checked: boolean) =>
  cx(
    "flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-tab px-1 py-2 text-[13px] font-semibold no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
    checked ? "bg-accent-soft text-accent-ink shadow-ring-accent hover:text-accent-ink" : "text-body hover:bg-panel-2 hover:text-ink"
  );

function OptionGroup({ label, columns, children }: { label: string; columns: string; children: ReactNode }) {
  const { t } = useLocale();
  const labelId = useId();
  return (
    <div className="not-first:mt-2 not-first:pt-2 not-first:shadow-divider-t">
      <p id={labelId} className="m-0 px-1.5 pt-0.5 pb-1.5 text-xs font-semibold text-muted">
        {t(label)}
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

/** The 简/繁 pair in the palette popover. The other script is a plain link (`.header-language`, a full page load, keeping the search params once they are known); the current one only closes the popover. */
function LanguageOptions({ onCurrent }: { onCurrent: () => void }) {
  const languagePath = useLocation({ select: (value) => value.pathname });
  const languageSearch = useLocation({ select: (value) => value.searchStr });
  const searchReady = useSearchReady();
  const tw = isTraditional(languagePath);
  const base = baseLocalePath(languagePath);
  const target = tw ? (base === "/docs/" ? "/docs/windows/" : base) : traditionalPath(base in traditionalPages ? base : "/");
  const current = (
    <OptionButton key="current" checked onSelect={onCurrent}>
      <span lang={tw ? "zh-Hant-TW" : "zh-Hans"}>{tw ? "繁體中文" : "简体中文"}</span>
    </OptionButton>
  );
  const other = (
    <a
      key="other"
      role="menuitemradio"
      aria-checked={false}
      className={cx("header-language", optionClass(false))}
      lang={tw ? "zh-Hans" : "zh-Hant-TW"}
      hrefLang={tw ? "zh-Hans" : "zh-Hant-TW"}
      href={target + (searchReady ? languageSearch : "")}
      title={tw ? "切換到簡體中文" : "切换到繁体中文"}
    >
      {tw ? "简体中文" : "繁體中文"}
    </a>
  );
  // Simplified always comes first, whichever page this is.
  return tw ? [other, current] : [current, other];
}

/**
 * The one round palette button: light/dark/system, the seasonal skin and the 简/繁 switch in a single popover.
 *
 * The popover stays open while options are picked, so theme and season can be tried in a row; the colour wipe still starts from the button. Escape closes it and returns focus to the button, a press outside or tabbing away closes it without moving focus.
 */
function PaletteMenu({ isOpen, setOpen }: { isOpen: boolean; setOpen: (open: boolean) => void }) {
  const { t } = useLocale();
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

  const monthSeason = SEASON_NAMES[seasonForMonth(new Date().getMonth() + 1)];
  const label = t("外观与语言");

  return (
    <div className="relative" id="theme-switcher" ref={rootRef}>
      <button
        ref={buttonRef}
        className={cx(roundControl, "inline-flex w-9", isOpen && "bg-panel-2")}
        id="theme-button"
        type="button"
        title={label}
        aria-label={label}
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
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          // Below 560px the popover spans the bar (the header wrap's backdrop filter makes it the containing block), so it never runs off the left edge.
          className="absolute top-11 right-0 z-40 w-[300px] rounded-menu bg-panel p-2 shadow-card max-sm:fixed max-sm:inset-x-3 max-sm:top-[62px] max-sm:w-auto"
        >
          <OptionGroup label="主题" columns="grid-cols-3">
            {THEME_CHOICES.map((choice) => (
              <OptionButton
                key={choice}
                checked={theme === choice}
                // 擦除从调色盘按钮的中心铺开，而不是从被点的那个选项 —— 按钮才是这个控件在页面上的位置
                onSelect={() => setTheme(choice, buttonCenter(buttonRef.current))}
              >
                <span className="flex size-4 items-center justify-center" aria-hidden="true">
                  {THEME_ICONS[choice]}
                </span>
                {t(THEME_LABELS[choice])}
              </OptionButton>
            ))}
          </OptionGroup>

          <OptionGroup label="季节皮肤" columns="grid-cols-5">
            {SEASON_CHOICES.map((choice) => {
              const option = SEASON_OPTIONS[choice];
              return (
                <OptionButton key={choice} checked={season === choice} onSelect={() => setSeason(choice, buttonCenter(buttonRef.current))}>
                  <span className="size-4 flex-none rounded-full shadow-hair" style={{ background: option.dot }} aria-hidden="true" />
                  <span title={t(choice === "auto" ? `${option.sub} · 当前${monthSeason}` : option.sub)}>{t(option.name)}</span>
                </OptionButton>
              );
            })}
          </OptionGroup>

          <OptionGroup label="语言" columns="grid-cols-2">
            <LanguageOptions onCurrent={() => close(true)} />
          </OptionGroup>
        </div>
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
              {item.github && <GitHubIcon size={15} />}
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
                {item.github && <GitHubIcon size={16} className="mr-2 flex-none" />}
                {t(item.label)}
              </Link>
            </li>
          );
        })}
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
              <a className={chipClass()} href="https://t.me/msimegroup" target="_blank" rel="noreferrer" title="Telegram" aria-label="Telegram">
                <TelegramIcon size={16} />
              </a>
              <button
                type="button"
                className={chipClass("gap-1.5")}
                title={t("点击复制群号")}
                aria-label={t(`QQ 群 ${QQ_GROUP}`)}
                onClick={async () => {
                  show(t((await copyText(QQ_GROUP)) ? `已复制 QQ 群号 ${QQ_GROUP}` : `QQ 群号：${QQ_GROUP}`));
                }}
              >
                <QQIcon size={15} className="flex-none" />
                {QQ_GROUP}
              </button>
              <a className={chipClass()} href="mailto:metasequoiaime@gmail.com">{t("邮箱")}</a>
            </div>
          </div>

          <FooterColumn title="产品">
            <Link className={footerLink} to="/features/">{t("功能")}</Link>
            <Link className={footerLink} to="/skins/">{t("社区皮肤")}</Link>
            <Link className={footerLink} to="/dictionaries/">{t("词库")}</Link>
            <Link className={footerLink} to="/plugins/">{t("插件")}</Link>
            <Link className={footerLink} to="/download/">{t("下载")}</Link>
            <Link className={footerLink} to="/download/" hash="releases">{t("更新日志")}</Link>
            <Link className={footerLink} to="/docs/$guide/" params={{ guide: "windows" }}>{t("使用指南")}</Link>
            <Link className={footerLink} to="/faq/">{t("常见问题")}</Link>
            <Link className={footerLink} to="/price/">{t("价格")}</Link>
          </FooterColumn>

          <FooterColumn title="参与">
            <Link className={footerLink} to="/feedback/">{t("Bug 与需求反馈")}</Link>
            <Link className={footerLink} to="/words/">{t("词库缺失反馈")}</Link>
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
      {/* 键盘和读屏用户的第一站：不加这个，每换一页都要按十几次 Tab 才走完顶栏 */}
      <a className="skip-link" href="#site-content">
        {t("跳到正文")}
      </a>

      <SeasonBackdrop />

      <div className="header-wrap">
        <header className="mx-auto flex h-[68px] max-w-[calc(1240px+2*clamp(16px,3.6vw,40px))] items-center gap-3 px-[clamp(16px,3.6vw,40px)] sm:gap-4">
          {/* Exact: on Traditional pages the target is /zh-TW/, which every other /zh-TW/* path would otherwise match as a prefix and mark current. */}
          <Link className="flex flex-none items-center gap-2.5 text-ink no-underline hover:text-ink" to="/" activeOptions={{ exact: true, includeSearch: false }} aria-label={t("水杉输入法 首页")}>
            <LogoMark size={34} ring />
            {/* Below 360px the wordmark plus the palette, 下载 and menu controls outgrow the bar, so the mark alone stands in (the link keeps its label). */}
            <span className="text-[17px] font-bold tracking-[.03em] whitespace-nowrap max-[360px]:hidden">{t("水杉输入法")}</span>
          </Link>

          <DesktopNav />

          <div className="ml-auto flex flex-none items-center gap-1.5">
            <PaletteMenu isOpen={paletteIsOpen} setOpen={setPaletteIsOpen} />
            {/* The bar's one accent action, kept on every width (the menu panel no longer lists 下载). */}
            <LinkButton to="/download/" size="pill">
              <DownloadIcon size={16} />
              {t("下载")}
            </LinkButton>
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

      <NoticeBanner inert={menuIsOpen} />

      <div id="site-content" className="focus:outline-none" tabIndex={-1} inert={menuIsOpen}>
        {children ?? <Outlet />}
      </div>

      <SiteFooter inert={menuIsOpen} />
      <BackToTop />
    </>
  );
}
