import {
  BoldIcon,
  ItalicIcon,
  HeadingIcon,
  ListIcon,
  ListOrderedIcon,
  CodeIcon,
  LinkIcon,
} from "./icons";

export function MarkdownEditor({
  name = "description",
  value = "",
  placeholder = "Write a comprehensive description in Markdown...",
  rows = 6,
}: {
  name?: string;
  value?: string;
  placeholder?: string;
  rows?: number;
}) {
  const initialValue = value || "";
  return (
    <div
      class="border border-base-300 rounded-xl overflow-hidden bg-base-100 focus-within:border-primary transition"
      x-data={`{
        tab: 'write',
        content: ${JSON.stringify(initialValue)},
        previewHtml: '',
        renderPreview() {
          const text = this.content || '';
          if (!text.trim()) {
            this.previewHtml = '<span class="text-base-content/40 italic">Nothing to preview yet.</span>';
            return;
          }
          const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const isRtl = (s) => {
            const rtl = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
            const ltr = /[a-zA-Z]/;
            for (let i = 0; i < s.length; i++) {
              if (rtl.test(s[i])) return true;
              if (ltr.test(s[i])) return false;
            }
            return false;
          };
          const parseInline = (s) => {
            let res = s.replace(/\`([^\`]+)\`/g, '<code class="bg-base-300 px-1.5 py-0.5 rounded text-xs text-primary font-mono" dir="ltr">$1</code>');
            res = res.replace(/\\*\\*\\*([^*]+)\\*\\*\\*/g, '<strong><em>$1</em></strong>');
            res = res.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
            res = res.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
            res = res.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank" class="link link-primary font-medium hover:underline">$1</a>');
            return res;
          };

          const lines = text.split(/\\r?\\n/);
          const parts = [];
          let inCode = false;
          let codeBuf = [];
          let inUl = false;
          let inOl = false;

          const flushList = () => {
            if (inUl) { parts.push('</ul>'); inUl = false; }
            if (inOl) { parts.push('</ol>'); inOl = false; }
          };

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (trimmed.startsWith('\`\`\`')) {
              if (inCode) {
                parts.push('<pre class="p-4 rounded-xl bg-base-300 overflow-x-auto text-sm my-3 font-mono text-left" dir="ltr"><code>' + codeBuf.join('\\n') + '</code></pre>');
                codeBuf = [];
                inCode = false;
              } else {
                flushList();
                inCode = true;
              }
              continue;
            }

            if (inCode) {
              codeBuf.push(escape(line));
              continue;
            }

            if (!trimmed) {
              flushList();
              continue;
            }

            if (trimmed.startsWith('### ')) {
              flushList();
              parts.push('<h3 dir="auto" class="font-bold text-lg mt-4 mb-2">' + parseInline(escape(trimmed.slice(4))) + '</h3>');
              continue;
            }
            if (trimmed.startsWith('## ')) {
              flushList();
              parts.push('<h2 dir="auto" class="font-bold text-xl mt-5 mb-2 border-b pb-1">' + parseInline(escape(trimmed.slice(3))) + '</h2>');
              continue;
            }
            if (trimmed.startsWith('# ')) {
              flushList();
              parts.push('<h1 dir="auto" class="font-black text-2xl mt-6 mb-3 border-b pb-1">' + parseInline(escape(trimmed.slice(2))) + '</h1>');
              continue;
            }

            if (trimmed.startsWith('> ')) {
              flushList();
              parts.push('<blockquote dir="auto" class="border-s-4 border-primary/40 ps-4 py-1 my-3 italic opacity-90">' + parseInline(escape(trimmed.slice(2))) + '</blockquote>');
              continue;
            }

            const ulMatch = trimmed.match(/^[-*]\\s+(.*)$/);
            if (ulMatch) {
              const itemContent = ulMatch[1] || '';
              const itemDir = isRtl(itemContent) ? 'rtl' : 'ltr';
              if (!inUl) {
                flushList();
                parts.push('<ul class="list-disc ps-6 space-y-1.5 my-2" dir="' + itemDir + '">');
                inUl = true;
              }
              parts.push('<li dir="' + itemDir + '">' + parseInline(escape(itemContent)) + '</li>');
              continue;
            }

            const olMatch = trimmed.match(/^\\d+\\.\\s+(.*)$/);
            if (olMatch) {
              const itemContent = olMatch[1] || '';
              const itemDir = isRtl(itemContent) ? 'rtl' : 'ltr';
              if (!inOl) {
                flushList();
                parts.push('<ol class="list-decimal ps-6 space-y-1.5 my-2" dir="' + itemDir + '">');
                inOl = true;
              }
              parts.push('<li dir="' + itemDir + '">' + parseInline(escape(itemContent)) + '</li>');
              continue;
            }

            flushList();
            parts.push('<p dir="auto" class="my-2 leading-relaxed">' + parseInline(escape(trimmed)) + '</p>');
          }

          flushList();
          if (inCode) {
            parts.push('<pre class="p-4 rounded-xl bg-base-300 overflow-x-auto text-sm my-3 font-mono text-left" dir="ltr"><code>' + codeBuf.join('\\n') + '</code></pre>');
          }

          this.previewHtml = parts.join('');
        },
        insertText(prefix, suffix) {
          const textarea = this.$refs.textarea;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const selected = this.content.substring(start, end);
          this.content = this.content.substring(0, start) + prefix + (selected || 'text') + suffix + this.content.substring(end);
          this.$nextTick(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected || 'text').length);
          });
        }
      }`}
    >
      {/* Editor Toolbar */}
      <div class="flex flex-wrap items-center justify-between gap-1 border-b border-base-200 bg-base-200/60 p-1.5 px-2 text-xs">
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="btn btn-ghost btn-xs p-1"
            title="Bold"
            x-on:click="insertText('**', '**')"
          >
            <BoldIcon class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs p-1"
            title="Italic"
            x-on:click="insertText('*', '*')"
          >
            <ItalicIcon class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs p-1"
            title="Heading"
            x-on:click="insertText('### ', '')"
          >
            <HeadingIcon class="h-3.5 w-3.5" />
          </button>
          <div class="divider divider-horizontal mx-0.5 my-1"></div>
          <button
            type="button"
            class="btn btn-ghost btn-xs p-1"
            title="Bullet List"
            x-on:click="insertText('- ', '')"
          >
            <ListIcon class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs p-1"
            title="Numbered List"
            x-on:click="insertText('1. ', '')"
          >
            <ListOrderedIcon class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs p-1"
            title="Code block"
            x-on:click="insertText('```\n', '\n```')"
          >
            <CodeIcon class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs gap-1"
            title="Link"
            x-on:click="insertText('[', '](https://)')"
          >
            <LinkIcon class="h-3.5 w-3.5" />
            Link
          </button>
        </div>

        {/* Tab switch */}
        <div class="join">
          <button
            type="button"
            class="join-item btn btn-xs"
            x-bind:class="tab === 'write' ? 'btn-primary' : 'btn-ghost'"
            x-on:click="tab = 'write'"
          >
            Write
          </button>
          <button
            type="button"
            class="join-item btn btn-xs"
            x-bind:class="tab === 'preview' ? 'btn-primary' : 'btn-ghost'"
            x-on:click="renderPreview(); tab = 'preview'"
          >
            Preview
          </button>
        </div>
      </div>

      {/* Write Pane */}
      <div x-show="tab === 'write'">
        <textarea
          x-ref="textarea"
          name={name}
          x-model="content"
          placeholder={placeholder}
          rows={rows}
          dir="auto"
          style="unicode-bidi: plaintext;"
          class="textarea textarea-ghost w-full focus:outline-none font-mono text-sm leading-relaxed p-3"
        >
          {initialValue}
        </textarea>
      </div>

      {/* Live Preview Pane */}
      <div
        x-show="tab === 'preview'"
        x-html="previewHtml"
        class="prose prose-sm max-w-none p-4 min-h-[140px] bg-base-100 text-base-content/90 overflow-y-auto"
      ></div>
    </div>
  );
}
