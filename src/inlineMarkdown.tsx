// Tiny inline Markdown renderer for cheat-sheet items: **bold**, *italic*, `code`
// and [text](https://url). Returns React nodes (no HTML injection); anything
// unmatched, such as a lone backtick, stays literal text.
import type { ReactNode } from "react";

const token =
  /\*\*(.+?)\*\*|\*([^*\s](?:[^*]*[^*\s])?)\*|`([^`]+)`|\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g;

export function inlineMarkdown(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(token)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [, bold, italic, code, label, url] = m;
    const k = m.index;
    if (bold !== undefined)
      out.push(<strong key={k}>{inlineMarkdown(bold)}</strong>);
    else if (italic !== undefined)
      out.push(<em key={k}>{inlineMarkdown(italic)}</em>);
    else if (code !== undefined)
      out.push(
        <code key={k} className="rounded bg-subtle px-1 font-mono text-[0.9em]">
          {code}
        </code>,
      );
    else
      out.push(
        <a
          key={k}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {inlineMarkdown(label!)}
        </a>,
      );
    last = k + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
