import { otherEditionSites } from "./edition-sites";
import { Link, Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { basePath, HTML_LANG, localizedPath, PAGE_PATHS, type Locale } from "../shared/locales";
import { bo } from "./i18n/bo";
import { zh } from "./i18n/zh";
import { THEME_CHOICES, useTheme, type ThemeChoice } from "./theme";
import { Container } from "./ui/container";
import { GitHubIcon, MonitorIcon, MoonIcon, SunIcon } from "./ui/icons";
import { LogoMark } from "./ui/logo";
import { useLocale } from "./use-locale";

const OTHER: Record<Locale, { locale: Locale; name: string; label: string }> = {
  bo: { locale: "zh", name: zh.languageName, label: zh.switchLabel },
  zh: { locale: "bo", name: bo.languageName, label: bo.switchLabel },
};

const THEME_ICONS: Record<ThemeChoice, ReactNode> = { light: <SunIcon />, dark: <MoonIcon />, system: <MonitorIcon /> };

function ThemeButton() {
  const { messages } = useLocale();
  const { theme, setTheme } = useTheme();
  const next = THEME_CHOICES[(THEME_CHOICES.indexOf(theme) + 1) % THEME_CHOICES.length];
  return (
    <button
      type="button"
      className="grid size-9 place-items-center rounded-full text-body shadow-ring-2 transition-colors hover:bg-hover hover:text-ink"
      aria-label={`${messages.theme.label}: ${messages.theme[theme]}`}
      title={`${messages.theme.label}: ${messages.theme[theme]}`}
      onClick={() => setTheme(next)}
    >
      {THEME_ICONS[theme]}
    </button>
  );
}

function Header() {
  const { locale, path, messages, href } = useLocale();
  const current = basePath(path);
  const other = OTHER[locale];
  // On an unknown address the switcher leads to the other language's home page rather than to another missing page.
  const switchTo = localizedPath((PAGE_PATHS as readonly string[]).includes(current) ? current : "/", other.locale);
  const nav = PAGE_PATHS.map(page => ({ page, label: { "/": messages.nav.home, "/download/": messages.nav.download, "/guide/": messages.nav.guide, "/faq/": messages.nav.faq }[page] }));
  return (
    <header className="site-header">
      <Container width="page" className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 lg:flex-nowrap">
        <Link to={href("/")} className="mr-auto flex items-center gap-2.5 text-ink hover:text-ink">
          <LogoMark size={34} />
          <span className="flex flex-col leading-tight">
            <span className="text-[17px] font-bold">水杉藏文</span>
            <span className="text-xs font-medium text-muted">MSIME Tibetan</span>
          </span>
        </Link>
        <nav aria-label={messages.nav.label} className="order-last -mx-3 flex w-full gap-1 lg:order-none lg:mx-0 lg:w-auto">
          {nav.map(item => (
            <Link key={item.page} to={href(item.page)} className="nav-link" aria-current={current === item.page ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href={switchTo} hrefLang={HTML_LANG[other.locale]} lang={HTML_LANG[other.locale]} aria-label={other.label} className="inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold text-ink shadow-ring-2 hover:bg-hover hover:text-ink">
            {other.name}
          </a>
          <ThemeButton />
        </div>
      </Container>
    </header>
  );
}

function Footer() {
  const { locale, messages } = useLocale();
  const links = [
    { href: "https://msime.app/", label: messages.footer.fullProduct },
    { href: "https://github.com/metasequoiaime/msime", label: messages.footer.source, icon: <GitHubIcon size={15} /> },
    { href: "https://msime.app/feedback/", label: messages.footer.feedback },
    { href: "https://msime.app/privacy/", label: messages.footer.privacy },
    { href: "https://msime.app/terms/", label: messages.footer.terms },
    ...otherEditionSites("tibetan", locale !== "zh").map((site) => ({ href: site.url, label: site.label })),
  ];
  return (
    <footer className="mt-24 pb-10">
      <Container width="page" className="flex flex-col gap-5 border-t border-hair pt-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5 text-ink">
          <LogoMark size={30} />
          <span className="font-semibold">水杉藏文</span>
          <span className="text-sm text-muted">· MSIME</span>
        </div>
        <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm">
          {links.map(link => (
            <li key={link.href}>
              <a href={link.href} className="inline-flex items-center gap-1.5 text-body hover:text-ink">
                {link.icon}
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </footer>
  );
}

export function SiteShell({ children }: { children?: ReactNode }) {
  const { messages } = useLocale();
  return (
    <>
      <a className="skip-link" href="#main">
        {messages.skipToContent}
      </a>
      <Header />
      <div id="main">{children ?? <Outlet />}</div>
      <Footer />
    </>
  );
}
