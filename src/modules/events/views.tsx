import type { MeetWithDetails } from "./types";
import { TagBadge } from "../../ui/tag-badge";
import { renderMarkdown } from "../../lib/markdown";
import type { Locale } from "../../lib/i18n/translations";
import { t, formatLocalizedNumber } from "../../lib/i18n/context";
import { formatLocalizedDate, formatLocalizedTime } from "./datetime";
import { LanguageSwitch } from "../../ui/language-switch";
import { VideoIcon, FileTextIcon, DownloadIcon, LockIcon, ChevronDownIcon, ChevronUpIcon } from "../../ui/icons";

export const DynamicCtaButton = ({
  meetId,
  isAuthenticated,
  isAttending,
  meetStatus = "upcoming",
  locale = "en",
}: {
  meetId: string;
  isAuthenticated: boolean;
  isAttending: boolean;
  meetStatus?: string;
  locale?: Locale;
}) => {
  if (meetStatus === "completed" || meetStatus === "cancelled") {
    return (
      <div class="rounded-xl bg-base-200 p-3 text-center text-xs font-medium text-base-content/60">
        {t("meet.completed_notice", locale)}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <a href="/auth" class="btn btn-primary w-full shadow-sm">
        {t("meet.sign_in_to_attend", locale)}
      </a>
    );
  }

  if (isAttending) {
    const modalId = `modal-leave-${meetId}`;
    return (
      <div class="w-full">
        <button
          type="button"
          onclick={`document.getElementById('${modalId}').showModal()`}
          class="btn btn-outline btn-error w-full transition-all"
        >
          {t("meet.cancel_attend", locale)}
        </button>
        <dialog id={modalId} class="modal modal-bottom sm:modal-middle text-start">
          <div class="modal-box">
            <h3 class="font-bold text-lg text-base-content">{t("meet.confirm_leave_title", locale)}</h3>
            <p class="py-4 text-sm text-base-content/80">{t("meet.confirm_leave_desc", locale)}</p>
            <div class="modal-action">
              <form method="dialog">
                <button class="btn btn-sm btn-ghost">{t("meet.cancel", locale)}</button>
              </form>
              <button
                type="button"
                hx-delete={`/meets/${meetId}/attend`}
                hx-target="#attend-action"
                hx-swap="innerHTML"
                onclick={`document.getElementById('${modalId}').close()`}
                class="btn btn-sm btn-error"
              >
                {t("meet.confirm", locale)}
              </button>
            </div>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>
      </div>
    );
  }

  const modalId = `modal-attend-${meetId}`;
  return (
    <div class="w-full">
      <button
        type="button"
        onclick={`document.getElementById('${modalId}').showModal()`}
        class="btn btn-primary w-full shadow-md transition-all"
      >
        {t("meet.attend", locale)}
      </button>
      <dialog id={modalId} class="modal modal-bottom sm:modal-middle text-start">
        <div class="modal-box">
          <h3 class="font-bold text-lg text-base-content">{t("meet.confirm_attend_title", locale)}</h3>
          <p class="py-4 text-sm text-base-content/80">{t("meet.confirm_attend_desc", locale)}</p>
          <div class="modal-action">
            <form method="dialog">
              <button class="btn btn-sm btn-ghost">{t("meet.cancel", locale)}</button>
            </form>
            <button
              type="button"
              hx-post={`/meets/${meetId}/attend`}
              hx-target="#attend-action"
              hx-swap="innerHTML"
              onclick={`document.getElementById('${modalId}').close()`}
              class="btn btn-sm btn-primary"
            >
              {t("meet.confirm", locale)}
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
};

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  return ytMatch ? `https://www.youtube-nocookie.com/embed/${ytMatch[1]}` : null;
}

export const MeetingVideoSection = ({
  videoUrl,
  title,
  locale = "en",
}: {
  videoUrl: string;
  title: string;
  locale?: Locale;
}) => {
  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  return (
    <section class="space-y-3 rounded-2xl border border-primary/30 bg-base-100 p-6 shadow-sm">
      <div class="flex items-center justify-between gap-2 border-b border-base-200 pb-3">
        <div class="flex items-center gap-2">
          <VideoIcon class="h-5 w-5 text-primary shrink-0" />
          <div>
            <h3 class="text-lg font-bold text-base-content">{t("meet.recording_title", locale)}</h3>
            <p class="text-xs text-base-content/60">{t("meet.recording_desc", locale)}</p>
          </div>
        </div>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-xs btn-outline btn-primary"
        >
          {t("meet.watch_recording", locale)} ↗
        </a>
      </div>

      <div class="overflow-hidden rounded-xl bg-black shadow-inner">
        {embedUrl ? (
          <div class="relative aspect-video w-full">
            <iframe
              class="absolute inset-0 h-full w-full border-0"
              src={embedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <video
            class="aspect-video w-full"
            controls
            preload="metadata"
            src={videoUrl}
          >
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    </section>
  );
};

export const MeetAccessBanner = ({
  meet,
  isAuthenticated = false,
  isAttending = false,
  locale = "en",
}: {
  meet: MeetWithDetails;
  isAuthenticated?: boolean;
  isAttending?: boolean;
  locale?: Locale;
}) => {
  // If completed, live room is not accessible
  if (meet.status === "completed") {
    return null;
  }

  const isPublic = meet.access_status === "public";
  const canAccessMeetUrl = Boolean(meet.meet_url && (isPublic || isAttending));

  if (!meet.meet_url) return null;

  return (
    <div id="meet-access-box" class="w-full">
      {canAccessMeetUrl ? (
        <div class="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center sm:text-start sm:flex sm:items-center sm:justify-between shadow-sm transition-all">
          <div>
            <h3 class="text-lg font-bold text-base-content">{t("meet.ready_to_join", locale)}</h3>
            <p class="text-sm text-base-content/70">{t("meet.room_live", locale)}</p>
          </div>
          <a
            class="btn btn-primary mt-4 sm:mt-0 shadow-md font-semibold"
            href={meet.meet_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("meet.join_url", locale)}
          </a>
        </div>
      ) : (
        <div class="rounded-2xl border border-warning/30 bg-warning/5 p-6 text-center sm:text-start sm:flex sm:items-center sm:justify-between shadow-sm transition-all">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="badge badge-warning badge-sm gap-1">
                <LockIcon class="h-3 w-3" />
                {t("meet.private", locale)}
              </span>
              <h3 class="text-base font-bold text-base-content">{t("meet.private_notice_title", locale)}</h3>
            </div>
            <p class="text-xs text-base-content/70">
              {t("meet.private_notice_desc", locale)}
            </p>
          </div>
          <div class="mt-4 sm:mt-0 sm:min-w-44">
            <DynamicCtaButton meetId={meet.id} isAuthenticated={isAuthenticated} isAttending={isAttending} meetStatus={meet.status} locale={locale} />
          </div>
        </div>
      )}
    </div>
  );
};

export const MeetingDetailPage = ({
  meet,
  isAuthenticated = false,
  isAttending = false,
  locale = "en",
}: {
  meet: MeetWithDetails;
  isAuthenticated?: boolean;
  isAttending?: boolean;
  locale?: Locale;
}) => {
  const presenterName = meet.presenter
    ? [meet.presenter.first_name, meet.presenter.last_name].filter(Boolean).join(" ") || meet.presenter.username || meet.presenter.email
    : t("meet.open_discussion", locale);

  const formattedDate = formatLocalizedDate(meet.scheduled_date, locale);
  const formattedTime = formatLocalizedTime(meet.scheduled_time, locale);
  const formattedDuration = formatLocalizedNumber(meet.duration_minutes, locale);
  const formattedAttendeeCount = formatLocalizedNumber(meet.attendee_count, locale);

  const isPublic = meet.access_status === "public";

  const statusLabel =
    meet.status === "live"
      ? t("meet.status.live", locale)
      : meet.status === "completed"
      ? t("meet.status.completed", locale)
      : t("meet.status.upcoming", locale);

  const statusBadgeColor =
    meet.status === "live"
      ? "badge-success animate-pulse text-white"
      : meet.status === "completed"
      ? "badge-ghost"
      : "badge-primary";

  const accessLabel = isPublic ? t("meet.public", locale) : t("meet.private", locale);
  const accessBadgeColor = isPublic ? "badge-outline" : "badge-warning badge-outline";

  return (
    <div class="min-h-screen bg-base-100 text-base-content overflow-x-hidden w-full max-w-full">
      {/* Header / Nav */}
      <header class="border-b border-base-200 bg-base-100">
        <nav class="navbar mx-auto min-h-16 max-w-7xl px-3 sm:px-8 flex-wrap gap-2">
          <a class="flex-1 inline-flex items-center gap-2.5 text-lg sm:text-xl font-bold tracking-tight shrink-0" href="/">
            <img src="/favicon.svg" alt="CobraDecision" class="h-7 w-auto" />
            <span>{t("brand.name", locale)}<span class="text-primary">.</span></span>
          </a>
          <div class="flex items-center gap-1 sm:gap-2">
            <LanguageSwitch currentLocale={locale} size="xs" />
            <a class="btn btn-ghost btn-xs sm:btn-sm px-2 sm:px-3" href="/dashboard/user/meets">
              {t("nav.dashboard", locale)}
            </a>
            <a class="btn btn-ghost btn-xs sm:btn-sm px-2 sm:px-3" href="/#meets">
              {t("nav.back_to_meets", locale)}
            </a>
          </div>
        </nav>
      </header>

      {/* Hero / Header Section */}
      <div class="border-b border-base-200 bg-gradient-to-br from-base-100 via-base-100 to-primary/5 py-12">
        <div class="mx-auto max-w-7xl px-5 sm:px-8">
          <div class="grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
            <div class="space-y-4">
              <div class="flex flex-wrap items-center gap-2">
                <span class={`badge ${statusBadgeColor} font-medium`}>{statusLabel}</span>
                <span class={`badge ${accessBadgeColor} font-medium`}>{accessLabel}</span>
                <span class="badge badge-neutral font-medium">{formattedDate}</span>
                <span class="badge badge-outline">{formattedTime}</span>
                <span class="badge badge-ghost">{formattedDuration} {t("meet.minutes", locale)}</span>
              </div>
              <h1 class="text-3xl font-extrabold tracking-tight sm:text-5xl text-base-content">
                {meet.title}
              </h1>
              {meet.topics.length > 0 && (
                <p class="text-base text-base-content/70">
                  <span class="font-semibold text-base-content">{t("meet.topics", locale)}: </span>
                  {meet.topics.join(" · ")}
                </p>
              )}
            </div>

            <div class="relative aspect-video w-full overflow-hidden rounded-2xl border border-base-300 bg-base-200 shadow-md">
              <div
                class="absolute inset-0 bg-cover bg-center blur-lg opacity-50 scale-110"
                style={`background-image: url('${meet.image_url ?? "/placeholder-meet.svg"}')`}
              />
              <img
                class="relative z-10 h-full w-full object-contain"
                src={meet.image_url ?? "/placeholder-meet.svg"}
                alt={meet.title}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Body & Sidebar */}
      <div class="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div class="grid gap-10 lg:grid-cols-[1fr_320px]">
          {/* Main Description */}
          <div class="space-y-8 min-w-0 max-w-full">
            <div
              x-data="{
                expanded: false,
                isClamped: false,
                maxCollapsedHeight: 280,
                checkClamp() {
                  if (this.$refs.descContent) {
                    this.isClamped = this.$refs.descContent.scrollHeight > this.maxCollapsedHeight;
                  }
                }
              }"
              x-init="$nextTick(() => checkClamp())"
              {...{ "x-on:resize.window.debounce.150ms": "checkClamp()" }}
              class="w-full max-w-full min-w-0"
            >
              <h2 class="text-2xl font-bold text-base-content mb-4">{t("meet.about", locale)}</h2>
              <div class="relative w-full max-w-full min-w-0 bg-base-100 rounded-2xl border border-base-200/60 p-4 sm:p-6 shadow-sm overflow-hidden transition-all duration-300">
                <div
                  x-ref="descContent"
                  class="prose prose-base w-full max-w-full min-w-0 text-base-content/90 leading-relaxed transition-[max-height] duration-300 ease-in-out break-words [overflow-wrap:anywhere]"
                  x-bind:class="(!expanded && isClamped) ? 'max-h-[280px] overflow-hidden' : ''"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(meet.description) || `<p class="italic text-base-content/50">${t("meet.no_description", locale)}</p>`,
                  }}
                />

                {/* Fade overlay when collapsed */}
                <div
                  x-show="!expanded && isClamped"
                  class="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-base-100 via-base-100/80 to-transparent"
                />
              </div>

              {/* Expand / Minimize Toggle Button */}
              <div x-show="isClamped" class="mt-3 flex justify-center">
                <button
                  type="button"
                  x-on:click="expanded = !expanded"
                  class="btn btn-ghost btn-sm gap-2 text-primary hover:bg-primary/10 rounded-xl"
                  aria-label="Toggle description length"
                >
                  <span x-show="!expanded" class="flex items-center gap-1.5 font-medium">
                    {t("meet.show_more", locale)}
                    <ChevronDownIcon class="h-4 w-4" />
                  </span>
                  <span x-show="expanded" class="flex items-center gap-1.5 font-medium">
                    {t("meet.show_less", locale)}
                    <ChevronUpIcon class="h-4 w-4" />
                  </span>
                </button>
              </div>
            </div>

            {/* Presentation Attachment Material Card */}
            {meet.file_url && (
              <div class="rounded-2xl border border-secondary/30 bg-secondary/5 p-6 sm:flex sm:items-center sm:justify-between shadow-sm">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <FileTextIcon class="h-5 w-5 text-secondary shrink-0" />
                    <h3 class="text-lg font-bold text-base-content">{t("meet.presentation_title", locale)}</h3>
                  </div>
                  <p class="text-sm text-base-content/70">
                    {t("meet.presentation_desc", locale)}
                  </p>
                </div>
                <a
                  class="btn btn-secondary btn-outline mt-4 sm:mt-0 gap-2"
                  href={meet.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <DownloadIcon class="h-4 w-4" />
                  {t("meet.download_presentation", locale)}
                </a>
              </div>
            )}

            {/* Video / Recording Embed Section */}
            {meet.video_url && (
              <MeetingVideoSection
                videoUrl={meet.video_url}
                title={meet.title}
                locale={locale}
              />
            )}

            {/* Room URL Access Banner */}
            <MeetAccessBanner meet={meet} isAuthenticated={isAuthenticated} isAttending={isAttending} locale={locale} />
          </div>

          {/* Sidebar Metadata */}
          <aside class="space-y-6">
            <div class="card rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
              <h3 class="text-lg font-bold border-b border-base-200 pb-3">{t("meet.session_details", locale)}</h3>

              <div class="mt-4 space-y-4 text-sm">
                <div>
                  <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">{t("meet.status", locale)} & {t("meet.access", locale)}</p>
                  <div class="mt-1 flex flex-wrap gap-1.5">
                    <span class={`badge ${statusBadgeColor} badge-sm`}>{statusLabel}</span>
                    <span class={`badge ${accessBadgeColor} badge-sm`}>{accessLabel}</span>
                  </div>
                </div>

                <div>
                  <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">{t("meet.date_time", locale)}</p>
                  <p class="mt-1 font-medium">{formattedDate} - {formattedTime}</p>
                </div>

                <div>
                  <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">{t("meet.duration", locale)}</p>
                  <p class="mt-1 font-medium">{formattedDuration} {t("meet.minutes", locale)}</p>
                </div>

                <div>
                  <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">{t("meet.presenter", locale)}</p>
                  <p class="mt-1 font-medium">{presenterName}</p>
                </div>

                <div>
                  <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">{t("meet.attendees", locale)}</p>
                  <p class="mt-1 font-medium">
                    <span id="meet-attendee-count">{formattedAttendeeCount}</span> {t("meet.registered", locale)}
                  </p>
                </div>

                {meet.tags.length > 0 && (
                  <div>
                    <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">{t("meet.tags", locale)}</p>
                    <div class="flex flex-wrap items-center gap-1.5">
                      {meet.tags.map((tag) => (
                        <TagBadge key={tag.id} title={tag.title} description={tag.description} size="xs" />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Auth / Attend CTA Container with stable dimensions */}
              <div class="mt-6 border-t border-base-200 pt-4">
                <div id="attend-action" class="w-full">
                  <DynamicCtaButton meetId={meet.id} isAuthenticated={isAuthenticated} isAttending={isAttending} meetStatus={meet.status} locale={locale} />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
