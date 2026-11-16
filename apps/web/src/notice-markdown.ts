import MarkdownIt from "markdown-it";

/**
 * Notice bodies are simple Markdown written in the admin console. Raw HTML is escaped (`html: false`), images are not rendered (the page's CSP would block most of them anyway), and every link opens in a new tab without a referrer or opener. markdown-it's own link validation already refuses `javascript:` and other unsafe schemes.
 */
const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true }).disable("image");

const renderLinkOpen = markdown.renderer.rules.link_open ?? ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));
markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  tokens[index].attrSet("target", "_blank");
  tokens[index].attrSet("rel", "noopener noreferrer");
  return renderLinkOpen(tokens, index, options, env, self);
};

export const renderNoticeBody = (source: string) => markdown.render(source);
