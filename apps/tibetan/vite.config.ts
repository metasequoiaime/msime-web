import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { selectEdition } from "./src/release";

const RELEASES_MODULE = "virtual:edition-releases";

/** Picks this edition's installers out of the copied release manifest at build time, so the pages ship only that small result. */
function editionReleases(): Plugin {
  const manifest = resolve(import.meta.dirname, "public/platforms.json");
  return {
    name: "edition-releases",
    resolveId: id => (id === RELEASES_MODULE ? `\0${RELEASES_MODULE}` : undefined),
    load(id) {
      if (id !== `\0${RELEASES_MODULE}`) return undefined;
      this.addWatchFile(manifest);
      return `export const releases = ${JSON.stringify(selectEdition(JSON.parse(readFileSync(manifest, "utf8"))))};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), editionReleases()],
  // index.html is the only entry. scripts/build-seo.mjs prerenders every page registered in shared/site-seo.ts into dist/<path>/index.html (and dist/404.html, which Cloudflare Pages serves with a real 404 status for unmatched addresses) from this one template.
  build: {
    manifest: true,
  },
});
