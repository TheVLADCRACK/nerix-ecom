import "server-only";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/** Markdown → HTML assaini par liste blanche (contenu modifiable dans l'admin). */
export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false, gfm: true });
  return sanitizeHtml(html, {
    allowedTags: ["h2", "h3", "h4", "p", "a", "ul", "ol", "li", "strong", "em", "blockquote", "code", "pre", "table", "thead", "tbody", "tr", "th", "td", "br", "hr"],
    allowedAttributes: { a: ["href", "title", "rel"] },
    allowedSchemes: ["https", "mailto", "tel"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tag, attribs) => {
        const href = attribs.href ?? "";
        const external = /^https?:/.test(href);
        const out: Record<string, string> = external ? { href, rel: "noopener nofollow" } : { href };
        return { tagName: "a", attribs: out };
      },
    },
  });
}
