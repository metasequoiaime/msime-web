import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 网页输入法的 SDK 用 new Worker(new URL("./worker.js", import.meta.url)) 起引擎，开发服务器预构建会改写这个地址，Worker 就加载不到了。
  optimizeDeps: { exclude: ["@msime/web-engine"] },
  // index.html is the only entry. scripts/build-seo.mjs prerenders every page registered in shared/site-seo.ts into dist/<path>/index.html (and dist/404.html, which Cloudflare Pages serves with a real 404 status for unmatched addresses) from this one template.
  build: {
    manifest: true,
  },
});
