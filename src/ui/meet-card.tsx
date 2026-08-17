import type { MeetWithDetails } from "../modules/events/types";
import type { Locale } from "../lib/i18n/translations";
import { t, formatLocalizedNumber } from "../lib/i18n/context";
import { formatLocalizedDate, formatLocalizedTime } from "../modules/events/datetime";
import { TagBadge } from "./tag-badge";

/**
 * Extracts clean plaintext excerpt from markdown content for previews.
 */
export function getMarkdownExcerpt(markdown: string | null | undefined, maxLength = 140): string {
  if (!markdown || !markdown.trim()) return "";
  // Strip code blocks, blockquotes, headers, bold/italic, links, list symbols
  const clean = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/\r?\n+/g, " ")
    .trim();

  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength).trim() + "…";
}

export const UnifiedMeetCard = ({
  meet,
  locale = "en",
  variant = "carousel",
  actionSlot,
}: {
  meet: MeetWithDetails;
  locale?: Locale;
  variant?: "carousel" | "grid" | "featured";
  actionSlot?: any;
}) => {
  const formattedDate = formatLocalizedDate(meet.scheduled_date, locale);
  const formattedTime = formatLocalizedTime(meet.scheduled_time, locale);
  const formattedDuration = formatLocalizedNumber(meet.duration_minutes, locale);
  const formattedAttendeeCount = formatLocalizedNumber(meet.attendee_count, locale);

  const statusLabel =
    meet.status === "live"
      ? t("meet.status.live", locale)
      : meet.status === "completed"
      ? t("meet.status.completed", locale)
      : t("meet.status.upcoming", locale);

  const statusBadgeColor =
    meet.status === "live"
      ? "badge-success text-white"
      : meet.status === "completed"
      ? "badge-ghost"
      : "badge-primary";

  const excerpt = getMarkdownExcerpt(meet.description, variant === "featured" ? 160 : 120);

  const containerClasses =
    variant === "carousel"
      ? "carousel-item w-full sm:w-80 md:w-96 flex-shrink-0 flex flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm transition hover:-translate-y-1 hover:shadow-xl group"
      : variant === "featured"
      ? "relative overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-3 shadow-2xl transition hover:shadow-3xl group"
      : "flex flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm transition hover:shadow-md group";

  if (variant === "featured") {
    return (
      <article class={containerClasses} id={`meet-card-featured-${meet.id}`}>
        <div class="relative aspect-video w-full overflow-hidden rounded-2xl bg-base-300">
          <img
            class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            src={meet.image_url ?? "/placeholder-meet.svg"}
            alt={meet.title}
            loading="lazy"
          />
          <div class="badge absolute start-3 top-3 border-0 bg-base-100/90 text-xs font-medium text-base-content backdrop-blur-sm">
            {t("hero.up_next", locale)} · {formattedDate}
          </div>
          <div class="badge absolute end-3 top-3 border-0 p-0 text-xs font-medium">
            <span class={`badge ${statusBadgeColor} badge-sm`}>{statusLabel}</span>
          </div>
        </div>

        <div class="p-4 space-y-3">
          <div class="flex items-center justify-between text-xs text-base-content/60">
            <span>
              {formattedTime} · {formattedDuration} {t("meet.minutes", locale)}
            </span>
            {meet.access_status === "private" && (
              <span class="badge badge-warning badge-xs gap-1">🔒 {t("meet.private", locale)}</span>
            )}
          </div>

          <h2 class="text-2xl font-bold tracking-tight hover:text-primary transition-colors">
            <a href={`/meets/${meet.id}`}>{meet.title}</a>
          </h2>

          {excerpt ? (
            <p class="text-sm text-base-content/70 line-clamp-2" dir="auto">
              {excerpt}
            </p>
          ) : (
            <p class="text-sm text-base-content/60">
              {meet.topics.join(" · ") || t("hero.open_discussion", locale)}
            </p>
          )}

          {meet.tags.length > 0 && (
            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              {meet.tags.slice(0, 4).map((tag) => (
                <TagBadge key={tag.id} title={tag.title} description={tag.description} size="xs" />
              ))}
            </div>
          )}

          <div class="mt-4 flex items-center justify-between border-t border-base-200 pt-3">
            <span class="text-sm font-medium text-base-content/60">
              {formattedAttendeeCount} {t("hero.attending", locale)}
            </span>
            <a class="btn btn-sm btn-primary" href={`/meets/${meet.id}`}>
              {t("hero.view_details", locale)}
            </a>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article class={containerClasses} id={`meet-card-${meet.id}`}>
      <div class="relative aspect-video w-full overflow-hidden bg-base-300">
        <img
          class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          src={meet.image_url ?? "/placeholder-meet.svg"}
          alt={meet.title}
          loading="lazy"
        />
        <div class="badge absolute start-3 top-3 border-0 bg-base-100/90 text-xs font-medium text-base-content backdrop-blur-sm">
          {formattedDate}
        </div>
        <div class="badge absolute end-3 top-3 border-0 p-0 text-xs font-medium">
          <span class={`badge ${statusBadgeColor} badge-sm`}>{statusLabel}</span>
        </div>
      </div>

      <div class="flex flex-1 flex-col justify-between space-y-3 p-5">
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs text-base-content/60">
            <span>
              {formattedTime} · {formattedDuration} {t("meet.minutes", locale)}
            </span>
            {meet.access_status === "private" && (
              <span class="badge badge-warning badge-xs gap-1">🔒 {t("meet.private", locale)}</span>
            )}
          </div>

          <h3 class="mt-1 text-base font-bold text-base-content line-clamp-1 hover:text-primary transition-colors">
            <a href={`/meets/${meet.id}`}>{meet.title}</a>
          </h3>

          {excerpt ? (
            <p class="text-xs leading-relaxed text-base-content/70 line-clamp-2" dir="auto">
              {excerpt}
            </p>
          ) : null}

          {meet.tags.length > 0 && (
            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              {meet.tags.slice(0, 3).map((tag) => (
                <TagBadge key={tag.id} title={tag.title} description={tag.description} size="xs" />
              ))}
            </div>
          )}
        </div>

        <div class="flex items-center justify-between border-t border-base-200 pt-3.5 mt-auto">
          <span class="text-xs font-medium text-base-content/60">
            {formattedAttendeeCount} {t("hero.attending", locale)}
          </span>
          {actionSlot ? (
            actionSlot
          ) : (
            <a class="btn btn-primary btn-sm shadow-xs" href={`/meets/${meet.id}`}>
              {t("hero.view_details", locale)}
            </a>
          )}
        </div>
      </div>
    </article>
  );
};
