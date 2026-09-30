import { useEffect, useMemo } from "react";
import resumeSource from "./content/resume.md?raw";
import { markdown } from "./markdown";
import { usePageMeta } from "./page-meta";
import "./styles/resume.css";

/** 个人简历页：不挂站点顶栏和页脚，样式（含打印版式）全部在 `styles/resume.css`，入口 HTML 里带 noindex。 */
export function ResumePage() {
  const html = useMemo(() => {
    const holder = document.createElement("div");
    holder.innerHTML = markdown.render(resumeSource);

    holder.querySelectorAll("a").forEach((link) => {
      link.target = "_blank";
      link.rel = "noreferrer";
    });

    return holder.innerHTML;
  }, []);

  usePageMeta("陆凡 | 软件工程师 / 独立开发者", "陆凡的软件工程师个人简历");

  useEffect(() => {
    document.body.classList.add("resume-body");
    return () => {
      document.body.classList.remove("resume-body");
    };
  }, []);

  return (
    <main className="resume-page">
      <article
        className="resume-content"
        id="resume-content"
        aria-live="polite"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: 正文是本仓库自带 markdown 渲染出来的，markdown-it 关掉了 html 透传
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
