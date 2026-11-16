import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export type TocEntry = { id: string; text: string; isSubItem: boolean };

/**
 * 把指南之间的相对链接改写成站内地址。
 *
 * 文档源自独立仓库，互相引用时写的是 `macos-voice.md` —— 在 GitHub 上能跳，放到站上就是死链：这一页的地址是 `/docs/?platform=xxx`，没有 `.md` 这个文件。认得出来的改写成对应的平台参数，认不出来的原样留着，不去猜。
 */
export const linkGuideCrossReferences = (html: string, knownGuides: readonly string[], prefix = "") => {
  const holder = document.createElement("div");
  holder.innerHTML = html;

  holder.querySelectorAll<HTMLAnchorElement>("a[href$='.md'], a[href*='.md#']").forEach((link) => {
    const href = link.getAttribute("href") ?? "";
    if (/^[a-z]+:|^\//i.test(href)) return;

    const match = /^([\w-]+)\.md(#.*)?$/.exec(href);
    if (!match || !knownGuides.includes(match[1])) return;

    link.setAttribute("href", `${prefix}/docs/${match[1]}/${match[2] ?? ""}`);
  });

  return holder.innerHTML;
};

/**
 * 给正文标题编好锚点 id，同时把目录条目一并算出来。
 *
 * 文档页要二级和三级，内容页只要二级 —— 那边每个二级标题就是一张卡片，把卡片里的小标题也列进去反而失去索引的作用。
 */
export const withHeadingIds = (bodyHtml: string, selector = "h2, h3") => {
  const holder = document.createElement("div");
  holder.innerHTML = bodyHtml;

  const usedIds = new Map<string, number>();
  const toc: TocEntry[] = [];

  holder.querySelectorAll<HTMLElement>("h2, h3, h4, h5, h6").forEach((heading) => {
    const text = heading.textContent?.trim() ?? "";
    const baseId =
      text
        .toLocaleLowerCase()
        .replace(/[^\p{Letter}\p{Number}\s_-]/gu, "")
        .trim()
        .replace(/[\s_]+/g, "-") || "section";
    const occurrence = (usedIds.get(baseId) ?? 0) + 1;
    const headingId = occurrence === 1 ? baseId : `${baseId}-${occurrence}`;

    usedIds.set(baseId, occurrence);
    heading.id = headingId;
    if (heading.matches(selector)) toc.push({ id: headingId, text, isSubItem: heading.tagName === "H3" });
  });

  return { html: holder.innerHTML, toc };
};

/**
 * 目录高亮跟随正文滚动。
 *
 * 点目录之后到滚动停下之前先锁住，否则平滑滚动会把沿途每一节都点亮一遍。长距离的平滑滚动要一秒多，`scrollend` 才是准点；没有这个事件的浏览器靠超时兜底。中途自己滚就交还控制权 —— 键盘翻页和拖滚动条都不产生 wheel / touchstart，所以 keydown 和 pointerdown 也要放行。
 */
export const useTocScrollSpy = (
  toc: TocEntry[],
  articleRef: RefObject<HTMLElement | null>,
  tocRef: RefObject<HTMLElement | null>,
  sidebarRef: RefObject<HTMLElement | null>
) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const lockedRef = useRef(false);
  const unlockTimerRef = useRef(0);

  const lockUntilScrollEnds = useCallback((id: string) => {
    setActiveId(id);
    lockedRef.current = true;
    window.clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = window.setTimeout(() => {
      lockedRef.current = false;
    }, 2000);
  }, []);

  useEffect(() => {
    const article = articleRef.current;
    if (!article || toc.length === 0) {
      setActiveId(null);
      return;
    }

    const headings = toc
      .map((entry) => article.querySelector<HTMLElement>(`#${CSS.escape(entry.id)}`))
      .filter((heading): heading is HTMLElement => heading !== null);

    // 顶栏是固定的，判定线要压到它下面。顶栏是静态节点，高度只跟 CSS 变量走，查一次就够了
    const headerWrap = document.querySelector<HTMLElement>(".header-wrap");

    const updateActive = () => {
      if (lockedRef.current || headings.length === 0) return;

      const offset = (headerWrap?.offsetHeight ?? 68) + 24;
      let index = 0;

      for (let i = 0; i < headings.length; i += 1) {
        if (headings[i].getBoundingClientRect().top - offset > 0) break;
        index = i;
      }

      // 触底时直接点亮最后一节，否则末尾几节永远轮不到
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

      setActiveId(headings[atBottom ? headings.length - 1 : index].id);
    };

    const releaseLock = () => {
      lockedRef.current = false;
      window.clearTimeout(unlockTimerRef.current);
    };

    const onScrollEnd = () => {
      releaseLock();
      updateActive();
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        updateActive();
      });
    };

    window.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("wheel", releaseLock, { passive: true });
    window.addEventListener("touchstart", releaseLock, { passive: true });
    window.addEventListener("keydown", releaseLock);
    window.addEventListener("pointerdown", releaseLock);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("load", updateActive);

    // 带 hash 进来时浏览器要等一帧才滚到位；图片加载完还会顶一次版面，落定后再校准一次
    const initialFrame = requestAnimationFrame(updateActive);

    return () => {
      window.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("wheel", releaseLock);
      window.removeEventListener("touchstart", releaseLock);
      window.removeEventListener("keydown", releaseLock);
      window.removeEventListener("pointerdown", releaseLock);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("load", updateActive);
      cancelAnimationFrame(initialFrame);
      window.clearTimeout(unlockTimerRef.current);
    };
  }, [toc, articleRef]);

  /** 量出当前项的位置和高度，交给目录那块滑动胶囊。目录项高度不一（二三级字号不同），所以尺寸也要一起给。 */
  useLayoutEffect(() => {
    const element = tocRef.current;
    if (!element) return;

    // 依赖里带上 toc：换平台会整份重建目录，条目位置全变。两份指南可能出现同名小节（都有「下载与安装」），只盯着 activeId 的话那种情况不会重算。
    const link =
      activeId && toc.length > 0 ? element.querySelector<HTMLElement>(`a[href="#${CSS.escape(activeId)}"]`) : null;

    if (!link) {
      element.style.setProperty("--toc-on", "0");
      return;
    }

    element.style.setProperty("--toc-y", `${link.offsetTop}px`);
    element.style.setProperty("--toc-h", `${link.offsetHeight}px`);
    element.style.setProperty("--toc-on", "1");
  }, [activeId, toc, tocRef]);

  /** 侧栏自己可滚动（窄屏时是目录本身），高亮项跑出可视区就带进来 */
  useLayoutEffect(() => {
    if (!activeId) return;

    const toc = tocRef.current;
    const box =
      toc && toc.scrollHeight > toc.clientHeight
        ? toc
        : sidebarRef.current && sidebarRef.current.scrollHeight > sidebarRef.current.clientHeight
          ? sidebarRef.current
          : null;
    const link = toc?.querySelector<HTMLElement>(`a[href="#${CSS.escape(activeId)}"]`);
    if (!box || !link) return;

    const linkRect = link.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();

    if (linkRect.top < boxRect.top + 8) {
      box.scrollTop -= boxRect.top + 8 - linkRect.top;
    } else if (linkRect.bottom > boxRect.bottom - 8) {
      box.scrollTop += linkRect.bottom - (boxRect.bottom - 8);
    }
  }, [activeId, tocRef, sidebarRef]);

  return { activeId, lockUntilScrollEnds };
};
