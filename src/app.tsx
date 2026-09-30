// Stylesheets first: app.css declares the cascade layer order before any other stylesheet reaches the page.
import "./app.css";
import { PageLoadError } from "./page-load-error";
import { isTraditional } from "../shared/locales";
import { loadTraditional } from "../shared/translate";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { hydrate } from "@tanstack/react-router/ssr/client";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { makeRouter } from "./routes";
import { ThemeProvider } from "./theme";

async function start() {
  if (isTraditional(window.location.pathname)) await loadTraditional();
  const router = makeRouter();

  const queryClient = new QueryClient();
  const initialData = document.getElementById("static-query-data");
  if (initialData?.textContent) {
    try { for (const [key, value] of Object.entries(JSON.parse(initialData.textContent))) queryClient.setQueryData([key], value); }
    catch { /* The live queries recover if an HTML snapshot is incomplete. */ }
    initialData.remove();
  }

  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Missing #root; the page shell did not load.");

  // Keep the readable static HTML until the initial route and its code are ready.
  const prerendered = document.documentElement.dataset.prerendered === "true";
  if (prerendered) {
    if (!window.$_TSR) {
      const bootstrap = document.querySelector<HTMLScriptElement>("script[data-router-state]");
      if (!bootstrap) throw new Error("Missing router snapshot");
      await new Promise<void>((resolve, reject) => {
        bootstrap.addEventListener("load", () => resolve(), { once: true });
        bootstrap.addEventListener("error", () => reject(new Error("Router snapshot failed to load")), { once: true });
      });
    }
    await hydrate(router);
    window.$_TSR?.h();
  } else await router.load();

  const app = (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  );

  if (prerendered) hydrateRoot(rootElement, app);
  else createRoot(rootElement).render(app);

}

void start().catch(error => {
  const root = document.getElementById("root");
  if (root) createRoot(root).render(<PageLoadError error={error} />);
});
