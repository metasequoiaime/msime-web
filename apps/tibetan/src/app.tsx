// Stylesheets first: app.css declares the cascade layer order before any other stylesheet reaches the page.
import "./app.css";
import { hydrate } from "@tanstack/react-router/ssr/client";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { makeRouter } from "./routes";
import { ThemeProvider } from "./theme";

async function start() {
  const router = makeRouter();
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
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </StrictMode>
  );

  if (prerendered) hydrateRoot(rootElement, app);
  else createRoot(rootElement).render(app);
}

void start().catch(error => {
  // The static HTML stays readable; log for diagnosis.
  console.error(error);
});
