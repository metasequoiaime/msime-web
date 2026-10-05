import faqImageSources from "../vendor/MSIME-Docs/guides/assets/faq/sources.json";
const faqImages = import.meta.glob<string>("../vendor/MSIME-Docs/guides/assets/faq/*.png", { eager: true, query: "?url&no-inline", import: "default" });
import { isTraditional } from "../shared/locales";
import { toTraditional } from "../shared/translate";
import { localeHref } from "../shared/locales";
import { GUIDE_NAMES } from "../shared/site-seo";
import MarkdownIt from "markdown-it";
import "./prism";
// The core only: the package's main entry bundles plugins that touch Element at load, which the static render (linkedom: a document, no Element) does not have.
import Prism from "prismjs/components/prism-core";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-powershell";
import "prismjs/components/prism-json";

/** Fence names used in this site's markdown and the guides, mapped to the Prism grammar that highlights them. */
const PRISM_LANGUAGES: Record<string, string> = { js: "javascript", javascript: "javascript", html: "markup", xml: "markup", sh: "bash", shell: "bash", bash: "bash", powershell: "powershell", ps1: "powershell", json: "json" };

export const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  // Prism escapes what it returns, so markdown-it uses it as the block's HTML; an empty string falls back to markdown-it's own escaping, for fences in other languages.
  highlight: (code, lang) => {
    const name = PRISM_LANGUAGES[lang.toLowerCase()];
    const grammar = name ? Prism.languages[name] : undefined;
    return grammar && name ? Prism.highlight(code, grammar, name) : "";
  },
});

export function localizedHtml(html: string, path: string) {
  if (!isTraditional(path)) return html;
  const holder = document.createElement("div");
  holder.innerHTML = html;
  const visit = (node: Node) => {
    if (node.nodeType === 3) node.textContent = toTraditional(node.textContent ?? "");
    else if (!(node instanceof HTMLElement) || !["CODE", "PRE"].includes(node.tagName)) node.childNodes.forEach(visit);
  };
  visit(holder);
  localizeSiteLinks(holder, path);
  return holder.innerHTML;
}

const SITE_ORIGIN = "https://msime.app";

/**
 * 把旧的 `/docs/?platform=xxx` 地址换成指南自己的地址。
 *
 * 每个指南现在有独立地址，但固定 gitlink 里的 FAQ 仍按旧写法互相引用，一共十二条。旧地址指向 `/docs/`，而 `/docs/` 的 canonical 是 Windows 指南 —— 于是 macOS 和 Linux 指南在全站拿不到任何一条指向自己的站内链接，两页都停在 Search Console 的「已发现、尚未编入索引」。
 *
 * 这里原先只认字符串完全等于 `/docs/` 的写法，而十二条链接每一条都带查询或锚点，没有一条命中。
 */
const canonicalGuideHref = (href: string) => {
  const match = /^\/docs\/?(\?[^#]*)?(#.*)?$/.exec(href);
  if (!match) return href;
  const query = new URLSearchParams(match[1] ?? "");
  const guide = query.get("platform") ?? "";
  query.delete("platform");
  const rest = query.toString();
  return `/docs/${Object.hasOwn(GUIDE_NAMES, guide) ? guide : "windows"}/${rest ? `?${rest}` : ""}${match[2] ?? ""}`;
};

/** Docs 是独立仓库，正文里写的是绝对地址，便于在别处引用。渲染到本站时换回站内路径，否则自己的图片和链接要绕一圈生产域名，本地预览和非生产部署都会走外网。 */
const localizeSiteLinks = (root: ParentNode, localePath: string) => {
  const strip = (element: Element, attribute: string) => {
    const value = element.getAttribute(attribute);
    if (value?.startsWith(`${SITE_ORIGIN}/`)) element.setAttribute(attribute, value.slice(SITE_ORIGIN.length));
  };

  root.querySelectorAll("a[href]").forEach((element) => {
    strip(element, "href");
    element.setAttribute("href", canonicalGuideHref(element.getAttribute("href") ?? ""));
  });
  root.querySelectorAll("a[href]").forEach(element => { element.setAttribute("href", localeHref(element.getAttribute("href") ?? "", localePath)); });
  root.querySelectorAll("img[src]").forEach((element) => {
    strip(element, "src");
    const source = element.getAttribute("src") ?? "";
    const match = source.match(/^(?:\.\.\/)?assets\/faq\/([^/]+\.png)$/);
    if (match) {
      const name = match[1] as keyof typeof faqImageSources.images;
      const asset = faqImages[`../vendor/MSIME-Docs/guides/assets/faq/${name}`];
      const info = faqImageSources.images[name];
      if (asset && info) {
        element.setAttribute("src", asset);
        element.setAttribute("width", String(info.width));
        element.setAttribute("height", String(info.height));
        element.setAttribute("loading", "lazy");
        element.setAttribute("decoding", "async");
        const link = document.createElement("a");
        link.href = asset;
        link.target = "_blank";
        link.rel = "noopener";
        link.setAttribute("aria-label", `${element.getAttribute("alt")} · ${isTraditional(localePath) ? "檢視原圖" : "查看原图"}`);
        element.replaceWith(link);
        link.append(element);
      }
    }
    // The installer screenshot was retired from the site; the pinned Docs revision still embeds it, so drop it here (and the paragraph it leaves empty) until the gitlink moves past its removal.
    if (element.getAttribute("src") === "/screenshots/install-finish.png") {
      const parent = element.parentElement;
      element.remove();
      if (parent?.tagName === "P" && !parent.textContent?.trim() && !parent.children.length) parent.remove();
    }
  });
};

/**
 * 键名对照：文档里怎么写，页面上就怎么显示，只把几个约定俗成的记号换成符号。
 *
 * 不做平台猜测 —— macOS 指南写 `Option`，Windows 指南写 `Alt`，各自说的就是各自平台的那颗键，替读者「翻译」反而会说错。
 */
const KEY_GLYPHS: Record<string, string> = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
};

/** 认得出来的键名。只收这些是有意的：认不准就当普通字面量，宁可少认，不能把 `date`、`openai` 这种词渲染成键帽。 */
const KEY_NAMES = new Set(
  [
    "Shift", "Ctrl", "Control", "Alt", "Option", "Opt", "Cmd", "Command", "Win", "Super", "Meta", "Fn",
    "Enter", "Return", "Esc", "Escape", "Tab", "Space", "Backspace", "Delete", "Del", "Insert",
    "Home", "End", "Page Up", "Page Down", "PageUp", "PageDown", "Caps Lock", "CapsLock",
    "↑", "↓", "←", "→", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  ].map((name) => name.toLowerCase())
);

const MODIFIERS = new Set(
  ["Shift", "Ctrl", "Control", "Alt", "Option", "Opt", "Cmd", "Command", "Win", "Super", "Meta", "Fn"].map((name) =>
    name.toLowerCase()
  )
);

const isKeyName = (token: string) => {
  const key = token.trim();
  if (!key) return false;
  if (KEY_NAMES.has(key.toLowerCase())) return true;
  if (/^F([1-9]|1[0-2])$/.test(key)) return true;
  // 组合键里的那一颗普通键：`Ctrl + Shift + E` 的 E、`Ctrl + .` 的句点，或者 `Shift + 数字` 这种占位说法
  return /^[^\s]$/.test(key) || /^[\u4e00-\u9fa5]{1,3}$/.test(key);
};

/**
 * 把按键从普通字面量里分出来。
 *
 * 指南里三种东西现在都写成反引号：按键（`Esc`、`Ctrl + Shift + E`）、要敲的编码（`ni'hao`、`xq`）、技术字面量（`vc_redist.x86.exe`、`XDG_DATA_HOME`）。对输入法来说按键是它的词汇，混在一起读者得逐个分辨。
 *
 * 组合键拆成一颗一颗键帽，`+` 留在外面 —— 那才是按键的写法，也比一整条长胶囊好扫。文档是独立仓库的，所以在渲染这一层做，不去改源文件。
 */
const markUpKeystrokes = (root: ParentNode) => {
  root.querySelectorAll("code").forEach((element) => {
    // 只处理行内代码。代码块整段是要照抄的命令，把里面某个词换成键帽就抄不出来了。
    if (element.closest("pre")) return;

    const text = element.textContent?.trim() ?? "";
    if (!text) return;

    const parts = text.split("+").map((part) => part.trim());
    // 组合键以修饰键开头才算数：这样 `Ctrl + .` 和 `Shift + 数字` 都能认出来，而 `+1f600`、`a + b` 这类不会被误判。
    // 单独一个字母或符号不足以判定，必须是认得出来的键名 —— 正文里的 `1`、`.` 更可能是候选序号或标点本身。
    const looksLikeKeys =
      parts.length > 1
        ? MODIFIERS.has(parts[0].toLowerCase()) && parts.every(isKeyName)
        : KEY_NAMES.has(text.toLowerCase()) || /^F([1-9]|1[0-2])$/.test(text);
    if (!looksLikeKeys) return;

    const replacement = document.createDocumentFragment();

    parts.forEach((part, index) => {
      if (index > 0) {
        const plus = document.createElement("span");
        plus.className = "kbd-plus";
        plus.textContent = "+";
        replacement.append(plus);
      }

      const cap = document.createElement("kbd");
      cap.textContent = KEY_GLYPHS[part] ?? part;
      replacement.append(cap);
    });

    element.replaceWith(replacement);
  });
};

/**
 * 把「打出来的字」和「要按的键」分开。
 *
 * 指南里两者都写成反引号：`Shift + 6 输入省略号 ……`。左边是要按的键，右边是按完得到的字符，装进同一种色块的话，读者会以为省略号也是一颗键。中文标点是这个产品的产出物，不该被框成能按下去的样子 —— 单独标出来、字号放大一点，让字形本身看得清。
 *
 * 只认整段都是中日韩标点的那种（`、` `《》` `……` `——`）。带 ASCII 的一律不动：`,` `.` `-` 这些在指南里指的是键盘上那颗键，不是产出的字符。
 */
const CJK_PUNCTUATION = /^[\u3000-\u303f\uff00-\uffef\u2014\u2026]{1,4}$/;

const markUpGlyphSamples = (root: ParentNode) => {
  root.querySelectorAll("code").forEach((element) => {
    if (element.closest("pre")) return;

    const text = element.textContent?.trim() ?? "";
    if (!CJK_PUNCTUATION.test(text)) return;

    const sample = document.createElement("samp");
    sample.className = "glyph-sample";
    sample.textContent = text;
    element.replaceWith(sample);
  });
};

/**
 * 把表格套进一个可横向滚动的容器。
 *
 * 表格本身原来就是 `display: block; overflow-x: auto`，所以内容能滑到 —— 但手机上没有任何迹象表明右边还有一列：390px 宽的屏幕上，三列的辅助码对照表只看得见前两列，右边缘干干净净，读者不知道「结果」那一列存在。而且 `overflow` 元素不可聚焦，键盘用户根本滚不动它。
 *
 * 套一层容器之后，边缘的渐隐提示由容器的伪元素来画（表格自己是 block，伪元素会跟着内容滚走），`tabindex` 让它能被聚焦、用方向键滚动，`role` 和 `aria-label` 告诉读屏这是一块可滚区域。
 */
const wrapScrollableTables = (root: ParentNode) => {
  root.querySelectorAll("table").forEach((table) => {
    if (table.parentElement?.classList.contains("table-scroll")) return;

    const scroller = document.createElement("div");
    scroller.className = "table-scroll";
    scroller.setAttribute("role", "region");
    scroller.setAttribute("aria-label", "表格，可横向滚动");
    scroller.tabIndex = 0;

    table.replaceWith(scroller);
    scroller.append(table);
  });
};

/** 一级标题与首段属于页头 hero，正文继续由 markdown 驱动 */
const liftHero = (root: ParentNode) => {
  const heading = root.querySelector("h1");
  if (!heading) return { title: "", leadHtml: "" };

  const title = heading.textContent ?? "";
  const intro = heading.nextElementSibling;
  let leadHtml = "";

  if (intro?.tagName === "P") {
    leadHtml = intro.innerHTML;
    intro.remove();
  }

  heading.remove();
  return { title, leadHtml };
};

const groupSections = (root: HTMLElement) => {
  const cards: HTMLElement[] = [];
  let current: HTMLElement | null = null;

  for (const node of Array.from(root.childNodes)) {
    if (current === null || (node instanceof HTMLElement && node.tagName === "H2")) {
      current = document.createElement("section");
      current.className = "card doc-card";
      current.setAttribute("data-reveal", "");
      cards.push(current);
    }

    current.appendChild(node);
  }

  root.replaceChildren(...cards.filter((card) => card.textContent?.trim()));
};

/** 仓库条目拆成两行：仓库名一行，说明一行 */
const splitRepoRows = (root: ParentNode) => {
  root.querySelectorAll<HTMLLIElement>("li").forEach((item) => {
    const link = item.firstChild;
    if (!(link instanceof HTMLElement) || link.tagName !== "A") return;

    const name = document.createElement("span");
    name.className = "repo-name";
    name.appendChild(link);

    const desc = document.createElement("span");
    desc.className = "repo-desc";
    while (item.firstChild) desc.appendChild(item.firstChild);

    // 冒号原本是名称和说明之间的分隔符，拆成两行之后不需要了
    const lead = desc.firstChild;
    if (lead?.nodeType === Node.TEXT_NODE) {
      lead.textContent = (lead.textContent ?? "").replace(/^\s*[：:]\s*/, "");
    }

    item.append(name, desc);
  });
};

export type ContentDocument = {
  /** 一级标题，交给页头渲染 */
  title: string;
  /** 首段，已经是 markdown 渲染过的行内 HTML */
  leadHtml: string;
  bodyHtml: string;
};

type RenderOptions = {
  /** 把每个二级标题及其后续内容包进独立卡片 */
  localePath?: string;
  sectioned?: boolean;
  /** 开源代码页把列表项拆成仓库名和说明两行 */
  repoRows?: boolean;
};

/**
 * 把一份 markdown 正文变成页头 + 正文两部分。
 *
 * 后处理仍然靠 DOM API，和之前直接操作页面时是同一套逻辑；区别是这里在一个游离节点里做完再交出 HTML 字符串，页面上不会出现处理到一半的中间状态。`html: false` 让 markdown 不会透传原始标签，游离节点里的 innerHTML 也不会执行脚本。
 */
export const renderContent = (source: string, { sectioned = false, repoRows = false, localePath = "/" }: RenderOptions = {}): ContentDocument => {
  const holder = document.createElement("div");
  holder.innerHTML = markdown.render(source);

  localizeSiteLinks(holder, localePath);
  markUpKeystrokes(holder);
  markUpGlyphSamples(holder);
  wrapScrollableTables(holder);
  const { title, leadHtml } = liftHero(holder);

  if (sectioned) groupSections(holder);
  if (repoRows) splitRepoRows(holder);

  return { title, leadHtml, bodyHtml: holder.innerHTML };
};
