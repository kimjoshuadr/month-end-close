// Small safe markdown-to-React renderer for AI replies. Builds elements from
// strings only (React escapes text), so raw HTML, script tags, and event
// handlers can only ever render as inert text. No anchors are rendered.

import { createElement, type ReactNode } from "react";

// [text](url) becomes plain "text (url)" text: URLs stay visible, never links.
// Dangerous schemes are dropped outright so they survive only as inert text.
function flattenLinks(s: string): string {
  return s.replace(/\[([^\]\n]*)\]\(([^)\n]*)\)/g, (_m: string, t: string, u: string) =>
    /^\s*(javascript|data|vbscript)\s*:/i.test(u) ? t : `${t} (${u})`
  );
}

function inlineNodes(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const codeParts = text.split(/(`[^`\n]+`)/g);
  codeParts.forEach((part, i) => {
    if (/^`[^`\n]+`$/.test(part)) {
      out.push(createElement("code", { key: `${key}c${i}` }, part.slice(1, -1)));
      return;
    }
    const boldParts = flattenLinks(part).split(/(\*\*[^*\n]+\*\*)/g);
    boldParts.forEach((b, j) => {
      if (/^\*\*[^*\n]+\*\*$/.test(b)) {
        out.push(createElement("strong", { key: `${key}b${i}-${j}` }, b.slice(2, -2)));
        return;
      }
      const itParts = b.split(/(\*[^*\n]+\*)/g);
      itParts.forEach((s, k) => {
        if (/^\*[^*\n]+\*$/.test(s)) out.push(createElement("em", { key: `${key}i${i}-${j}-${k}` }, s.slice(1, -1)));
        else if (s) out.push(s);
      });
    });
  });
  return out;
}

// Paragraph lines joined with explicit breaks (single newlines are breaks).
function breaks(lines: string[], key: string): ReactNode[] {
  const out: ReactNode[] = [];
  lines.forEach((l, i) => {
    if (i > 0) out.push(createElement("br", { key: `${key}br${i}` }));
    out.push(...inlineNodes(l, `${key}l${i}`));
  });
  return out;
}

type ListItem = { ordered: boolean; text: string; children: ListItem[] };

function parseList(lines: string[], start: number): { items: ListItem[]; next: number } {
  const items: ListItem[] = [];
  let i = start;
  while (i < lines.length) {
    const m = /^( *)([-*]|\d+[.)])\s+(.*)$/.exec(lines[i]);
    if (!m) break;
    const item: ListItem = { ordered: /^\d/.test(m[2]), text: m[3], children: [] };
    if (m[1].length >= 2 && items.length > 0) items[items.length - 1].children.push(item);
    else items.push(item);
    i++;
  }
  return { items, next: i };
}

function renderList(items: ListItem[], key: string): ReactNode {
  const runs: ListItem[][] = [];
  for (const it of items) {
    const last = runs[runs.length - 1];
    if (last && last[0].ordered === it.ordered) last.push(it);
    else runs.push([it]);
  }
  return runs.map((run, r) =>
    createElement(
      run[0].ordered ? "ol" : "ul",
      { key: `${key}r${r}` },
      run.map((it, n) =>
        createElement(
          "li",
          { key: `${key}i${n}` },
          ...inlineNodes(it.text, `${key}t${n}`),
          ...(it.children.length > 0 ? [renderList(it.children, `${key}c${n}`)] : [])
        )
      )
    )
  );
}

function isDelim(line: string): boolean {
  const cells = line.trim().replace(/^\||\|$/g, "").split("|");
  return cells.length > 0 && cells.every((c) => /^\s*:?-{1,}:?\s*$/.test(c));
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

function renderTable(header: string[], delim: string, body: string[][], key: string): ReactNode {
  const n = header.length;
  const aligns = splitRow(delim).map((c) => {
    const t = c.trim();
    if (t.startsWith(":") && t.endsWith(":")) return "center";
    if (t.endsWith(":")) return "right";
    return "left";
  });
  const row = (cells: string[], tag: "th" | "td", rk: string) => {
    const fixed = cells.slice(0, n);
    while (fixed.length < n) fixed.push("");
    return createElement(
      "tr",
      { key: rk },
      fixed.map((c, j) =>
        createElement(tag, { key: `${rk}c${j}`, ...(tag === "td" ? { style: { textAlign: aligns[j] ?? "left" } } : {}) }, ...inlineNodes(c, `${rk}x${j}`))
      )
    );
  };
  return createElement(
    "div",
    { key, className: "md-table" },
    createElement(
      "table",
      null,
      createElement("thead", null, row(header, "th", `${key}h`)),
      createElement("tbody", null, body.map((r, i) => row(r, "td", `${key}r${i}`)))
    )
  );
}

export function renderMarkdown(text: string): ReactNode {
  const src = text.replace(/\r\n?/g, "\n");
  if (!src.trim()) return null;
  const lines = src.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let bi = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // consume closing fence (or run off the end)
      blocks.push(createElement("pre", { key: `f${bi++}` }, createElement("code", null, buf.join("\n"))));
      continue;
    }
    if (line.includes("|") && i + 1 < lines.length && isDelim(lines[i + 1])) {
      const header = splitRow(line);
      const delim = lines[i + 1];
      const body: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|")) {
        body.push(splitRow(lines[i]));
        i++;
      }
      blocks.push(renderTable(header, delim, body, `t${bi++}`));
      continue;
    }
    const hm = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (hm) {
      blocks.push(createElement("p", { key: `h${bi++}`, className: "md-h" }, createElement("strong", null, ...inlineNodes(hm[2], `hh${bi}`))));
      i++;
      continue;
    }
    if (/^( *([-*]|\d+[.)])\s+)/.test(line)) {
      const { items, next } = parseList(lines, i);
      blocks.push(createElement("div", { key: `l${bi++}`, className: "md-list" }, renderList(items, `rl${bi}`)));
      i = next;
      continue;
    }
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^```/.test(lines[i]) && !/^(#{1,6})\s+/.test(lines[i].trim()) && !/^( *([-*]|\d+[.)])\s+)/.test(lines[i]) && !(lines[i].includes("|") && i + 1 < lines.length && isDelim(lines[i + 1]))) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(createElement("p", { key: `p${bi++}` }, ...breaks(buf, `pb${bi}`)));
  }
  return blocks;
}
