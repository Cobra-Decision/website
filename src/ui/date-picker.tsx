import type { Locale } from "../lib/i18n/translations";
import { isRtl, toPersianDigits } from "../lib/i18n/context";
import { formatJalaliDisplay } from "../lib/datetime/jalali";

export interface DatePickerProps {
  name: string;
  label?: string;
  value?: string; // Standard ISO YYYY-MM-DD
  placeholder?: string;
  locale?: Locale;
  required?: boolean;
  class?: string;
  id?: string;
}

/**
 * Unified DatePicker Component.
 * Supports Shamsi (fa) and Gregorian (en) calendars with identical UI and ISO value synchronization.
 */
export function DatePicker({
  name,
  label,
  value = "",
  placeholder,
  locale = "en",
  required = false,
  class: className = "w-full",
  id,
}: DatePickerProps) {
  const isPersian = locale === "fa";
  const rtl = isRtl(locale);
  const inputId = id || `datepicker-${name}-${Math.random().toString(36).slice(2, 7)}`;
  const initialIso = value || "";
  const initialDisplay = isPersian && initialIso ? toPersianDigits(formatJalaliDisplay(initialIso)) : initialIso;

  const monthNamesEn = JSON.stringify([
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]);
  const monthNamesFa = JSON.stringify([
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
  ]);
  const weekdaysEn = JSON.stringify(["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]);
  const weekdaysFa = JSON.stringify(["ش", "ی", "د", "س", "چ", "پ", "ج"]);

  const alpineData = `{
    open: false,
    isPersian: ${isPersian},
    isoValue: '${initialIso}',
    displayValue: '${initialDisplay}',
    year: 2026,
    month: 1,
    selectedDay: null,
    viewMode: 'days',
    monthNames: ${isPersian ? monthNamesFa : monthNamesEn},
    weekdays: ${isPersian ? weekdaysFa : weekdaysEn},

    init() {
      this.syncFromIso();
    },

    syncFromIso() {
      if (this.isoValue) {
        const parts = this.isoValue.split('-').map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
          if (this.isPersian) {
            const [jy, jm, jd] = this.g2j(parts[0], parts[1], parts[2]);
            this.year = jy;
            this.month = jm;
            this.selectedDay = jd;
          } else {
            this.year = parts[0];
            this.month = parts[1];
            this.selectedDay = parts[2];
          }
          this.updateDisplay();
          return;
        }
      }
      const today = new Date();
      if (this.isPersian) {
        const [jy, jm] = this.g2j(today.getFullYear(), today.getMonth() + 1, today.getDate());
        this.year = jy;
        this.month = jm;
      } else {
        this.year = today.getFullYear();
        this.month = today.getMonth() + 1;
      }
    },

    toggleOpen() {
      if (!this.open) {
        this.syncFromIso();
        this.viewMode = 'days';
      }
      this.open = !this.open;
    },

    toDisplayNum(n) {
      if (!this.isPersian) return String(n);
      return String(n).replace(/\\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
    },

    prevMonth() {
      if (this.month === 1) {
        this.month = 12;
        this.year--;
      } else {
        this.month--;
      }
    },

    nextMonth() {
      if (this.month === 12) {
        this.month = 1;
        this.year++;
      } else {
        this.month++;
      }
    },

    selectMonth(m) {
      this.month = m;
      this.viewMode = 'days';
    },

    selectYear(y) {
      this.year = y;
      this.viewMode = 'days';
    },

    getYearList() {
      const list = [];
      const start = this.isPersian ? 1350 : 1970;
      const end = this.isPersian ? 1450 : 2070;
      for (let y = start; y <= end; y++) {
        list.push(y);
      }
      return list;
    },

    scrollToSelected() {
      setTimeout(() => {
        const container = this.viewMode === 'months' ? this.$refs.monthList : this.$refs.yearList;
        const el = container?.querySelector('.selected-item');
        if (el && container) {
          const top = el.offsetTop - container.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2);
          container.scrollTo({ top, behavior: 'smooth' });
        }
      }, 50);
    },

    isLeapJalali(jy) {
      const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
      let jp = breaks[0], jump = 0;
      for (let j = 1; j < breaks.length; j++) {
        const jm = breaks[j];
        jump = jm - jp;
        if (jy < jm) break;
        jp = jm;
      }
      let n = jy - jp;
      if (jump - n < 6) n = n - jump + ((jump + 4) >> 5) * 33;
      let leap = ((((n + 1) % 33) - 1) % 4);
      if (leap === -1) leap = 4;
      return leap === 0;
    },

    daysInMonth() {
      if (this.isPersian) {
        if (this.month <= 6) return 31;
        if (this.month <= 11) return 30;
        return this.isLeapJalali(this.year) ? 30 : 29;
      }
      return new Date(this.year, this.month, 0).getDate();
    },

    firstDayOfWeek() {
      if (this.isPersian) {
        const [gy, gm, gd] = this.j2g(this.year, this.month, 1);
        const day = new Date(gy, gm - 1, gd).getDay();
        return (day + 1) % 7;
      }
      return new Date(this.year, this.month - 1, 1).getDay();
    },

    g2j(gy, gm, gd) {
      const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
      let gy2 = gm > 2 ? gy + 1 : gy;
      let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
      let jy = -1595 + (33 * Math.floor(days / 12053));
      days %= 12053;
      jy += 4 * Math.floor(days / 1461);
      days %= 1461;
      if (days > 365) {
        jy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
      }
      let jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
      let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
      return [jy, jm, jd];
    },

    j2g(jy, jm, jd) {
      let jy2 = jy - 979;
      let days = 365 * jy2 + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
      let gy = 1600 + 400 * Math.floor(days / 146097);
      days %= 146097;
      let leap = true;
      if (days >= 36525) {
        days--;
        gy += 100 * Math.floor(days / 36524);
        days %= 36524;
        if (days >= 365) days++;
        else leap = false;
      }
      gy += 4 * Math.floor(days / 1461);
      days %= 1461;
      if (days >= 366) {
        leap = false;
        days--;
        gy += Math.floor(days / 365);
        days %= 365;
      }
      let gm = 0, gd = 0;
      const g_d_m = [0, 31, (leap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      for (let i = 1; i <= 12; i++) {
        if (days < g_d_m[i]) {
          gm = i;
          gd = days + 1;
          break;
        }
        days -= g_d_m[i];
      }
      return [gy, gm, gd];
    },

    selectDate(day) {
      this.selectedDay = day;
      const pPad = (n) => String(n).padStart(2, '0');
      if (this.isPersian) {
        const [gy, gm, gd] = this.j2g(this.year, this.month, day);
        this.isoValue = gy + '-' + pPad(gm) + '-' + pPad(gd);
      } else {
        this.isoValue = this.year + '-' + pPad(this.month) + '-' + pPad(day);
      }
      this.updateDisplay();
      this.open = false;
      this.$nextTick(() => {
        const el = this.$refs.hiddenInput;
        if (el) {
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    },

    selectToday() {
      const today = new Date();
      if (this.isPersian) {
        const [jy, jm, jd] = this.g2j(today.getFullYear(), today.getMonth() + 1, today.getDate());
        this.year = jy;
        this.month = jm;
        this.selectDate(jd);
      } else {
        this.year = today.getFullYear();
        this.month = today.getMonth() + 1;
        this.selectDate(today.getDate());
      }
    },

    clear() {
      this.isoValue = '';
      this.displayValue = '';
      this.selectedDay = null;
      this.open = false;
      this.$nextTick(() => {
        const el = this.$refs.hiddenInput;
        if (el) {
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    },

    updateDisplay() {
      if (!this.isoValue) {
        this.displayValue = '';
        return;
      }
      const pPad = (n) => String(n).padStart(2, '0');
      if (this.isPersian) {
        this.displayValue = this.toDisplayNum(this.year + '/' + pPad(this.month) + '/' + pPad(this.selectedDay));
      } else {
        this.displayValue = this.year + '-' + pPad(this.month) + '-' + pPad(this.selectedDay);
      }
    },

    isSelected(day) {
      if (!this.isoValue) return false;
      const parts = this.isoValue.split('-').map(Number);
      if (parts.length !== 3) return false;
      if (this.isPersian) {
        const [jy, jm, jd] = this.g2j(parts[0], parts[1], parts[2]);
        return this.year === jy && this.month === jm && day === jd;
      }
      return this.year === parts[0] && this.month === parts[1] && day === parts[2];
    },

    getEmptyCells() {
      return Array.from({ length: this.firstDayOfWeek() });
    },

    getMonthDays() {
      return Array.from({ length: this.daysInMonth() }, (_, i) => i + 1);
    }
  }`;

  const defaultPlaceholder = isPersian ? "انتخاب تاریخ..." : "Select date...";
  const todayLabel = isPersian ? "امروز" : "Today";
  const clearLabel = isPersian ? "پاک کردن" : "Clear";
  const selectMonthLabel = isPersian ? "انتخاب ماه" : "Select Month";
  const selectYearLabel = isPersian ? "انتخاب سال" : "Select Year";
  const backLabel = isPersian ? "بازگشت ✕" : "Back ✕";
  const prevLabel = isPersian ? "ماه قبل" : "Previous Month";
  const nextLabel = isPersian ? "ماه بعد" : "Next Month";

  return (
    <div class={`form-control w-full ${isPersian ? "font-vazir" : ""}`} x-data={alpineData} dir={rtl ? "rtl" : "ltr"}>
      {label && <span class="label-text font-medium text-xs mb-1">{label}</span>}

      {/* Real form input submitted to backend with standard ISO date (e.g. 2026-08-23) */}
      <input
        type="hidden"
        name={name}
        {...({ "x-ref": "hiddenInput", "x-model": "isoValue" } as any)}
        required={required}
      />

      <div class="relative w-full">
        {/* Visible input box with embedded calendar icon inside */}
        <div
          class="relative flex items-center w-full cursor-pointer"
          {...({ "x-on:click": "toggleOpen()" } as any)}
        >
          <input
            id={inputId}
            type="text"
            readonly
            placeholder={placeholder || defaultPlaceholder}
            {...({ "x-model": "displayValue" } as any)}
            class={`input input-bordered input-sm w-full cursor-pointer px-3 ${rtl ? "pl-9 text-right font-vazir" : "pr-9 text-left"} ${className}`}
          />

          <span
            class="absolute top-0 bottom-0 flex items-center pointer-events-none text-base-content/60"
            style={rtl ? "left: 0.75rem;" : "right: 0.75rem;"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
        </div>

        {/* Calendar Popover */}
        <div
          {...({
            "x-show": "open",
            "x-ref": "popover",
            "x-on:click.outside": "open = false",
            "x-transition": "",
          } as any)}
          class={`absolute top-full start-0 z-50 mt-1.5 w-72 rounded-2xl border border-base-300 bg-base-100 p-3 shadow-2xl ${isPersian ? "font-vazir" : ""}`}
          style="display: none;"
        >
          {/* Navigation header */}
          <div class="flex items-center justify-between border-b border-base-200 pb-2 mb-2">
            <template {...({ "x-if": "viewMode === 'days'" } as any)}>
              <div class="flex items-center justify-between w-full">
                <button
                  type="button"
                  {...({ "x-on:click": "prevMonth()" } as any)}
                  class="btn btn-ghost btn-xs btn-square text-base-content hover:text-primary"
                  aria-label={prevLabel}
                >
                  {rtl ? "→" : "←"}
                </button>

                <div class="flex items-center gap-1.5 select-none">
                  <button
                    type="button"
                    {...({ "x-on:click": "viewMode = 'months'; scrollToSelected()" } as any)}
                    class="btn btn-xs btn-outline border-base-300 hover:btn-primary text-xs font-bold transition-colors"
                  >
                    <span {...({ "x-text": "monthNames[month - 1]" } as any)}></span>
                    <span class="text-[10px] opacity-70">▾</span>
                  </button>
                  <button
                    type="button"
                    {...({ "x-on:click": "viewMode = 'years'; scrollToSelected()" } as any)}
                    class="btn btn-xs btn-outline border-base-300 hover:btn-primary text-xs font-bold transition-colors"
                  >
                    <span {...({ "x-text": "toDisplayNum(year)" } as any)}></span>
                    <span class="text-[10px] opacity-70">▾</span>
                  </button>
                </div>

                <button
                  type="button"
                  {...({ "x-on:click": "nextMonth()" } as any)}
                  class="btn btn-ghost btn-xs btn-square text-base-content hover:text-primary"
                  aria-label={nextLabel}
                >
                  {rtl ? "←" : "→"}
                </button>
              </div>
            </template>

            <template {...({ "x-if": "viewMode === 'months'" } as any)}>
              <div class="flex items-center justify-between w-full">
                <span class="text-xs font-bold text-primary px-1">{selectMonthLabel}</span>
                <button
                  type="button"
                  {...({ "x-on:click": "viewMode = 'days'" } as any)}
                  class="btn btn-ghost btn-xs text-xs hover:bg-base-200"
                >
                  {backLabel}
                </button>
              </div>
            </template>

            <template {...({ "x-if": "viewMode === 'years'" } as any)}>
              <div class="flex items-center justify-between w-full">
                <span class="text-xs font-bold text-primary px-1">{selectYearLabel}</span>
                <button
                  type="button"
                  {...({ "x-on:click": "viewMode = 'days'" } as any)}
                  class="btn btn-ghost btn-xs text-xs hover:bg-base-200"
                >
                  {backLabel}
                </button>
              </div>
            </template>
          </div>

          {/* Month selector view - Vertical Scrollable List */}
          <div
            {...({
              "x-show": "viewMode === 'months'",
              "x-ref": "monthList",
              "x-init": "$watch('viewMode', (mode) => { if (mode === 'months') scrollToSelected() })",
            } as any)}
            class="flex flex-col gap-1.5 p-1 max-h-56 overflow-y-auto"
          >
            <template {...({ "x-for": "(mName, idx) in monthNames", ":key": "'month-' + idx" } as any)}>
              <button
                type="button"
                {...({
                  "x-on:click": "selectMonth(idx + 1)",
                  ":class": "month === (idx + 1) ? 'btn-primary text-primary-content selected-item shadow font-bold' : 'btn-ghost hover:bg-base-200 text-base-content font-medium'",
                  "x-text": "mName",
                } as any)}
                class={`btn btn-sm py-2 w-full text-sm rounded-lg flex items-center justify-center text-center shrink-0 ${isPersian ? "font-vazir" : ""}`}
              ></button>
            </template>
          </div>

          {/* Year selector view - Vertical Scrollable List */}
          <div
            {...({
              "x-show": "viewMode === 'years'",
              "x-ref": "yearList",
              "x-init": "$watch('viewMode', (mode) => { if (mode === 'years') scrollToSelected() })",
            } as any)}
            class="flex flex-col gap-1.5 p-1 max-h-56 overflow-y-auto"
          >
            <template {...({ "x-for": "y in getYearList()", ":key": "'year-' + y" } as any)}>
              <button
                type="button"
                {...({
                  "x-on:click": "selectYear(y)",
                  ":class": "year === y ? 'btn-primary text-primary-content selected-item shadow font-bold' : 'btn-ghost hover:bg-base-200 text-base-content font-medium'",
                  "x-text": "toDisplayNum(y)",
                } as any)}
                class={`btn btn-sm py-2 w-full text-sm rounded-lg flex items-center justify-center text-center shrink-0 ${isPersian ? "font-vazir" : ""}`}
              ></button>
            </template>
          </div>

          {/* Days View Wrapper */}
          <div {...({ "x-show": "viewMode === 'days'" } as any)}>
            {/* Weekday headers */}
            <div
              style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));"
              class="gap-1 text-center text-[10px] font-bold text-base-content/70 mb-1"
            >
              <template {...({ "x-for": "(wDay, idx) in weekdays", ":key": "'wday-' + idx" } as any)}>
                <div
                  {...({
                    ":class": "(isPersian && idx === 6) || (!isPersian && (idx === 0 || idx === 6)) ? 'py-1 text-error font-bold' : 'py-1'",
                    "x-text": "wDay",
                  } as any)}
                ></div>
              </template>
            </div>

            {/* Calendar days 7-column grid */}
            <div
              style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));"
              class="gap-1 text-center"
            >
              {/* Empty padding days */}
              <template {...({ "x-for": "(_, idx) in getEmptyCells()", ":key": "'empty-' + idx" } as any)}>
                <div class="h-8 w-8"></div>
              </template>

              {/* Days of current month */}
              <template {...({ "x-for": "day in getMonthDays()", ":key": "'day-' + day" } as any)}>
                <button
                  type="button"
                  {...({
                    "x-on:click": "selectDate(day)",
                    ":class": "isSelected(day) ? 'btn-primary text-primary-content selected-item shadow font-bold' : 'btn-ghost hover:bg-base-200 text-base-content font-medium'",
                    "x-text": "toDisplayNum(day)",
                  } as any)}
                  class={`btn btn-xs h-8 w-8 p-0 rounded-lg text-xs flex items-center justify-center transition-colors mx-auto ${isPersian ? "font-vazir" : ""}`}
                ></button>
              </template>
            </div>
          </div>

          {/* Quick action buttons */}
          <div class="flex items-center justify-between border-t border-base-200 pt-2 mt-2">
            <button
              type="button"
              {...({ "x-on:click": "selectToday()" } as any)}
              class="btn btn-ghost btn-xs text-primary font-medium"
            >
              {todayLabel}
            </button>
            <button
              type="button"
              {...({ "x-on:click": "clear()" } as any)}
              class="btn btn-ghost btn-xs text-base-content/50 hover:text-error"
            >
              {clearLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

