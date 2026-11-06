import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMarkdown } from "../lib/markdown";

const html = (s: string): string => renderToStaticMarkup(renderMarkdown(s) as never);

describe("renderMarkdown", () => {
  it("renders paragraphs and single line breaks", () => {
    expect(html("first\n\nsecond")).toBe("<p>first</p><p>second</p>");
    expect(html("a\nb")).toContain("<br/>");
  });
  it("renders bold, italic, and inline code", () => {
    expect(html("**bold**")).toContain("<strong>bold</strong>");
    expect(html("*italic*")).toContain("<em>italic</em>");
    expect(html("`code`")).toContain("<code>code</code>");
  });
  it("renders fenced code blocks as raw text", () => {
    const out = html("```\n<foo> & bar\n```");
    expect(out).toContain("<pre><code>&lt;foo&gt; &amp; bar</code></pre>");
  });
  it("renders unordered, ordered, and one-level nested lists", () => {
    const out = html("- a\n- b");
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>a</li>");
    const ord = html("1. one\n2. two");
    expect(ord).toContain("<ol>");
    const nested = html("- parent\n  - child");
    expect(nested).toContain("<ul><li>parent<ul>");
  });
  it("renders headings as bold text, not heading tags", () => {
    const out = html("## Net income");
    expect(out).toContain("<strong>Net income</strong>");
    expect(out).not.toMatch(/<h[1-6]/);
  });
  it("renders tables in a scrollable wrapper and pads ragged rows", () => {
    const out = html("| A | B |\n|---|---|\n| 1 |\n| 1 | 2 | 3 |");
    expect(out).toContain("md-table");
    expect(out).toContain("<table>");
    expect(out).toContain("<th>A</th>");
    // Short row padded, long row truncated to the header width.
    expect(out.match(/<td[\s>]/g)?.length).toBe(4);
  });
  it("renders XSS payloads as inert text", () => {
    const out = html("<script>alert(1)</script>");
    expect(out).toContain("&lt;script&gt;");
    expect(out).not.toContain("<script>");
    const img = html('<img src=x onerror=alert(1)>');
    expect(img).toContain("&lt;img");
    expect(img).not.toContain("<img");
    const js = html("[click](javascript:alert(1))");
    expect(js).not.toContain("<a");
    expect(js).not.toContain("javascript:alert");
  });
  it("leaves unbalanced markup and money figures untouched", () => {
    expect(html("**oops")).not.toContain("<strong>");
    expect(html("`code")).not.toContain("<code>");
    expect(html("(5,000.00) and $24,697.50")).toContain("(5,000.00) and $24,697.50");
  });
  it("normalizes CRLF and handles edge inputs", () => {
    expect(html("a\r\n\r\nb")).toBe("<p>a</p><p>b</p>");
    expect(html("")).toBe("");
    expect(html("   \n  ")).toBe("");
    expect(html("x".repeat(5000))).toContain("x".repeat(100));
    expect(html("y".repeat(300))).toContain("y".repeat(300));
  });
});
