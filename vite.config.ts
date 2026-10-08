import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 网页输入法的 SDK 用 new Worker(new URL("./worker.js", import.meta.url)) 起引擎，开发服务器预构建会改写这个地址，Worker 就加载不到了。
  optimizeDeps: { exclude: ["@msime/web-engine"] },
  build: {
    manifest: true,
    rolldownOptions: {
      input: {
        main: resolve(projectRoot, "index.html"),
        // Cloudflare Pages 用产物根目录的 404.html 应答未匹配的地址，并给出真正的 404 状态；
        // 它加载的还是同一个应用，所以显示的是站内那张「页面不存在」，而不是一张陌生的错误页。
        notFound: resolve(projectRoot, "404.html"),
        features: resolve(projectRoot, "features/index.html"),
        docs: resolve(projectRoot, "docs/index.html"),
        faq: resolve(projectRoot, "faq/index.html"),
        code: resolve(projectRoot, "code/index.html"),
        feedback: resolve(projectRoot, "feedback/index.html"),
        words: resolve(projectRoot, "words/index.html"),
        skins: resolve(projectRoot, "skins/index.html"),
        dictionaries: resolve(projectRoot, "dictionaries/index.html"),
        plugins: resolve(projectRoot, "plugins/index.html"),
        me: resolve(projectRoot, "me/index.html"),
        about: resolve(projectRoot, "about/index.html"),
        download: resolve(projectRoot, "download/index.html"),
        price: resolve(projectRoot, "price/index.html"),
        privacy: resolve(projectRoot, "privacy/index.html"),
        resume: resolve(projectRoot, "resume/index.html"),
      },
    },
  },
});
