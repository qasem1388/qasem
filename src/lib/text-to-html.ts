const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Converts legacy structured text (## headings, - lists, > notes) to HTML for the rich-text editor. */
export function textToHtml(text: string): string {
  if (/^\s*</.test(text)) return text;
  return text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("## ")) return `<h2>${esc(block.slice(3))}</h2>`;
      if (block.startsWith("> ")) return `<blockquote><p>${esc(block.slice(2))}</p></blockquote>`;
      const lines = block.split("\n");
      const items = lines.filter((l) => l.startsWith("- "));
      if (items.length === lines.length) return `<ul>${items.map((l) => `<li><p>${esc(l.slice(2))}</p></li>`).join("")}</ul>`;
      if (items.length) {
        const [head, ...rest] = lines;
        return `<p>${esc(head)}</p><ul>${rest.map((l) => `<li><p>${esc(l.replace(/^- /, ""))}</p></li>`).join("")}</ul>`;
      }
      return `<p>${lines.map(esc).join("<br>")}</p>`;
    })
    .join("");
}
