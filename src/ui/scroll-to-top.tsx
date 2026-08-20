import type { Locale } from "../lib/i18n/translations";
import { isRtl } from "../lib/i18n/context";
import { ChevronUpIcon } from "./icons";

export const ScrollToTop = ({ locale = "en" }: { locale?: Locale }) => {
  const rtl = isRtl(locale);
  const positionClass = rtl ? "left-6" : "right-6";
  const ariaLabel = rtl ? "بازگشت به بالای صفحه" : "Scroll to top";

  return (
    <div
      x-data="{
        visible: false,
        checkScroll() {
          this.visible = (window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0) > 150;
        },
        scrollToTop() {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }"
      x-init="checkScroll()"
      {...{ "x-on:scroll.window": "checkScroll()" }}
      class={`fixed bottom-6 ${positionClass} z-40`}
    >
      <button
        type="button"
        x-show="visible"
        {...{
          "x-transition:enter": "transition ease-out duration-300 transform",
          "x-transition:enter-start": "opacity-0 translate-y-3 scale-95",
          "x-transition:enter-end": "opacity-100 translate-y-0 scale-100",
          "x-transition:leave": "transition ease-in duration-200 transform",
          "x-transition:leave-start": "opacity-100 translate-y-0 scale-100",
          "x-transition:leave-end": "opacity-0 translate-y-3 scale-95",
        }}
        x-on:click="scrollToTop()"
        style="display: none;"
        aria-label={ariaLabel}
        title={ariaLabel}
        class="group flex h-11 w-11 items-center justify-center rounded-full border border-base-content/15 bg-base-100/40 text-base-content/70 shadow-lg backdrop-blur-md transition-all hover:border-primary/40 hover:bg-base-100/80 hover:text-primary hover:shadow-primary/10 active:scale-95 focus:outline-hidden"
      >
        <ChevronUpIcon class="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" strokeWidth={2.5} />
      </button>
    </div>
  );
};
