import { cn } from "@/lib/utils";

/**
 * Renders lightweight structured text safely (no HTML injection):
 * blank-line separated blocks, "## " headings, "- " bullet lists and "> " notes.
 * Phase 4 replaces this with sanitized rich-text from the editor.
 */
export function Prose({ text, className }: { text: string; className?: string }) {
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <div className={cn("text-ink/80 space-y-5 text-base leading-8 sm:text-[1.05rem]", className)}>
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={i} className="text-primary pt-3 text-xl font-bold sm:text-2xl">
              {block.slice(3)}
            </h2>
          );
        }
        if (block.startsWith("> ")) {
          return (
            <p key={i} className="rounded-brand border-secondary bg-secondary-50 text-ink/75 border-s-4 px-5 py-4 text-sm">
              {block.slice(2)}
            </p>
          );
        }
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="space-y-2.5">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-3">
                  <span className="bg-secondary mt-3 size-1.5 shrink-0 rounded-full" aria-hidden />
                  <span>{l.slice(2)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (lines.some((l) => l.startsWith("- "))) {
          const [head, ...rest] = lines;
          return (
            <div key={i} className="space-y-2.5">
              <p>{head}</p>
              <ul className="space-y-2.5">
                {rest.map((l, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="bg-secondary mt-3 size-1.5 shrink-0 rounded-full" aria-hidden />
                    <span>{l.replace(/^- /, "")}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        return <p key={i}>{block}</p>;
      })}
    </div>
  );
}
