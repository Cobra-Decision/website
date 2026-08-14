import type { MeetWithDetails } from "./types";
import { TagBadge } from "../../ui/tag-badge";

export const DynamicCtaButton = ({
  meetId,
  isAuthenticated,
  isAttending,
}: {
  meetId: string;
  isAuthenticated: boolean;
  isAttending: boolean;
}) => {
  if (!isAuthenticated) {
    return (
      <a href={`/auth?redirect=/meets/${meetId}`} class="btn btn-primary w-full">
        Sign In to Attend
      </a>
    );
  }

  if (isAttending) {
    return (
      <button
        hx-delete={`/meets/${meetId}/attend`}
        hx-target="#attend-action"
        hx-swap="outerHTML"
        class="btn btn-outline btn-error w-full"
      >
        Cancel Attendance
      </button>
    );
  }

  return (
    <button
      hx-post={`/meets/${meetId}/attend`}
      hx-target="#attend-action"
      hx-swap="outerHTML"
      class="btn btn-primary w-full"
    >
      Attend Meeting
    </button>
  );
};

export const MeetingDetailPage = ({
  meet,
  isAuthenticated = false,
  isAttending = false,
}: {
  meet: MeetWithDetails;
  isAuthenticated?: boolean;
  isAttending?: boolean;
}) => {
  const presenterName = meet.presenter
    ? [meet.presenter.first_name, meet.presenter.last_name].filter(Boolean).join(" ") || meet.presenter.username || meet.presenter.email
    : "Open discussion / No presenter assigned";

  return (
    <div class="min-h-screen bg-base-100 text-base-content">
      {/* Header / Nav */}
      <header class="border-b border-base-200 bg-base-100">
        <nav class="navbar mx-auto min-h-16 max-w-7xl px-5 sm:px-8">
          <a class="flex-1 text-xl font-bold tracking-tight" href="/">
            CobraDecision<span class="text-primary">.</span>
          </a>
          <div class="flex-none gap-2">
            <a class="btn btn-ghost btn-sm" href="/dashboard/user/meets">
              Dashboard
            </a>
            <a class="btn btn-ghost btn-sm" href="/#meets">
              ← Back to Meets
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
                <span class="badge badge-primary font-medium">{meet.scheduled_date}</span>
                <span class="badge badge-outline">{meet.scheduled_time}</span>
                <span class="badge badge-ghost">{meet.duration_minutes} min duration</span>
              </div>
              <h1 class="text-3xl font-extrabold tracking-tight sm:text-5xl text-base-content">
                {meet.title}
              </h1>
              {meet.topics.length > 0 && (
                <p class="text-base text-base-content/70">
                  <span class="font-semibold text-base-content">Topics: </span>
                  {meet.topics.join(" · ")}
                </p>
              )}
            </div>

            <div class="overflow-hidden rounded-2xl border border-base-300 bg-base-200 shadow-md">
              <img
                class="aspect-video w-full object-cover"
                src={meet.image_url ?? "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1200&q=80"}
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
          <div class="space-y-8">
            <div>
              <h2 class="text-2xl font-bold text-base-content">About this meet</h2>
              <div class="mt-4 prose prose-base max-w-none text-base-content/80 whitespace-pre-line leading-relaxed">
                {meet.description || "No description provided for this session."}
              </div>
            </div>

            {meet.meet_url && (
              <div class="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center sm:text-left sm:flex sm:items-center sm:justify-between">
                <div>
                  <h3 class="text-lg font-bold text-base-content">Ready to join?</h3>
                  <p class="text-sm text-base-content/70">The virtual room link is live and accessible.</p>
                </div>
                <a
                  class="btn btn-primary mt-4 sm:mt-0"
                  href={meet.meet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Meeting URL →
                </a>
              </div>
            )}
          </div>

          {/* Sidebar Metadata */}
          <aside class="space-y-6">
            <div class="card rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
              <h3 class="text-lg font-bold border-b border-base-200 pb-3">Session Details</h3>

              <div class="mt-4 space-y-4 text-sm">
                <div>
                  <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Date & Time</p>
                  <p class="mt-1 font-medium">{meet.scheduled_date} at {meet.scheduled_time}</p>
                </div>

                <div>
                  <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Duration</p>
                  <p class="mt-1 font-medium">{meet.duration_minutes} minutes</p>
                </div>

                <div>
                  <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Presenter</p>
                  <p class="mt-1 font-medium">{presenterName}</p>
                  {meet.presenter?.email && (
                    <p class="text-xs text-base-content/60">{meet.presenter.email}</p>
                  )}
                </div>

                <div>
                  <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Attendees</p>
                  <p class="mt-1 font-medium">{meet.attendee_count} registered</p>
                </div>

                {meet.tags.length > 0 && (
                  <div>
                    <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">Tags</p>
                    <div class="flex flex-wrap gap-1.5">
                      {meet.tags.map((tag) => (
                        <TagBadge key={tag.id} title={tag.title} description={tag.description} size="sm" />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Auth / Attend CTA */}
              <div id="attend-action" class="mt-6 border-t border-base-200 pt-4">
                <DynamicCtaButton meetId={meet.id} isAuthenticated={isAuthenticated} isAttending={isAttending} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
