import { useSearchReady } from "./use-page-search";
import { LocaleLink as Link } from "./locale-link";
import { useLocale } from "./use-locale";
import { baseLocalePath, traditionalPages, traditionalPath, isTraditional } from "../shared/locales";
import { Outlet, useLocation, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { THEME_CHOICES, THEME_LABELS, useTheme } from "./theme";

const NAV_ITEMS = [
  { to: "/", label: "首页", icon: "home" },
  { to: "/features/", label: "功能", icon: "home" },
  { to: "/docs/$guide/", label: "文档", icon: "docs" },
  { to: "/faq/", label: "常见问题", icon: "docs" },
  { to: "/price/", label: "价格", icon: "price" },
  { to: "/code/", label: "开源代码", icon: "code" },
  { to: "/download/", label: "下载", icon: "download" },
  { to: "/feedback/", label: "问题与建议", icon: "docs" },
  { to: "/about/", label: "关于", icon: "about" },
] as const;

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function ThemeSwitcher() {
  const { t } = useLocale();
  const { theme, isLight, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 要两帧：单帧的回调跑在本帧样式计算之前，is-dark 和 is-ready 会落进同一次样式变更，过渡照样会启动 —— 那正是这个开关要拦掉的首帧淡入。
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => buttonRef.current?.classList.add("is-ready"));
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!switcherRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("click", closeOnOutsideClick);
    return () => {
      document.removeEventListener("click", closeOnOutsideClick);
    };
  }, [isOpen]);

  return (
    <div className={`theme-switcher${isOpen ? " is-open" : ""}`} id="theme-switcher" ref={switcherRef}>
      <button
        className={`theme-button${isLight ? "" : " is-dark"}`}
        id="theme-button"
        ref={buttonRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={t(`主题：${THEME_LABELS[theme]}`)}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
      >
        <svg className="theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
        </svg>
        <svg className="theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.8 6.8 0 0 0 10.8 10.8z" />
        </svg>
      </button>

      <div className="theme-options" id="theme-options" role="menu" aria-label={t("主题模式")}>
        {t(THEME_CHOICES.map((choice) => (
          <button
            key={choice}
            className={`theme-option${theme === choice ? " is-selected" : ""}`}
            type="button"
            role="menuitemradio"
            aria-checked={theme === choice}
            onClick={() => {
              // 关菜单要排在换主题前面：setTheme 里的 flushSync 会把这之前排队的更新一起冲掉，菜单才不会留在擦除后的新画面里。
              setIsOpen(false);
              // 擦除从主题按钮的中心铺开，而不是从被点的那个菜单项 —— 按钮才是这个控件在页面上的位置
              const box = buttonRef.current?.getBoundingClientRect();
              setTheme(choice, box && { x: box.left + box.width / 2, y: box.top + box.height / 2 });
            }}
          >
            {t(THEME_LABELS[choice])}
          </button>
        )))}
      </div>
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

function NavMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useLocale();
  const pathname = useLocation({ select: (location) => baseLocalePath(location.pathname) });
  const listRef = useRef<HTMLUListElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeLinkRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const menu = menuRef.current;
    const opener = document.getElementById("btn-toggle");
    menu?.querySelector<HTMLButtonElement>(".btn-close")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab" || !menu) return;
      const items = Array.from(menu.querySelectorAll<HTMLElement>("button, a[href]"));
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
    const desktop = window.matchMedia("(min-width: 1101px)");
    const onResize = () => {
      if (desktop.matches) onClose();
    };
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
      opener?.focus();
    };
  }, [isOpen, onClose]);

  // 当前 tab 的胶囊从上一页的位置滑过来。偏移要在浏览器画这一帧之前写好，否则胶囊会先出现在终点再跳回起点。
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname 不在函数体里用，它是触发条件 —— 换页之后才去量新旧两个标签的位置差
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const active = list.querySelector<HTMLElement>('.nav-link[aria-current="page"]');
    const previous = activeLinkRef.current;
    activeLinkRef.current = active;

    if (!active || !previous || previous === active) return;

    list.style.setProperty("--pill-from", `${previous.offsetLeft - active.offsetLeft}px`);
    list.classList.add("is-sliding");
  }, [pathname]);

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: 手机展开时为 modal dialog，桌面为 navigation；两种角色均支持 aria-label。
    <div ref={menuRef} className={`nav-menu${isOpen ? " show" : ""}`} id="nav-menu" aria-label={t("站点导航")} role={isOpen ? "dialog" : "navigation"} aria-modal={isOpen || undefined}>
      <div className="nav-mobile-heading" aria-hidden="true"><img src="/msime-logo.png" width="30" height="30" alt="" />{t("水杉输入法")}</div>
      <button className="btn-close" id="btn-close" type="button" aria-label={t("关闭导航菜单")} onClick={onClose}>
        <img src="/img/icons/Close_round.svg" alt="" className="nav-icon" />
      </button>

      <ul
        className="nav-list"
        ref={listRef}
        // 动画挂在活动链接的 ::before 上，事件从伪元素冒泡到链接再到这里。跑完就摘掉 is-sliding，下次换页才能重新触发。
        onAnimationEnd={() => listRef.current?.classList.remove("is-sliding")}
      >
        {t(NAV_ITEMS.map((item) => (
          <li className="nav-item" key={item.to}>
            <Link to={item.to} params={item.label === "文档" ? { guide: "windows" } : {}} className="nav-link" {...(item.label === "文档" ? { "data-status": pathname.startsWith("/docs") ? "active" : "inactive" } : {})} activeOptions={{ exact: item.to === "/" }} onClick={onClose}>
              <img src={`/img/icons/nav/${item.icon}.svg`} alt="" className="nav-link-icon" />
              {t(item.label)}
            </Link>
          </li>
        )))}
      </ul>
      <div className="nav-mobile-footer">
        <a href="https://github.com/metasequoiaime" target="_blank" rel="noreferrer"><GithubMark />GitHub<span aria-hidden="true">↗</span></a>
      </div>
    </div>
  );
}

/** 向下滚动时收起顶栏，向上滚或回到顶部时放出来 */
function useHeaderAutoHide(menuIsOpen: boolean) {
  const menuIsOpenRef = useRef(menuIsOpen);
  menuIsOpenRef.current = menuIsOpen;

  useEffect(() => {
    const headerWrap = document.querySelector<HTMLElement>(".header-wrap");
    if (!headerWrap) return;

    let lastScrollY = Math.max(0, window.scrollY);
    let ticking = false;
    let hidden = false;

    const updateHeader = () => {
      // 菜单打开时保持顶栏可见
      if (menuIsOpenRef.current) {
        if (hidden) {
          headerWrap.classList.remove("header--hidden");
          hidden = false;
        }

        lastScrollY = Math.max(0, window.scrollY);
        ticking = false;
        return;
      }

      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastScrollY;
      const shouldHide = delta > 2 && currentY > 4;
      const shouldShow = delta < -2 || currentY <= 4;

      if (shouldHide && !hidden) {
        headerWrap.classList.add("header--hidden");
        hidden = true;
      } else if (shouldShow && hidden) {
        headerWrap.classList.remove("header--hidden");
        hidden = false;
      }

      lastScrollY = currentY;
      ticking = false;
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

function SiteFooter({ inert }: { inert: boolean }) {
  const { t } = useLocale();
  return (
    <footer className="site-footer" inert={inert}>
      <div className="container">
        <div className="site-footer-grid">
          <div>
            <div className="site-footer-brand">
              <img src="/msime-logo.png" width="30" height="30" decoding="async" alt="" />
              <span>{t("水杉输入法")}</span>
            </div>
            <p className="site-footer-desc">{t("开源中文输入法，支持全拼、双拼与五笔。各平台的可用功能、下载和安装说明见对应页面。")}</p>
            <div className="site-footer-chips">
              <a href="https://t.me/msimegroup" target="_blank" rel="noreferrer">Telegram</a>
              <span>{t("QQ 群 829919142")}</span>
              <a href="mailto:metasequoiaime@gmail.com">{t("邮箱")}</a>
            </div>
          </div>

          <div>
            <div className="site-footer-col-title">{t("产品")}</div>
            <div className="site-footer-links">
              <Link to="/download/">{t("下载")}</Link>
              <Link to="/download/" search={{ platform: "ios" }}>{t("iOS 公开测试")}</Link>
              <Link to="/price/">{t("价格")}</Link>
              <Link to="/docs/$guide/" params={{ guide: "windows" }}>{t("文档")}</Link>
              <Link to="/faq/">{t("常见问题 Q&A")}</Link>
            </div>
          </div>

          <div>
            <div className="site-footer-col-title">{t("项目")}</div>
            <div className="site-footer-links">
              <Link to="/code/">{t("开源代码")}</Link>
              <Link to="/about/">{t("关于")}</Link>
              <Link to="/privacy/">{t("隐私说明")}</Link>
              <a href="https://github.com/metasequoiaime" target="_blank" rel="noreferrer">{t("GitHub 组织")}</a>
            </div>
          </div>

          <div>
            <div className="site-footer-col-title">{t("参与")}</div>
            <div className="site-footer-links">
              <Link to="/feedback/">{t("问题与建议")}</Link>
              <Link to="/words/">{t("提交词条")}</Link>
              <a href="https://github.com/metasequoiaime/.github/blob/main/RECRUITING.md" target="_blank" rel="noreferrer">{t("招募开源开发者")}</a>
              <a href="https://github.com/metasequoiaime/.github/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">{t("贡献指南")}</a>
              <a href="https://github.com/metasequoiaime/.github/blob/main/CODE_OF_CONDUCT.md" target="_blank" rel="noreferrer">{t("行为准则")}</a>
            </div>
          </div>
        </div>

        <div className="site-footer-bottom">
          <span>Copyright © 2026-present</span>
          <a href="https://github.com/fanlusky" target="_blank" rel="noreferrer">fanlusky</a>
          <span>@<span className="lxl">{t("乱序楼")}</span></span>
          <span className="site-footer-license">GPL-3.0</span>
          <a className="site-footer-site" href="https://msime.app" target="_blank" rel="noreferrer">msime.app</a>
        </div>
      </div>
    </footer>
  );
}

export function SiteShell() {
  const { t } = useLocale();
  const languagePath = useLocation({ select: value => value.pathname });
  const searchReady = useSearchReady();
  const languageSearch = useLocation({ select: value => value.searchStr });
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const closeMenu = useCallback(() => {
    setMenuIsOpen(false);
  }, []);

  useHeaderAutoHide(menuIsOpen);

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
        {t("跳到正文")}</a>

      <div className="header-wrap" inert={menuIsOpen}>
        <header className="container header">
          <Link className="logo" to="/">
            <img src="/msime-logo.png" width="34" height="34" decoding="async" alt="logo" />
            <span className="logo-text">{t("水杉输入法")}</span>
          </Link>

          <div className="header-actions">
            <a className="header-github" aria-label="GitHub" href="https://github.com/metasequoiaime" target="_blank" rel="noreferrer">
              <GithubMark />
              <span>GitHub</span>
            </a>

            <a className="header-language" lang={isTraditional(languagePath) ? "zh-Hans" : "zh-Hant-TW"} hrefLang={isTraditional(languagePath) ? "zh-Hans" : "zh-Hant-TW"} href={(isTraditional(languagePath) ? (baseLocalePath(languagePath) === "/docs/" ? "/docs/windows/" : baseLocalePath(languagePath)) : traditionalPath(baseLocalePath(languagePath) in traditionalPages ? baseLocalePath(languagePath) : '/')) + (searchReady ? languageSearch : "")} aria-label={isTraditional(languagePath) ? "切換到簡體中文" : "切换到繁体中文"} title={isTraditional(languagePath) ? "切換到簡體中文" : "切换到繁体中文"}>{isTraditional(languagePath) ? "简" : "繁"}</a>
            <ThemeSwitcher />

            <button
              className="btn-toggle"
              id="btn-toggle"
              type="button"
              aria-label={t("打开导航菜单")}
              aria-expanded={menuIsOpen}
              aria-controls="nav-menu"
              onClick={() => {
                setMenuIsOpen(true);
              }}
            >
              <img src="/img/icons/Menu.svg" alt="" className="nav-icon" />
            </button>
          </div>
        </header>
      </div>

      <NavMenu isOpen={menuIsOpen} onClose={closeMenu} />
      <RouteProgress />

      <div id="site-content" tabIndex={-1} inert={menuIsOpen}>
        <Outlet />
      </div>

      <SiteFooter inert={menuIsOpen} />
    </>
  );
}
