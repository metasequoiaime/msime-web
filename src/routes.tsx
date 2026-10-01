import { PageLoadError } from "./page-load-error";
import { isTraditional } from "../shared/locales";
import { loadTraditional } from "../shared/translate";
import { useLocale } from "./use-locale";
import { redirect, createMemoryHistory, createRootRoute, createRoute, createRouter, lazyRouteComponent, Outlet } from "@tanstack/react-router";
import { usePageMeta } from "./page-meta";
import { docsSearchSchema } from "./docs-search";
import { SiteShell } from "./site-shell";
import { Container, Grove, LinkButton } from "./ui";

/** The dawn redwood grove beside the 404 message: far row faint, near row solid, as in the home hero. */
const NOT_FOUND_GROVE = {
  far: [[8, 95, 0.62], [122, 81, 0.7], [224, 101, 0.58]],
  near: [[56, 27, 1.02], [170, 44, 0.92]],
} as const;

function NotFoundPage() {
  const { t } = useLocale();
  usePageMeta();
  return (
    <main>
      <Container width="inner" className="page-enter grid items-center gap-[clamp(28px,5vw,72px)] pt-[clamp(48px,8vw,112px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="min-w-0">
          <p className="m-0 font-mono text-sm font-medium tracking-[.16em] text-accent-ink">404</p>
          <h1 className="mt-3 mb-3.5 font-heading text-[clamp(32px,4.2vw,50px)] leading-[1.25] font-bold text-ink">{t("页面不存在")}</h1>
          <p className="m-0 text-[16.5px] leading-[1.85] text-body">{t("这个地址下没有内容，可能是链接过期或输错了。可以回到首页重新开始，或者直接查看使用指南。")}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <LinkButton size="lg" to="/">
              {t("回到首页")}
            </LinkButton>
            <LinkButton size="lg" variant="secondary" to="/docs/$guide/" params={{ guide: "windows" }}>
              {t("查看文档")}
            </LinkButton>
          </div>
        </div>
        <svg className="mx-auto hidden w-full max-w-[300px] lg:block" viewBox="0 0 300 200" aria-hidden="true">
          <Grove trees={NOT_FOUND_GROVE.far} opacity={0.3} />
          <Grove trees={NOT_FOUND_GROVE.near} />
          <path d="M0 199.5H300" style={{ stroke: "var(--hair-2)" }} />
        </svg>
      </Container>
    </main>
  );
}

function RootLayout() {
  usePageMeta();
  return <Outlet />;
}

/** Unmatched addresses never enter the pathless shell route, so the root renders the shell around the not-found page itself. */
function ShellNotFound() {
  return (
    <SiteShell>
      <NotFoundPage />
    </SiteShell>
  );
}

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: ShellNotFound, beforeLoad: ({ location }) => isTraditional(location.pathname) ? loadTraditional() : undefined });

/**
 * 无路径的布局层：顶栏、导航和页脚都挂在这里，站内换页时它们不重挂，导航胶囊才能连续地滑过去。
 *
 * 简历页是独立排版，直接挂在根节点下，不进这一层。
 */
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "site-shell",
  component: SiteShell,
  notFoundComponent: NotFoundPage,
});

// 各页独立加载，文档访客无需下载首页演示和社区图表。
const indexRoute = createRoute({ getParentRoute: () => shellRoute, path: "/", component: lazyRouteComponent(() => import("./page-home"), "HomePage") });

const featuresRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/features",
  component: lazyRouteComponent(() => import("./page-features"), "FeaturesPage"),
});

const docsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/docs",
  component: lazyRouteComponent(() => import("./page-docs"), "DocsPage"),
  validateSearch: docsSearchSchema,
});

const guideRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/docs/$guide",
  component: lazyRouteComponent(() => import("./page-docs"), "DocsPage"),
});

const faqRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/faq",
  component: lazyRouteComponent(() => import("./page-faq"), "FaqPage"),
});

const downloadRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/download",
  component: lazyRouteComponent(() => import("./page-download"), "DownloadPage"),
});

function redirectBeta({ location }: { location: { pathname: string; search: Record<string, unknown> } }) {
  throw redirect({
    to: isTraditional(location.pathname) ? "/zh-TW/download/" : "/download/",
    search: { ...location.search, platform: location.search.platform === "macos" ? "macos" : "ios" },
    replace: true,
  });
}

const betaRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/beta",
  beforeLoad: redirectBeta,
});

const aboutRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/about",
  component: lazyRouteComponent(() => import("./page-about"), "AboutPage"),
});

const codeRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/code",
  component: lazyRouteComponent(() => import("./page-code"), "CodePage"),
});

const priceRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/price",
  component: lazyRouteComponent(() => import("./page-price"), "PricePage"),
});

const privacyRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/privacy",
  component: lazyRouteComponent(() => import("./page-privacy"), "PrivacyPage"),
});

const feedbackRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/feedback",
  component: lazyRouteComponent(() => import("./page-feedback"), "FeedbackPage"),
});

const wordsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/words",
  component: lazyRouteComponent(() => import("./page-words"), "WordsPage"),
});

const skinsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/skins",
  component: lazyRouteComponent(() => import("./page-skins"), "SkinsPage"),
});

const dictionariesRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/dictionaries",
  component: lazyRouteComponent(() => import("./page-dictionaries"), "DictionariesPage"),
});

const pluginsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/plugins",
  component: lazyRouteComponent(() => import("./page-plugins"), "PluginsPage"),
});

const resumeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/resume",
  component: lazyRouteComponent(() => import("./page-resume"), "ResumePage"),
});

const traditionalRoutes = [
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/beta", beforeLoad: redirectBeta }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/", component: lazyRouteComponent(() => import("./page-home"), "HomePage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/features", component: lazyRouteComponent(() => import("./page-features"), "FeaturesPage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/download", component: lazyRouteComponent(() => import("./page-download"), "DownloadPage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/faq", component: lazyRouteComponent(() => import("./page-faq"), "FaqPage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/feedback", component: lazyRouteComponent(() => import("./page-feedback"), "FeedbackPage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/words", component: lazyRouteComponent(() => import("./page-words"), "WordsPage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/skins", component: lazyRouteComponent(() => import("./page-skins"), "SkinsPage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/dictionaries", component: lazyRouteComponent(() => import("./page-dictionaries"), "DictionariesPage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/plugins", component: lazyRouteComponent(() => import("./page-plugins"), "PluginsPage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/about", component: lazyRouteComponent(() => import("./page-about"), "AboutPage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/code", component: lazyRouteComponent(() => import("./page-code"), "CodePage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/price", component: lazyRouteComponent(() => import("./page-price"), "PricePage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/privacy", component: lazyRouteComponent(() => import("./page-privacy"), "PrivacyPage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/docs", component: lazyRouteComponent(() => import("./page-docs"), "DocsPage"), validateSearch: docsSearchSchema }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/docs/$guide", component: lazyRouteComponent(() => import("./page-docs"), "DocsPage") })
];

const routeTree = rootRoute.addChildren([
  shellRoute.addChildren([...traditionalRoutes, indexRoute, featuresRoute, docsRoute, guideRoute, faqRoute, downloadRoute, betaRoute, aboutRoute, codeRoute, priceRoute, privacyRoute, feedbackRoute, wordsRoute, skinsRoute, dictionariesRoute, pluginsRoute]),
  resumeRoute,
]);

export const makeRouter = (url?: string) => createRouter({
  ...(url ? { history: createMemoryHistory({ initialEntries: [url] }), isServer: true } : {}),
  routeTree,
  // 站点部署成目录结构，规范地址一直带尾斜杠（`/docs/` 而不是 `/docs`）。生成的链接必须跟着带，直接访问才不会先吃一次跳转。
  trailingSlash: "always",
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: PageLoadError,
  scrollRestoration: true,
  // 鼠标停到链接上就开始取该路由的代码块。限速网络下实测，不预取的话点完要等 1.4 秒内容才换，这段等待被挪到了用户还在瞄准的时候。真赶上没取完，顶栏下的进度线会顶上。
  defaultPreload: "intent",
  defaultPreloadDelay: 50,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof makeRouter>;
  }
}
