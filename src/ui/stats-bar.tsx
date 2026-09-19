import type { Locale } from "../lib/i18n/translations";
import { t, formatLocalizedNumber } from "../lib/i18n/context";

export interface StatsBarProps {
  totalUsers: number;
  totalMeetHours: number;
  totalMeets: number;
  locale?: Locale;
}

export const StatsBar = ({
  totalUsers,
  totalMeetHours,
  totalMeets,
  locale = "en",
}: StatsBarProps) => {
  const totalUsersFormatted = formatLocalizedNumber(totalUsers, locale);
  const totalHoursFormatted = formatLocalizedNumber(totalMeetHours, locale);
  const totalMeetsFormatted = formatLocalizedNumber(totalMeets, locale);

  return (
    <div class="flex flex-wrap items-center justify-center gap-8 text-center sm:gap-16">
      {totalUsers >= 50 && (
        <>
          <div class="px-4">
            <p class="text-sm font-medium text-base-content/60">{t("stats.members", locale)}</p>
            <p class="mt-1 text-3xl font-extrabold text-primary sm:text-4xl">{totalUsersFormatted}</p>
          </div>
          <div class="h-10 w-px bg-base-300 hidden sm:block"></div>
        </>
      )}
      <div class="px-4">
        <p class="text-sm font-medium text-base-content/60">{t("stats.hours", locale)}</p>
        <p class="mt-1 text-3xl font-extrabold text-primary sm:text-4xl">{totalHoursFormatted}</p>
      </div>
      <div class="h-10 w-px bg-base-300 hidden sm:block"></div>
      <div class="px-4">
        <p class="text-sm font-medium text-base-content/60">{t("stats.meets", locale)}</p>
        <p class="mt-1 text-3xl font-extrabold text-primary sm:text-4xl">{totalMeetsFormatted}</p>
      </div>
    </div>
  );
};
