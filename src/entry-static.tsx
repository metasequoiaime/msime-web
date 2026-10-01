import { renderToString } from "react-dom/server";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { attachRouterServerSsrUtils } from "@tanstack/react-router/ssr/server";
import { makeRouter } from "./routes";
import { ThemeProvider } from "./theme";

export async function render(url: string, data: Record<string, unknown>) {
  const router = makeRouter(url);
  attachRouterServerSsrUtils({ router, manifest: undefined });
  const ssr = router.serverSsr;
  if (!ssr) throw new Error("Router SSR setup failed");
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  for (const [key, value] of Object.entries(data)) client.setQueryData([key], value);
  await router.load();
  await ssr.dehydrate();
  const html = renderToString(<QueryClientProvider client={client}><ThemeProvider><RouterProvider router={router} /></ThemeProvider></QueryClientProvider>);
  // The router hands its hydration state over as script tags meant for its own `<Scripts>` component, which this static build does not render. Only the script sources are needed: build-seo.mjs moves them into an external file. The stream boundary tag is left out because nothing is streamed after the initial take.
  const bootstrap = ssr.takeInitialHydrationScriptTags()?.before.map((tag) => tag.children ?? "") ?? [];
  if (!bootstrap.length) throw new Error("Router produced no hydration state");
  ssr.setRenderFinished();
  ssr.cleanup();
  client.clear();
  return { html, bootstrap };
}
