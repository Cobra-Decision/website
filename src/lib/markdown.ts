/**
 * Lightweight, safe Markdown-to-HTML parser and sanitizer.
 * Supports headings (#), bold (**), italic (*), code blocks (```),
 * inline code (`), blockquotes (>), unordered lists (- / *),
 * ordered lists (1.), links ([text](url)), and line breaks.
 * Each paragraph/block includes dir="auto" to natively align
 * English (LTR) from left and Persian/Arabic (RTL) from right.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:\/\/|\/|mailto:)/i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return "#";
}

function parseInline(text: string): string {
  // Inline Code (always LTR)
  let out = text.replace(/`([^`]+)`/g, (_, code) => `<code class="bg-base-300 px-1.5 py-0.5 rounded text-xs text-primary">${escapeHtml(code)}</code>`);

  // Bold & Italic
  out = out.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  out = out.replace(/___([^_]+)___/g, "<strong><em>$1</em></strong>");

  // Bold
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safeUrl = sanitizeUrl(url);
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="link link-primary font-medium hover:underline">${label}</a>`;
  });

  return out;
}

export function renderMarkdown(markdown: string | null | undefined): string {
  if (!markdown || !markdown.trim()) {
    return "";
  }

  const rawLines = markdown.split(/\r?\n/);
  const htmlParts: string[] = [];

  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;

  const flushList = () => {
    if (inUnorderedList) {
      htmlParts.push("</ul>");
      inUnorderedList = false;
    }
    if (inOrderedList) {
      htmlParts.push("</ol>");
      inOrderedList = false;
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]!;

    // Code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        htmlParts.push(`<pre class="p-4 rounded-xl bg-base-300 overflow-x-auto text-sm my-3 font-mono"><code>${codeBlockBuffer.join("\n")}</code></pre>`);
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(escapeHtml(line));
      continue;
    }

    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList();
      htmlParts.push(`<h3>${parseInline(escapeHtml(trimmed.slice(4)))}</h3>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      htmlParts.push(`<h2>${parseInline(escapeHtml(trimmed.slice(3)))}</h2>`);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      htmlParts.push(`<h1>${parseInline(escapeHtml(trimmed.slice(2)))}</h1>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushList();
      htmlParts.push(`<blockquote>${parseInline(escapeHtml(trimmed.slice(2)))}</blockquote>`);
      continue;
    }

    // Unordered list (- or *)
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (!inUnorderedList) {
        flushList();
        htmlParts.push("<ul>");
        inUnorderedList = true;
      }
      htmlParts.push(`<li>${parseInline(escapeHtml(ulMatch[1] ?? ""))}</li>`);
      continue;
    }

    // Ordered list (1. 2.)
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!inOrderedList) {
        flushList();
        htmlParts.push("<ol>");
        inOrderedList = true;
      }
      htmlParts.push(`<li>${parseInline(escapeHtml(olMatch[1] ?? ""))}</li>`);
      continue;
    }

    // Regular paragraph
    flushList();
    htmlParts.push(`<p>${parseInline(escapeHtml(trimmed))}</p>`);
  }

  flushList();
  if (inCodeBlock) {
    htmlParts.push(`<pre class="p-4 rounded-xl bg-base-300 overflow-x-auto text-sm my-3 font-mono"><code>${codeBlockBuffer.join("\n")}</code></pre>`);
  }

  return htmlParts.join("\n");
}
