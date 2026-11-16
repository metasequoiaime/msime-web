import { useRouter } from "@tanstack/react-router";
import { useEffect, type RefObject } from "react";

/**
 * 让 markdown 正文里的站内链接走路由，而不是整页重载。
 *
 * 正文是用 innerHTML 塞进去的，里面的 `<a>` 不经过 Link 组件，点下去就是一次完整的导航：整份应用重新下载解析、滚动位置丢失、顶栏和索引重挂。下载页正文里指向 `/privacy/` 的链接、文档之间互相引用的链接，都属于这一类。
 *
 * 只接管确定该接管的：同源、非新窗口、没有修饰键、左键。其余（外链、下载、带 target 的）一律不碰。
 */
export const useInternalLinks = (containerRef: RefObject<HTMLElement | null>) => {
  const router = useRouter();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = (event.target as Element | null)?.closest?.("a");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download") || link.origin !== window.location.origin) return;

      // 纯锚点交给浏览器：它自己会平滑滚动，路由插手反而会打断
      const href = link.getAttribute("href") ?? "";
      if (href.startsWith("#")) return;

      event.preventDefault();
      void router.navigate({ to: link.pathname, search: Object.fromEntries(new URLSearchParams(link.search)), hash: link.hash.slice(1) || undefined });
    };

    container.addEventListener("click", onClick);
    return () => {
      container.removeEventListener("click", onClick);
    };
  }, [containerRef, router]);
};
