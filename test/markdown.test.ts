import { expect, test } from "bun:test";
import { renderMarkdown } from "../src/lib/markdown";

test("renders empty string for null or empty markdown", () => {
  expect(renderMarkdown("")).toBe("");
  expect(renderMarkdown(null)).toBe("");
  expect(renderMarkdown(undefined)).toBe("");
});

test("renders headings safely", () => {
  const md = "# Heading 1\n## Heading 2\n### Heading 3";
  const html = renderMarkdown(md);
  expect(html).toContain("<h1>Heading 1</h1>");
  expect(html).toContain("<h2>Heading 2</h2>");
  expect(html).toContain("<h3>Heading 3</h3>");
});

test("renders bold, italic, and inline code", () => {
  const md = "This is **bold** and *italic* and `inline_code`.";
  const html = renderMarkdown(md);
  expect(html).toContain("<strong>bold</strong>");
  expect(html).toContain("<em>italic</em>");
  expect(html).toContain('<code class="bg-base-300 px-1.5 py-0.5 rounded text-xs text-primary">inline_code</code>');
});

test("renders blockquotes and lists", () => {
  const md = `> Important note\n\n- Item 1\n- Item 2\n\n1. First\n2. Second`;
  const html = renderMarkdown(md);
  expect(html).toContain("<blockquote");
  expect(html).toContain("Important note");
  expect(html).toContain("<ul");
  expect(html).toContain("<li>Item 1</li>");
  expect(html).toContain("<ol");
  expect(html).toContain("<li>First</li>");
});

test("renders safe links and sanitizes XSS attempts", () => {
  const md = "[Safe](https://example.com) and [Dangerous](javascript:alert(1)) and <script>alert('xss')</script>";
  const html = renderMarkdown(md);
  expect(html).toContain('href="https://example.com"');
  expect(html).not.toContain("javascript:alert");
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
});

test("renders code blocks with syntax block wrapper", () => {
  const md = "```ts\nconst x = 42;\nconsole.log(x);\n```";
  const html = renderMarkdown(md);
  expect(html).toContain("<pre");
  expect(html).toContain("<code>const x = 42;\nconsole.log(x);</code>");
});
