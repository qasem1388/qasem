import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Allow-list sanitiser for rich-text page content. Runs when content is saved
 * and again when it is rendered, so stored HTML can never inject scripts,
 * event handlers, iframes or styles beyond text alignment.
 */
const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "h2",
    "h3",
    "h4",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "br",
    "hr",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "colgroup",
    "col",
    "code",
    "pre",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    th: ["colspan", "rowspan", "colwidth"],
    td: ["colspan", "rowspan", "colwidth"],
    col: ["style"],
    "*": ["style", "dir"],
  },
  allowedStyles: {
    "*": { "text-align": [/^(left|right|center|justify|start|end)$/] },
    col: { width: [/^\d+(px|%)$/], "min-width": [/^\d+(px|%)$/] },
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target === "_blank" ? { ...attribs, rel: "noopener noreferrer" } : { ...attribs, rel: attribs.rel ?? "" },
    }),
  },
  exclusiveFilter: (frame) => frame.tag === "img" && !/^(\/(?!\/)|https:\/\/)/.test(frame.attribs.src ?? ""),
};

export function sanitizeRichText(html: string) {
  return sanitizeHtml(html, options).trim();
}

export const isHtml = (text: string) => /^\s*</.test(text);
