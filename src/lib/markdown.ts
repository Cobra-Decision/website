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
  // Inline Code (always LTR with word break)
  let out = text.replace(/`([^`]+)`/g, (_, code) => `<code class="bg-base-300 px-1.5 py-0.5 rounded text-xs text-primary font-mono break-all inline-block max-w-full" dir="ltr">${escapeHtml(code)}</code>`);

  // Bold & Italic
  out = out.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  out = out.replace(/___([^_]+)___/g, "<strong><em>$1</em></strong>");

  // Bold
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Links [text](url) with anywhere overflow wrapping
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safeUrl = sanitizeUrl(url);
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="link link-primary font-medium hover:underline break-words [overflow-wrap:anywhere]">${label}</a>`;
  });

  return out;
}

function isRtlText(text: string): boolean {
  const rtlChars = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
  const ltrChars = /[a-zA-Z]/;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (rtlChars.test(ch)) return true;
    if (ltrChars.test(ch)) return false;
  }
  return false;
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
        htmlParts.push(`<pre class="p-3 sm:p-4 rounded-xl bg-base-300 max-w-full overflow-x-auto text-xs sm:text-sm my-3 font-mono text-left" dir="ltr"><code>${codeBlockBuffer.join("\n")}</code></pre>`);
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
      htmlParts.push(`<h3 dir="auto" class="font-bold text-base sm:text-lg mt-4 mb-2 break-words [overflow-wrap:anywhere]">${parseInline(escapeHtml(trimmed.slice(4)))}</h3>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      htmlParts.push(`<h2 dir="auto" class="font-bold text-lg sm:text-xl mt-5 mb-2 border-b border-base-200/60 pb-1 break-words [overflow-wrap:anywhere]">${parseInline(escapeHtml(trimmed.slice(3)))}</h2>`);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      htmlParts.push(`<h1 dir="auto" class="font-black text-xl sm:text-2xl mt-6 mb-3 border-b border-base-200/60 pb-1 break-words [overflow-wrap:anywhere]">${parseInline(escapeHtml(trimmed.slice(2)))}</h1>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushList();
      htmlParts.push(`<blockquote dir="auto" class="border-s-4 border-primary/40 ps-4 py-1 my-3 italic opacity-90 break-words [overflow-wrap:anywhere]">${parseInline(escapeHtml(trimmed.slice(2)))}</blockquote>`);
      continue;
    }

    // Unordered list (- or *)
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      const itemContent = ulMatch[1] ?? "";
      const itemDir = isRtlText(itemContent) ? "rtl" : "ltr";
      if (!inUnorderedList) {
        flushList();
        htmlParts.push(`<ul class="list-disc ps-6 space-y-1.5 my-2 max-w-full" dir="${itemDir}">`);
        inUnorderedList = true;
      }
      htmlParts.push(`<li dir="${itemDir}" class="break-words [overflow-wrap:anywhere]">${parseInline(escapeHtml(itemContent))}</li>`);
      continue;
    }

    // Ordered list (1. 2.)
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      const itemContent = olMatch[1] ?? "";
      const itemDir = isRtlText(itemContent) ? "rtl" : "ltr";
      if (!inOrderedList) {
        flushList();
        htmlParts.push(`<ol class="list-decimal ps-6 space-y-1.5 my-2 max-w-full" dir="${itemDir}">`);
        inOrderedList = true;
      }
      htmlParts.push(`<li dir="${itemDir}" class="break-words [overflow-wrap:anywhere]">${parseInline(escapeHtml(itemContent))}</li>`);
      continue;
    }

    // Regular paragraph
    flushList();
    htmlParts.push(`<p dir="auto" class="my-2 leading-relaxed break-words [overflow-wrap:anywhere]">${parseInline(escapeHtml(trimmed))}</p>`);
  }

  flushList();
  if (inCodeBlock) {
    htmlParts.push(`<pre class="p-3 sm:p-4 rounded-xl bg-base-300 max-w-full overflow-x-auto text-xs sm:text-sm my-3 font-mono text-left" dir="ltr"><code>${codeBlockBuffer.join("\n")}</code></pre>`);
  }

  return htmlParts.join("\n");
}
