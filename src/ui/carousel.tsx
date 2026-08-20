import type { Child } from "hono/jsx";
import type { Locale } from "../lib/i18n/translations";
import { isRtl } from "../lib/i18n/context";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

export const Carousel = ({
  children,
  id = "meets-carousel",
  locale = "en",
  showControls = true,
}: {
  children: Child;
  id?: string;
  locale?: Locale;
  showControls?: boolean;
}) => {
  const rtl = isRtl(locale);

  return (
    <div
      class="relative w-full"
      x-data={`{
        scrollNext() {
          const el = this.$refs.slider;
          const direction = ${rtl ? -1 : 1};
          el.scrollBy({ left: 360 * direction, behavior: 'smooth' });
        },
        scrollPrev() {
          const el = this.$refs.slider;
          const direction = ${rtl ? -1 : 1};
          el.scrollBy({ left: -360 * direction, behavior: 'smooth' });
        }
      }`}
    >
      {/* Scrollable track with symmetrical gap */}
      <div
        x-ref="slider"
        id={id}
        class="carousel carousel-center w-full flex items-stretch gap-5 p-4 scroll-smooth focus:outline-none overflow-x-auto"
        tabindex={0}
      >
        {children}
      </div>

      {/* Floating navigation buttons */}
      {showControls && (
        <div class="hidden sm:flex items-center justify-end gap-2 px-4 mt-2">
          <button
            type="button"
            class="btn btn-circle btn-sm btn-outline border-base-300 hover:bg-base-300"
            aria-label="Previous"
            x-on:click="scrollPrev()"
          >
            {rtl ? <ChevronRightIcon class="h-4 w-4" /> : <ChevronLeftIcon class="h-4 w-4" />}
          </button>
          <button
            type="button"
            class="btn btn-circle btn-sm btn-outline border-base-300 hover:bg-base-300"
            aria-label="Next"
            x-on:click="scrollNext()"
          >
            {rtl ? <ChevronLeftIcon class="h-4 w-4" /> : <ChevronRightIcon class="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
};
