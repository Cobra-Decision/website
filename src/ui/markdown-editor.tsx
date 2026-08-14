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
          let text = this.content || '';
          text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          text = text.replace(/^### (.*$)/gim, '<h3 class="font-bold text-lg mt-2 mb-1">$1</h3>');
          text = text.replace(/^## (.*$)/gim, '<h2 class="font-bold text-xl mt-3 mb-1 border-b pb-1">$1</h2>');
          text = text.replace(/^# (.*$)/gim, '<h1 class="font-black text-2xl mt-4 mb-2 border-b pb-1">$1</h1>');
          text = text.replace(/\\*\\*(.*?)\\*\\*/gim, '<strong>$1</strong>');
          text = text.replace(/\\*(.*?)\\*/gim, '<em>$1</em>');
          text = text.replace(/\`([^\`]+)\`/gim, '<code class="bg-base-300 px-1 rounded text-xs text-primary">$1</code>');
          text = text.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/gim, '<a href="$2" target="_blank" class="link link-primary">$1</a>');
          text = text.replace(/^\\s*[-*]\\s+(.*)$/gim, '<li class="ml-4 list-disc">$1</li>');
          text = text.replace(/^\\s*\\d+\\.\\s+(.*)$/gim, '<li class="ml-4 list-decimal">$1</li>');
          text = text.replace(/\\n/gim, '<br/>');
          this.previewHtml = text || '<span class="text-base-content/40 italic">Nothing to preview yet.</span>';
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
            class="btn btn-ghost btn-xs font-bold"
            title="Bold"
            x-on:click="insertText('**', '**')"
          >
            B
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs italic font-serif"
            title="Italic"
            x-on:click="insertText('*', '*')"
          >
            I
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs font-mono"
            title="Heading"
            x-on:click="insertText('### ', '')"
          >
            H
          </button>
          <div class="divider divider-horizontal mx-0.5 my-1"></div>
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            title="Bullet List"
            x-on:click="insertText('- ', '')"
          >
            • List
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            title="Numbered List"
            x-on:click="insertText('1. ', '')"
          >
            1. List
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs font-mono"
            title="Code block"
            x-on:click="insertText('```\n', '\n```')"
          >
            &lt;/&gt;
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            title="Link"
            x-on:click="insertText('[', '](https://)')"
          >
            🔗 Link
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
