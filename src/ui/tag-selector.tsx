import type { Tag } from "../modules/events/types";
import type { Locale } from "../lib/i18n/translations";
import { isRtl } from "../lib/i18n/context";

export const TagSelector = ({
  tags,
  selectedTagIds = [],
  minRequired = 0,
  name = "tagIds",
  locale = "en",
  title,
  subtitle,
}: {
  tags: Tag[];
  selectedTagIds?: string[];
  minRequired?: number;
  name?: string;
  locale?: Locale;
  title?: string;
  subtitle?: string;
}) => {
  const rtl = isRtl(locale);
  const initialJson = JSON.stringify(selectedTagIds);

  const defaultTitle = rtl ? "موضوعات و برچسب‌های مورد علاقه" : "Preferred Topics & Tags";
  const defaultSubtitle = minRequired > 0
    ? (rtl ? `لطفاً حداقل ${minRequired} موضوع مورد علاقه خود را انتخاب کنید:` : `Please select at least ${minRequired} tags that interest you:`)
    : (rtl ? "موضوعات مورد علاقه خود را انتخاب یا ویرایش کنید:" : "Choose the tags that match your interests:");

  return (
    <div
      class="form-control w-full space-y-3"
      x-data={`{
        selected: ${initialJson},
        minRequired: ${minRequired},
        toggle(id) {
          if (this.selected.includes(id)) {
            this.selected = this.selected.filter(x => x !== id);
          } else {
            this.selected.push(id);
          }
        },
        isSelected(id) {
          return this.selected.includes(id);
        },
        get count() {
          return this.selected.length;
        },
        get isValid() {
          return this.count >= this.minRequired;
        }
      }`}
    >
      <div class="flex items-center justify-between">
        <div>
          <span class="label-text font-semibold text-sm text-base-content block">
            {title ?? defaultTitle}
            {minRequired > 0 && <span class="text-error ms-1">*</span>}
          </span>
          <span class="text-xs text-base-content/60 block mt-0.5">
            {subtitle ?? defaultSubtitle}
          </span>
        </div>
        {minRequired > 0 && (
          <span
            class="badge badge-sm font-medium transition-colors"
            x-bind:class="isValid ? 'badge-success text-success-content' : 'badge-warning text-warning-content'"
          >
            <span x-text="count"></span> / {minRequired}
          </span>
        )}
      </div>

      <div class="flex flex-wrap gap-2 p-3 rounded-2xl border border-base-300 bg-base-200/40 max-h-56 overflow-y-auto">
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            class="badge badge-lg gap-1.5 cursor-pointer select-none py-3 px-3.5 transition-all text-xs font-medium border"
            x-bind:class={`isSelected('${tag.id}') ? 'badge-primary shadow-xs font-bold border-primary' : 'badge-ghost border-base-300 hover:border-primary/50 opacity-80 hover:opacity-100'`}
            x-on:click={`toggle('${tag.id}')`}
            title={tag.description ?? tag.title}
          >
            <span x-show={`isSelected('${tag.id}')`} class="text-[10px]">✓</span>
            <span>{tag.title}</span>
          </button>
        ))}
      </div>

      {/* Hidden inputs to submit selected tags */}
      <template x-for="id in selected" x-bind:key="id">
        <input type="hidden" name={name} x-bind:value="id" />
      </template>

      {minRequired > 0 && (
        <div x-show="!isValid" class="text-xs text-warning flex items-center gap-1 mt-1">
          <span>⚠️</span>
          <span>
            {rtl
              ? `انتخاب حداقل ${minRequired} برچسب الزامی است.`
              : `At least ${minRequired} tags are required.`}
          </span>
        </div>
      )}
    </div>
  );
};
