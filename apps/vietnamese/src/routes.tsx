import { createMemoryHistory, createRootRoute, createRoute, createRouter, lazyRouteComponent, Outlet } from "@tanstack/react-router";
import { PageLoadError } from "./page-load-error";
import { usePageMeta } from "./page-meta";
import { SiteShell } from "./site-shell";
import { Container, Grove, LinkButton } from "./ui";
import { useLocale } from "./use-locale";

/** The dawn redwood grove beside the 404 message: far row faint, near row solid. */
const NOT_FOUND_GROVE = {
  far: [[8, 95, 0.62], [122, 81, 0.7], [224, 101, 0.58]],
  near: [[56, 27, 1.02], [170, 44, 0.92]],
} as const;

function NotFoundPage() {
  const { messages } = useLocale();
  const text = messages.notFound;
  usePageMeta();
  return (
    <main>
      <Container width="inner" className="page-enter grid items-center gap-[clamp(28px,5vw,72px)] pt-[clamp(48px,8vw,112px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="min-w-0">
          <p className="m-0 font-mono text-sm font-medium tracking-[.16em] text-accent-ink">404</p>
          <h1 className="mt-3 mb-3.5 font-heading text-[clamp(32px,4.2vw,50px)] leading-[1.25] font-bold text-ink">{text.title}</h1>
          <p className="m-0 text-[16.5px] leading-[1.85] text-body">{text.body}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <LinkButton size="lg" to="/">
              {text.home}
            </LinkButton>
            <LinkButton size="lg" variant="secondary" to="/guide/">
              {text.guide}
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

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: ShellNotFound });

/** Pathless layout: header, nav and footer stay mounted across in-site navigation. */
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "site-shell",
  component: SiteShell,
  notFoundComponent: NotFoundPage,
});

const home = lazyRouteComponent(() => import("./page-home"), "HomePage");
const download = lazyRouteComponent(() => import("./page-download"), "DownloadPage");
const guide = lazyRouteComponent(() => import("./page-guide"), "GuidePage");
const faq = lazyRouteComponent(() => import("./page-faq"), "FaqPage");

// Each page in both languages: Vietnamese at the root, Chinese under /zh/. Every path here must be registered in shared/site-seo.ts (scripts/site-metadata.test.mjs checks it).
const pageRoutes = [
  createRoute({ getParentRoute: () => shellRoute, path: "/", component: home }),
  createRoute({ getParentRoute: () => shellRoute, path: "/download", component: download }),
  createRoute({ getParentRoute: () => shellRoute, path: "/guide", component: guide }),
  createRoute({ getParentRoute: () => shellRoute, path: "/faq", component: faq }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh/", component: home }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh/download", component: download }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh/guide", component: guide }),
  createRoute({ getParentRoute: () => shellRoute, path: "/zh/faq", component: faq }),
];

const routeTree = rootRoute.addChildren([shellRoute.addChildren(pageRoutes)]);

export const makeRouter = (url?: string) =>
  createRouter({
    ...(url ? { history: createMemoryHistory({ initialEntries: [url] }), isServer: true } : {}),
    routeTree,
    // The site deploys as directories, so canonical addresses end with a slash; generated links follow, which spares a redirect on direct visits.
    trailingSlash: "always",
    defaultNotFoundComponent: NotFoundPage,
    defaultErrorComponent: PageLoadError,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
  });

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof makeRouter>;
  }
}
