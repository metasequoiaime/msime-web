import { renderToString } from "react-dom/server";
import { RouterProvider } from "@tanstack/react-router";
import { attachRouterServerSsrUtils } from "@tanstack/react-router/ssr/server";
import { makeRouter } from "./routes";
import { ThemeProvider } from "./theme";

export async function render(url: string) {
  const router = makeRouter(url);
  attachRouterServerSsrUtils({ router, manifest: undefined });
  const ssr = router.serverSsr;
  if (!ssr) throw new Error("Router SSR setup failed");
  await router.load();
  await ssr.dehydrate();
  const html = renderToString(<ThemeProvider><RouterProvider router={router} /></ThemeProvider>);
  // The router hands its hydration state over as script tags meant for its own `<Scripts>` component, which this static build does not render. Only the script sources are needed: build-seo.mjs moves them into an external file.
  const bootstrap = ssr.takeInitialHydrationScriptTags()?.before.map((tag) => tag.children ?? "") ?? [];
  if (!bootstrap.length) throw new Error("Router produced no hydration state");
  ssr.setRenderFinished();
  ssr.cleanup();
  return { html, bootstrap };
}
