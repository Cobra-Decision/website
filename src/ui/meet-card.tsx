import type { MeetWithDetails } from "../modules/events/types";
import type { Locale } from "../lib/i18n/translations";
import { t, formatLocalizedNumber } from "../lib/i18n/context";
import { formatLocalizedDate, formatLocalizedTime } from "../modules/events/datetime";
import { TagBadge } from "./tag-badge";
import { MeetStatusBadge, MeetAccessBadge } from "./meet-badges";

/**
 * Extracts clean plaintext excerpt from markdown content for previews.
 */
export function getMarkdownExcerpt(markdown: string | null | undefined, maxLength = 140): string {
  if (!markdown || !markdown.trim()) return "";
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
  imagePriority = false,
}: {
  meet: MeetWithDetails;
  locale?: Locale;
  variant?: "carousel" | "grid" | "featured";
  actionSlot?: any;
  imagePriority?: boolean;
}) => {
  const formattedDate = formatLocalizedDate(meet.scheduled_date, locale);
  const formattedTime = formatLocalizedTime(meet.scheduled_time, locale);
  const formattedDuration = formatLocalizedNumber(meet.duration_minutes, locale);
  const formattedAttendeeCount = formatLocalizedNumber(meet.attendee_count, locale);

  const excerpt = getMarkdownExcerpt(meet.description, variant === "featured" ? 160 : 120);

  const isFeatured = variant === "featured";
  const isCarousel = variant === "carousel";

  const cardClasses = isCarousel
    ? "carousel-item w-[85vw] max-w-[340px] sm:w-80 md:w-96 flex-shrink-0 flex flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm transition hover:-translate-y-1 hover:shadow-xl group"
    : isFeatured
    ? "relative overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-3 shadow-2xl transition hover:shadow-3xl group"
    : "flex flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm transition hover:shadow-md group";

  const tagLimit = isFeatured ? 4 : 3;

  return (
    <article class={cardClasses} id={`meet-card-${isFeatured ? "featured-" : ""}${meet.id}`}>
      {/* Thumbnail with background blur */}
      <div class={`relative aspect-video w-full overflow-hidden bg-base-300 ${isFeatured ? "rounded-2xl" : ""}`}>
        <div
          class="absolute inset-0 bg-cover bg-center blur-md opacity-50 scale-110"
          style={`background-image: url('${meet.image_url ?? "/placeholder-meet.svg"}')`}
        />
        <img
          class="relative z-10 h-full w-full object-contain transition duration-500 group-hover:scale-105"
          src={meet.image_url ?? "/placeholder-meet.svg"}
          alt={meet.title}
          loading={imagePriority || isFeatured ? "eager" : "lazy"}
          {...(imagePriority || isFeatured ? { fetchpriority: "high" } : {})}
        />
        <div class="badge absolute start-3 top-3 border-0 bg-base-100/90 text-xs font-medium text-base-content backdrop-blur-sm z-10">
          {isFeatured ? `${t("hero.up_next", locale)} · ${formattedDate}` : formattedDate}
        </div>
        <div class="badge absolute end-3 top-3 border-0 p-0 text-xs font-medium z-10">
          <MeetStatusBadge status={meet.status} locale={locale} size="sm" />
        </div>
      </div>

      {/* Card Body */}
      <div class={`flex flex-1 flex-col justify-between ${isFeatured ? "p-4 space-y-3" : "p-5 space-y-3"}`}>
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs text-base-content/60">
            <span>
              {formattedTime} · {formattedDuration} {t("meet.minutes", locale)}
            </span>
            <MeetAccessBadge accessStatus={meet.access_status} locale={locale} size="xs" />
          </div>

          <h3 class={`${isFeatured ? "text-2xl" : "text-base line-clamp-1"} font-bold tracking-tight text-base-content hover:text-primary transition-colors`}>
            <a href={`/meets/${meet.id}`}>{meet.title}</a>
          </h3>

          {excerpt ? (
            <p class={`${isFeatured ? "text-sm" : "text-xs"} leading-relaxed text-base-content/70 line-clamp-2`} dir="auto">
              {excerpt}
            </p>
          ) : (
            <p class="text-xs text-base-content/60">
              {meet.topics.join(" · ") || t("hero.open_discussion", locale)}
            </p>
          )}

          {meet.tags.length > 0 && (
            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              {meet.tags.slice(0, tagLimit).map((tag) => (
                <TagBadge key={tag.id} title={tag.title} description={tag.description} size="xs" />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div class="flex items-center justify-between border-t border-base-200 pt-3.5 mt-auto">
          <span class={`${isFeatured ? "text-sm" : "text-xs"} font-medium text-base-content/60`}>
            {formattedAttendeeCount} {t("hero.attending", locale)}
          </span>
          {actionSlot ? (
            actionSlot
          ) : (
            <a class={`btn btn-primary ${isFeatured ? "btn-sm" : "btn-sm"} shadow-xs`} href={`/meets/${meet.id}`}>
              {t("hero.view_details", locale)}
            </a>
          )}
        </div>
      </div>
    </article>
  );
};
