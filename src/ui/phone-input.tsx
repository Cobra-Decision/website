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
  const defaultLabel = rtl ? "شماره تماس" : "Phone Number";
  const optionalText = rtl ? "اختیاری" : "Optional";
  const initialCountry = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];

  return (
    <div
      class="form-control w-full space-y-1.5"
      x-data={`{
        selectedDial: '${initialCountry.dialCode}',
        nationalNumber: '${nationalNumber}',
        updatePhone() {
          const num = this.nationalNumber.replace(/^0+/, '').replace(/\\s+/g, '');
          if ($refs.hiddenPhone) {
            $refs.hiddenPhone.value = num ? this.selectedDial + num : '';
          }
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

      {/* Group is always dir="ltr" so +dialCode and digits maintain correct international phone direction */}
      <div
        class="join w-full rounded-xl border border-base-300 bg-base-100 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-xs transition-all overflow-hidden"
        dir="ltr"
      >
        {/* Country Selector Dropdown */}
        <select
          class="select select-sm sm:select-md join-item border-0 bg-base-200/70 hover:bg-base-200 focus:bg-base-200 font-medium text-xs sm:text-sm focus:outline-none transition-colors max-w-[150px] sm:max-w-[180px] cursor-pointer"
          x-model="selectedDial"
          x-on:change="updatePhone()"
          aria-label="Country Code"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.dialCode} selected={c.code === countryCode}>
              {c.flag} {c.dialCode} {rtl ? c.nameFa : c.name}
            </option>
          ))}
        </select>

        {/* Local National Phone Number Input */}
        <input
          type="tel"
          class="input input-sm sm:input-md join-item w-full border-0 focus:outline-none bg-transparent px-3 text-xs sm:text-sm font-medium tracking-wide"
          dir="ltr"
          value={nationalNumber}
          x-model="nationalNumber"
          x-on:input="updatePhone()"
          placeholder={initialCountry.placeholder}
          autocomplete="tel-national"
        />

        {/* Hidden synced field submitted in forms */}
        <input
          type="hidden"
          name={name}
          x-ref="hiddenPhone"
          value={initialPhone ?? (nationalNumber ? `${initialCountry.dialCode}${nationalNumber}` : "")}
        />
      </div>
    </div>
  );
};
