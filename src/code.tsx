import { type ReactNode, useMemo } from "react";
// Ahead of the grammars, which extend the core as they load (see prism-runtime.ts). Only the grammars the code samples outside the guides use are loaded; the guides keep their own set in markdown.ts.
import Prism from "./prism-runtime";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-bash";
import { cx } from "./ui";

/** A Prism grammar loaded above; `text` is shown as written, for directory listings and sample output. */
export type CodeLanguage = "rust" | "c" | "bash" | "text";

/** A code block highlighted the way the guides' fences are: the same Prism tokens, coloured by the `code-highlight` rules in prose.css, at render time so the static HTML carries the colours too. Prism escapes what it returns, so its HTML is safe to insert. */
export function HighlightedCode({ code, language, className }: { code: string; language: CodeLanguage; className?: string }) {
  // React 19 rewrites innerHTML whenever the `dangerouslySetInnerHTML` object changes identity, so the markup is kept for as long as the code and language are the same.
  const markup = useMemo(() => {
    const grammar = language === "text" ? undefined : Prism.languages[language];
    return grammar ? { __html: Prism.highlight(code, grammar, language) } : undefined;
  }, [code, language]);
  return (
    <pre className={cx("code-highlight m-0 overflow-x-auto rounded-field bg-panel-2 px-3.5 py-3 text-[13px] leading-[1.7] text-ink", className)}>
      {markup ? (
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Prism 输出的是它自己转义过的标记，代码都是本仓库写死的示例
        <code dangerouslySetInnerHTML={markup} />
      ) : (
        <code>{code}</code>
      )}
    </pre>
  );
}

/** A name or path in running text; long ones break anywhere rather than overflow on a phone. */
export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded-md bg-panel px-1.5 py-px text-[13px] text-ink [overflow-wrap:anywhere] [box-decoration-break:clone]">{children}</code>;
}
