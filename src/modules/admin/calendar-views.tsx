import type { Meet } from "../events/types";
import type { Locale } from "../../lib/i18n/translations";
import { isRtl, toPersianDigits, t } from "../../lib/i18n/context";
import { formatUtcDateTime } from "../events/datetime";
import {
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliMonthDays,
  JALALI_MONTH_NAMES_FA,
  JALALI_WEEKDAYS_FA,
} from "../../lib/datetime/jalali";
import { Badge, Button } from "../../ui/forms";

const GREGORIAN_MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const GREGORIAN_WEEKDAYS_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export interface AdminCalendarViewProps {
  year: number;
  month: number;
  meets: Meet[];
  locale?: Locale;
  timeZone?: string;
}

export function AdminCalendarGrid({
  year,
  month,
  meets,
  locale = "en",
  timeZone = "Asia/Tehran",
}: AdminCalendarViewProps) {
  const isPersian = locale === "fa";
  const rtl = isRtl(locale);

  // Month navigation calculation
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear--;
  }

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }

  const pPad = (n: number) => String(n).padStart(2, "0");

  let daysCount = 0;
  let startDayOfWeek = 0;
  let monthLabel = "";
  let yearLabel = String(year);
  let weekdays = isPersian ? JALALI_WEEKDAYS_FA : GREGORIAN_WEEKDAYS_EN;

  // Helper to get meet's local date (YYYY-MM-DD) and time (HH:MM) in viewer's timeZone
  const getMeetLocalDateAndItem = (m: Meet): { localDate: string; displayMeet: Meet } => {
    if (m.scheduled_at_utc) {
      try {
        const dtf = new Intl.DateTimeFormat("en-CA", {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const dtfTime = new Intl.DateTimeFormat("en-GB", {
          timeZone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const dateObj = new Date(m.scheduled_at_utc);
        const localDate = dtf.format(dateObj); // YYYY-MM-DD
        const localTime = dtfTime.format(dateObj);
        return {
          localDate,
          displayMeet: { ...m, scheduled_date: localDate, scheduled_time: localTime },
        };
      } catch {
        return { localDate: m.scheduled_date, displayMeet: m };
      }
    }
    return { localDate: m.scheduled_date, displayMeet: m };
  };

  // Map of YYYY-MM-DD or Jalali day to meets
  const dayMeetsMap: Record<number, { isoDate: string; items: Meet[] }> = {};

  if (isPersian) {
    monthLabel = JALALI_MONTH_NAMES_FA[month - 1] || "";
    yearLabel = toPersianDigits(String(year));
    daysCount = getJalaliMonthDays(year, month);
    const [gy, gm, gd] = jalaliToGregorian(year, month, 1);
    const day = new Date(gy, gm - 1, gd).getDay();
    startDayOfWeek = (day + 1) % 7;

    // Index meets by Jalali day
    for (let d = 1; d <= daysCount; d++) {
      const [gY, gM, gD] = jalaliToGregorian(year, month, d);
      const iso = `${gY}-${pPad(gM)}-${pPad(gD)}`;
      const matched = meets
        .map(getMeetLocalDateAndItem)
        .filter(({ localDate }) => localDate === iso)
        .map(({ displayMeet }) => displayMeet);
      dayMeetsMap[d] = { isoDate: iso, items: matched };
    }
  } else {
    monthLabel = GREGORIAN_MONTH_NAMES_EN[month - 1] || "";
    daysCount = new Date(year, month, 0).getDate();
    startDayOfWeek = new Date(year, month - 1, 1).getDay();

    for (let d = 1; d <= daysCount; d++) {
      const iso = `${year}-${pPad(month)}-${pPad(d)}`;
      const matched = meets
        .map(getMeetLocalDateAndItem)
        .filter(({ localDate }) => localDate === iso)
        .map(({ displayMeet }) => displayMeet);
      dayMeetsMap[d] = { isoDate: iso, items: matched };
    }
  }

  const today = new Date();
  let todayDay: number | null = null;
  if (isPersian) {
    const [tJy, tJm, tJd] = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    if (tJy === year && tJm === month) {
      todayDay = tJd;
    }
  } else {
    if (today.getFullYear() === year && today.getMonth() + 1 === month) {
      todayDay = today.getDate();
    }
  }

  const emptyCells = Array.from({ length: startDayOfWeek });
  const dayCells = Array.from({ length: daysCount }, (_, i) => i + 1);

  return (
    <div id="admin-calendar-grid" class={`space-y-6 ${isPersian ? "font-vazir" : ""}`} dir={rtl ? "rtl" : "ltr"}>
      {/* Header section matching CrudTable and PlatformsView */}
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-base-content capitalize sm:text-3xl">
            {isPersian ? "تقویم و برنامه‌ریزی جلسات" : "Calendar Schedule"}
          </h1>
          <p class="text-sm text-base-content/60">
            {isPersian ? "نمای تقویمی جامع و وضعیت زمان‌بندی جلسات سیستم" : "Monthly schedule overview and active community meetings"}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="primary"
            href="/dashboard/admin/meets?modal=new"
          >
            {t("admin.add_new", locale)}
          </Button>
          <Button
            size="sm"
            variant="outline"
            href="/dashboard/admin/meets"
          >
            {t("admin.nav.meets", locale)}
          </Button>
        </div>
      </div>

      {/* Interactive Calendar Control Bar Card */}
      <div class="card border border-base-300 bg-base-100 p-4 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-bold text-base-content flex items-center gap-2">
              <span>{monthLabel}</span>
              <span class="text-primary font-extrabold">{yearLabel}</span>
            </h2>
          </div>

          {/* Navigation buttons with HTMX partial swapping */}
          <div class="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              href={`/dashboard/admin/calendar?year=${prevYear}&month=${prevMonth}`}
              hx-get={`/dashboard/admin/calendar?year=${prevYear}&month=${prevMonth}`}
              hx-target="#admin-calendar-grid"
              hx-swap="outerHTML"
              aria-label="Previous Month"
            >
              {rtl ? "→ ماه قبل" : "← Prev"}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              href="/dashboard/admin/calendar"
              hx-get="/dashboard/admin/calendar"
              hx-target="#admin-calendar-grid"
              hx-swap="outerHTML"
            >
              {isPersian ? "امروز" : "Today"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              href={`/dashboard/admin/calendar?year=${nextYear}&month=${nextMonth}`}
              hx-get={`/dashboard/admin/calendar?year=${nextYear}&month=${nextMonth}`}
              hx-target="#admin-calendar-grid"
              hx-swap="outerHTML"
              aria-label="Next Month"
            >
              {rtl ? "ماه بعد ←" : "Next →"}
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Card */}
      <div class="card border border-base-300 bg-base-100 shadow-sm overflow-hidden">
        {/* Weekday Headers */}
        <div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));" class="bg-base-200/60 border-b border-base-300 text-center font-bold text-xs">
          {weekdays.map((w, idx) => (
            <div
              key={w}
              class={`py-3 px-1 border-e border-base-300/50 last:border-e-0 ${
                (isPersian && idx === 6) || (!isPersian && (idx === 0 || idx === 6)) ? "text-error" : "text-base-content/80"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Month Day Matrix */}
        <div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));" class="divide-y divide-base-200">
          {/* Empty prefix padding days */}
          {emptyCells.map((_, i) => (
            <div key={`empty-${i}`} class="min-h-[100px] sm:min-h-[120px] bg-base-200/20 border-e border-base-200 last:border-e-0 p-1.5 opacity-40"></div>
          ))}

          {/* Actual Month Days */}
          {dayCells.map((dayNum) => {
            const isToday = dayNum === todayDay;
            const meetsForDay = dayMeetsMap[dayNum]?.items ?? [];

            return (
              <div
                key={`day-${dayNum}`}
                class={`min-h-[100px] sm:min-h-[120px] border-e border-base-200 last:border-e-0 p-2 flex flex-col justify-between transition-colors ${
                  isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : "hover:bg-base-200/30"
                }`}
              >
                {/* Day Number Header */}
                <div class="flex items-center justify-between">
                  <span
                    class={`inline-flex items-center justify-center text-xs font-bold rounded-lg h-6 w-6 ${
                      isToday ? "bg-primary text-primary-content shadow-sm" : "text-base-content/80"
                    }`}
                  >
                    {isPersian ? toPersianDigits(String(dayNum)) : dayNum}
                  </span>

                  {meetsForDay.length > 0 && (
                    <span class="text-[10px] font-semibold text-base-content/50">
                      {isPersian
                        ? `${toPersianDigits(String(meetsForDay.length))} جلسه`
                        : `${meetsForDay.length} meets`}
                    </span>
                  )}
                </div>

                {/* Meets List inside cell */}
                <div class="mt-1.5 space-y-1 overflow-y-auto max-h-24">
                  {meetsForDay.map((meet) => {
                    const statusVariant =
                      meet.status === "live"
                        ? "error"
                        : meet.status === "upcoming"
                        ? "primary"
                        : "ghost";

                    return (
                      <div
                        key={meet.id}
                        class="text-[11px] p-1.5 rounded-lg border border-base-300 bg-base-100 shadow-xs hover:border-primary/50 transition-all flex flex-col gap-0.5"
                      >
                        <div class="flex items-center justify-between gap-1">
                          <span class="font-bold truncate text-base-content hover:text-primary">
                            {meet.title}
                          </span>
                          <Badge variant={statusVariant} size="xs" class="font-mono">
                            {meet.scheduled_time || "00:00"}
                          </Badge>
                        </div>

                        <div class="flex items-center justify-between text-[10px] text-base-content/60">
                          <span>{meet.duration_minutes}m</span>
                          <a
                            class="text-primary hover:underline cursor-pointer bg-transparent border-0 p-0 text-[10px]"
                            href={`/dashboard/admin/meets?modal=${meet.id}`}
                          >
                            {isPersian ? "ویرایش" : "Edit"}
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div class="mt-1"></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AdminCalendarView(props: AdminCalendarViewProps) {
  return (
    <div class="space-y-6">
      <AdminCalendarGrid {...props} />
      <div id="modal"></div>
    </div>
  );
}
