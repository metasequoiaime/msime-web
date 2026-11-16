import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // index.html is the only entry. scripts/build-seo.mjs prerenders every page registered in shared/site-seo.ts into dist/<path>/index.html (and dist/404.html, which Cloudflare Pages serves with a real 404 status for unmatched addresses) from this one template.
  build: {
    manifest: true,
  },
});
