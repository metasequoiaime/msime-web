import { createMemoryHistory, createRootRoute, createRoute, createRouter, lazyRouteComponent, Outlet } from "@tanstack/react-router";
import { usePageMeta } from "./page-meta";
import { SiteShell } from "./shell";
import { LinkButton } from "./ui/button";
import { Container } from "./ui/container";
import { Grove } from "./ui/tree";
import { useLocale } from "./use-locale";

const NOT_FOUND_GROVE = {
  far: [[8, 95, 0.62], [122, 81, 0.7], [224, 101, 0.58]],
  near: [[56, 27, 1.02], [170, 44, 0.92]],
} as const;

function NotFoundPage() {
  const { messages } = useLocale();
  usePageMeta();
  return (
    <main className="copy">
      <Container width="inner" className="page-enter grid items-center gap-[clamp(28px,5vw,72px)] pt-[clamp(48px,8vw,112px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="min-w-0">
          <p className="m-0 font-code text-sm font-medium tracking-[.16em] text-accent-ink">404</p>
          <h1 className="mt-3 mb-3.5 text-[clamp(30px,4.2vw,48px)] leading-[1.35] font-bold">{messages.notFound.title}</h1>
          <p className="m-0 text-[16.5px] text-body">{messages.notFound.body}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <LinkButton size="lg" to="/">
              {messages.notFound.home}
            </LinkButton>
            <LinkButton size="lg" variant="secondary" to="/guide/">
              {messages.notFound.guide}
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

function LoadError({ error }: { error: unknown }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="m-0 text-2xl font-bold">MSIME Tibetan</h1>
      <p className="mt-4 text-body">{error instanceof Error ? error.message : String(error)}</p>
      <p className="mt-4">
        <a href="/">tibetan.msime.app</a>
      </p>
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

/** Header and footer stay mounted across page changes. */
const shellRoute = createRoute({ getParentRoute: () => rootRoute, id: "site-shell", component: SiteShell, notFoundComponent: NotFoundPage });

const home = lazyRouteComponent(() => import("./page-home"), "HomePage");
const download = lazyRouteComponent(() => import("./page-download"), "DownloadPage");
const guide = lazyRouteComponent(() => import("./page-guide"), "GuidePage");
const faq = lazyRouteComponent(() => import("./page-faq"), "FaqPage");

// Tibetan pages at the root, the same pages in Chinese under /zh/ (shared/locales.ts).
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

export const makeRouter = (url?: string) => createRouter({
  ...(url ? { history: createMemoryHistory({ initialEntries: [url] }), isServer: true } : {}),
  routeTree,
  // The site is deployed as directories, so canonical addresses end with a slash and generated links must too.
  trailingSlash: "always",
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: LoadError,
  scrollRestoration: true,
  defaultPreload: "intent",
  defaultPreloadDelay: 50,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof makeRouter>;
  }
}
