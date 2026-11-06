"use client";

import { renderMarkdown } from "../lib/markdown";

// Safe AI-reply body: paragraphs, lists, code, tables. Never raw HTML.
export function Markdown({ text }: { text: string }) {
  return <div className="md">{renderMarkdown(text)}</div>;
}
