import type { Locale } from "../lib/i18n/translations";
import { isRtl } from "../lib/i18n/context";

export type CountryOption = {
  code: string;
  name: string;
  nameFa: string;
  dialCode: string;
  flag: string;
  placeholder: string;
};

export const COUNTRIES: CountryOption[] = [
  { code: "IR", name: "Iran", nameFa: "ایران", dialCode: "+98", flag: "🇮🇷", placeholder: "912 345 6789" },
  { code: "US", name: "United States", nameFa: "ایالات متحده", dialCode: "+1", flag: "🇺🇸", placeholder: "202 555 0123" },
  { code: "CA", name: "Canada", nameFa: "کانادا", dialCode: "+1", flag: "🇨🇦", placeholder: "416 555 0199" },
  { code: "GB", name: "United Kingdom", nameFa: "بریتانیا", dialCode: "+44", flag: "🇬🇧", placeholder: "7911 123456" },
  { code: "DE", name: "Germany", nameFa: "آلمان", dialCode: "+49", flag: "🇩🇪", placeholder: "151 23456789" },
  { code: "FR", name: "France", nameFa: "فرانسه", dialCode: "+33", flag: "🇫🇷", placeholder: "6 12 34 56 78" },
  { code: "TR", name: "Turkey", nameFa: "ترکیه", dialCode: "+90", flag: "🇹🇷", placeholder: "532 123 4567" },
  { code: "AE", name: "United Arab Emirates", nameFa: "امارات متحده عربی", dialCode: "+971", flag: "🇦🇪", placeholder: "50 123 4567" },
  { code: "NL", name: "Netherlands", nameFa: "هلند", dialCode: "+31", flag: "🇳🇱", placeholder: "6 12345678" },
  { code: "SE", name: "Sweden", nameFa: "سوئد", dialCode: "+46", flag: "🇸🇪", placeholder: "70 123 45 67" },
  { code: "CH", name: "Switzerland", nameFa: "سوئیس", dialCode: "+41", flag: "🇨🇭", placeholder: "78 123 45 67" },
  { code: "AU", name: "Australia", nameFa: "استرالیا", dialCode: "+61", flag: "🇦🇺", placeholder: "412 345 678" },
];

/**
 * Extracts default country and local number from an existing international phone string.
 */
export function parseInitialPhone(phone: string | null | undefined): { countryCode: string; nationalNumber: string } {
  if (!phone || !phone.trim()) {
    return { countryCode: "IR", nationalNumber: "" };
  }
  const clean = phone.trim();
  // Find longest matching dial code
  const matchedCountry = [...COUNTRIES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((c) => clean.startsWith(c.dialCode));

  if (matchedCountry) {
    const rawNumber = clean.slice(matchedCountry.dialCode.length).trim().replace(/^0+/, "");
    return { countryCode: matchedCountry.code, nationalNumber: rawNumber };
  }

  // Strip leading plus or zeros
  return { countryCode: "IR", nationalNumber: clean.replace(/^\+98|^0/, "") };
}

export const PhoneInput = ({
  initialPhone = "",
  name = "phone",
  locale = "en",
  label,
  optional = true,
  required = false,
}: {
  initialPhone?: string | null;
  name?: string;
  locale?: Locale;
  label?: string;
  optional?: boolean;
  required?: boolean;
}) => {
  const rtl = isRtl(locale);
  const { countryCode, nationalNumber } = parseInitialPhone(initialPhone);
  const countriesJson = JSON.stringify(COUNTRIES);
  const defaultLabel = rtl ? "شماره تماس" : "Phone Number";
  const optionalText = rtl ? "اختیاری" : "Optional";

  return (
    <div
      class="form-control w-full space-y-1.5"
      x-data={`{
        countries: ${countriesJson},
        selectedCode: '${countryCode}',
        number: '${nationalNumber}',
        open: false,
        search: '',
        get current() {
          return this.countries.find(c => c.code === this.selectedCode) || this.countries[0];
        },
        get filtered() {
          if (!this.search.trim()) return this.countries;
          const q = this.search.toLowerCase();
          return this.countries.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.nameFa.includes(q) ||
            c.dialCode.includes(q) ||
            c.code.toLowerCase().includes(q)
          );
        },
        selectCountry(code) {
          this.selectedCode = code;
          this.open = false;
          this.search = '';
        },
        get fullNumber() {
          const cleanNum = this.number.replace(/^0+/, '').replace(/\\s+/g, '');
          if (!cleanNum) return '';
          return this.current.dialCode + cleanNum;
        }
      }`}
    >
      <div class="flex items-center justify-between">
        <label class="label-text font-medium text-xs text-base-content block">
          {label ?? defaultLabel}
          {required && <span class="text-error ms-1">*</span>}
        </label>
        {optional && !required && (
          <span class="label-text-alt text-xs text-base-content/60">{optionalText}</span>
        )}
      </div>

      {/* Modern country picker + input group */}
      <div class="relative flex rounded-xl border border-base-300 bg-base-100 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-xs transition-all">
        {/* Country Selector Dropdown Trigger */}
        <div class="relative">
          <button
            type="button"
            class="flex h-full items-center gap-1.5 px-3 py-2 border-e border-base-300 bg-base-200/50 hover:bg-base-200 rounded-s-xl text-xs sm:text-sm font-medium transition-colors select-none"
            x-on:click="open = !open"
            x-on:click.outside="open = false"
            aria-label="Select Country"
          >
            <span class="text-base sm:text-lg leading-none" x-text="current.flag"></span>
            <span class="font-mono text-xs text-base-content/80" dir="ltr" x-text="current.dialCode"></span>
            <span class="text-[10px] opacity-60">▼</span>
          </button>

          {/* Searchable Dropdown Menu */}
          <div
            x-show="open"
            x-transition
            class="absolute start-0 top-full z-50 mt-1 w-64 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-2xl max-h-64 overflow-y-auto"
            style="display: none;"
          >
            <input
              type="text"
              placeholder={rtl ? "جستجوی کشور یا کد..." : "Search country or code..."}
              class="input input-bordered input-xs w-full mb-2 bg-base-200/50"
              x-model="search"
              x-on:click.stop
            />

            <div class="space-y-0.5">
              <template x-for="c in filtered" x-bind:key="c.code">
                <button
                  type="button"
                  class="flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-primary/10 hover:text-primary transition-colors text-start"
                  x-bind:class="selectedCode === c.code ? 'bg-primary/15 font-bold text-primary' : ''"
                  x-on:click="selectCountry(c.code)"
                >
                  <div class="flex items-center gap-2 truncate">
                    <span class="text-base" x-text="c.flag"></span>
                    <span class="truncate" x-text={`${rtl ? "c.nameFa" : "c.name"}`}></span>
                  </div>
                  <span class="font-mono text-xs opacity-70 ps-2" dir="ltr" x-text="c.dialCode"></span>
                </button>
              </template>
            </div>
          </div>
        </div>

        {/* Local National Phone Number Input */}
        <input
          type="tel"
          class="input input-sm sm:input-md w-full border-0 focus:outline-none focus:ring-0 bg-transparent px-3 text-xs sm:text-sm font-medium"
          dir="ltr"
          x-model="number"
          x-bind:placeholder="current.placeholder"
          autocomplete="tel-national"
        />

        {/* Hidden synced field submitted in forms */}
        <input type="hidden" name={name} x-bind:value="fullNumber" />
      </div>
    </div>
  );
};
