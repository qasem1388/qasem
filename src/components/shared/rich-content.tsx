import { isHtml, sanitizeRichText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { Prose } from "./prose";

/** Renders stored page content: sanitised HTML from the editor, or legacy structured text. */
export function RichContent({ value, className }: { value: string; className?: string }) {
  if (!isHtml(value)) return <Prose text={value} className={className} />;
  return <div className={cn("rich-content", className)} dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }} />;
}
