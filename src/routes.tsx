import { PageLoadError } from "./page-load-error";
import { isTraditional } from "../shared/locales";
import { loadTraditional } from "../shared/translate";
import { LocaleLink as Link } from "./locale-link";
import { useLocale } from "./use-locale";
import { redirect, createMemoryHistory, createRootRoute, createRoute, createRouter, lazyRouteComponent, Outlet } from "@tanstack/react-router";
import { usePageMeta } from "./page-meta";
import { docsSearchSchema } from "./docs-search";
import { SiteShell } from "./site-shell";

function NotFoundPage() {
  const { t } = useLocale();
  usePageMeta();
  return (
    <main className="content-page">
      <div className="container">
        <div className="card">
          <h1>{t("页面不存在")}</h1>
          <p>{t("这个地址下没有内容，可能是链接过期或输错了。")}</p>
          <div className="btn-row">
            <Link className="btn btn-primary" to="/">
              {t("回到首页")}
            </Link>
            <Link className="btn btn-ghost" to="/docs/$guide/" params={{ guide: "windows" }}>
              {t("查看文档")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function RootLayout() {
  usePageMeta();
  return <Outlet />;
}

const rootRoute = createRootRoute({ component: RootLayout, beforeLoad: ({ location }) => isTraditional(location.pathname) ? loadTraditional() : undefined });

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
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/about", component: lazyRouteComponent(() => import("./page-about"), "AboutPage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/code", component: lazyRouteComponent(() => import("./page-code"), "CodePage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/price", component: lazyRouteComponent(() => import("./page-price"), "PricePage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/privacy", component: lazyRouteComponent(() => import("./page-privacy"), "PrivacyPage") }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/docs", component: lazyRouteComponent(() => import("./page-docs"), "DocsPage"), validateSearch: docsSearchSchema }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh-TW/docs/$guide", component: lazyRouteComponent(() => import("./page-docs"), "DocsPage") })
];

const routeTree = rootRoute.addChildren([
  shellRoute.addChildren([...traditionalRoutes, indexRoute, featuresRoute, docsRoute, guideRoute, faqRoute, downloadRoute, betaRoute, aboutRoute, codeRoute, priceRoute, privacyRoute, feedbackRoute, wordsRoute]),
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
