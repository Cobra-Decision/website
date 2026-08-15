import type { MeetWithDetails, Tag } from "../../events/types";
import type { Profile } from "../../auth/views";
import { Layout } from "../../../ui/layout";
import { DashboardNavbar } from "../../../ui/dashboard";
import { UnifiedMeetCard } from "../../../ui/meet-card";
import type { Locale } from "../../../lib/i18n/translations";
import { t, isRtl } from "../../../lib/i18n/context";

export const RsvpButton = ({
  meet,
  isAttending,
  locale = "en",
}: {
  meet: MeetWithDetails;
  isAttending: boolean;
  locale?: Locale;
}) => (
  <div class="rsvp-button" id={`rsvp-btn-${meet.id}`}>
    {meet.status === "completed" ? (
      <span class="badge badge-ghost text-xs py-2 px-3">{t("meet.status.completed", locale)}</span>
    ) : isAttending ? (
      <button
        type="button"
        hx-delete={`/meets/${meet.id}/attend`}
        hx-target={`#rsvp-btn-${meet.id}`}
        hx-swap="outerHTML"
        class="btn btn-sm btn-outline btn-success gap-1 hover:btn-error"
      >
        <span>{t("meet.joined", locale)}</span>
        <span class="text-xs opacity-75">({t("meet.leave", locale)})</span>
      </button>
    ) : (
      <button
        type="button"
        hx-post={`/meets/${meet.id}/attend`}
        hx-target={`#rsvp-btn-${meet.id}`}
        hx-swap="outerHTML"
        class="btn btn-sm btn-primary"
      >
        {t("meet.attend", locale)}
      </button>
    )}
  </div>
);

export const MeetsGrid = ({
  meets,
  userId,
  locale = "en",
}: {
  meets: MeetWithDetails[];
  userId: string;
  locale?: Locale;
}) => (
  <div id="meets-grid" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {meets.length ? (
      meets.map((meet) => {
        const isAttending = meet.attendee_ids.includes(userId);
        return (
          <UnifiedMeetCard
            key={meet.id}
            meet={meet}
            locale={locale}
            variant="grid"
            actionSlot={<RsvpButton meet={meet} isAttending={isAttending} locale={locale} />}
          />
        );
      })
    ) : (
      <div class="col-span-full rounded-2xl border border-dashed border-base-300 bg-base-100 p-12 text-center text-base-content/60">
        {t("dashboard.empty", locale)}
      </div>
    )}
  </div>
);

export const UserDashboard = ({
  user,
  meets,
  tags,
  activeTab = "all",
  locale = "en",
}: {
  user: Profile;
  meets: MeetWithDetails[];
  tags: Tag[];
  activeTab?: "all" | "attended";
  locale?: Locale;
}) => {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || user.email;
  const isSuperAdmin = user.role_title === "Super Admin" || user.role_title === "admin";
  const rtl = isRtl(locale);

  return (
    <Layout title={`${t("nav.dashboard", locale)} | CobraDecision`} locale={locale}>
      <div class="drawer lg:drawer-open min-h-screen bg-base-200">
        <input id="user-drawer" type="checkbox" class="drawer-toggle" />

        <div class="drawer-content flex flex-col">
          {/* Reusable Dashboard Top Navbar */}
          <DashboardNavbar
            drawerId="user-drawer"
            brandHref="/dashboard/user/meets"
            user={{
              name,
              email: user.email,
              role: user.role_title,
              isSuperAdmin,
            }}
            currentView="user"
            locale={locale}
          />

          {/* Main Dashboard Content */}
          <main class="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 class="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
                  {activeTab === "attended" ? t("dashboard.my_title", locale) : t("dashboard.all_title", locale)}
                </h1>
                <p class="text-sm text-base-content/60">
                  {t("dashboard.subtitle", locale)}
                </p>
              </div>
            </div>

            {/* Interactive Filter Bar */}
            <div class="card border border-base-300 bg-base-100 p-4 shadow-sm">
              <form
                id="filter-form"
                hx-get="/dashboard/user/meets/filter"
                hx-trigger="keyup changed delay:300ms, change"
                hx-target="#meets-grid"
                hx-swap="outerHTML"
                class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <input type="hidden" name="attendedOnly" value={activeTab === "attended" ? "true" : "false"} />

                <label class="form-control">
                  <span class="label-text font-medium text-xs">{t("dashboard.search_label", locale)}</span>
                  <input
                    class="input input-bordered input-sm w-full"
                    type="text"
                    name="q"
                    placeholder={t("dashboard.search_placeholder", locale)}
                  />
                </label>

                <label class="form-control">
                  <span class="label-text font-medium text-xs">{t("dashboard.tag_label", locale)}</span>
                  <select class="select select-bordered select-sm w-full" name="tagId">
                    <option value="">{t("dashboard.all_tags", locale)}</option>
                    {tags.map((tag) => (
                      <option value={tag.id} key={tag.id}>
                        {tag.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label class="form-control">
                  <span class="label-text font-medium text-xs">{t("dashboard.from_date", locale)}</span>
                  <input class="input input-bordered input-sm w-full" type="date" name="startDate" />
                </label>

                <label class="form-control">
                  <span class="label-text font-medium text-xs">{t("dashboard.to_date", locale)}</span>
                  <input class="input input-bordered input-sm w-full" type="date" name="endDate" />
                </label>
              </form>
            </div>

            {/* Meets Grid */}
            <MeetsGrid meets={meets} userId={user.id!} locale={locale} />
          </main>
        </div>

        {/* Flat Sidebar */}
        <aside class="drawer-side z-20">
          <label for="user-drawer" class="drawer-overlay" aria-label="close sidebar"></label>
          <ul class="menu p-4 w-72 min-h-full bg-base-100 text-base-content border-e border-base-300 space-y-1">
            <li class="menu-title text-xs font-bold uppercase tracking-wider text-base-content/50">
              {t("nav.meets", locale)}
            </li>
            <li>
              <a href="/dashboard/user/meets" class={activeTab === "all" ? "active font-semibold" : ""}>
                {t("nav.all_meets", locale)}
              </a>
            </li>
            <li>
              <a href="/dashboard/user/my-meets" class={activeTab === "attended" ? "active font-semibold" : ""}>
                {t("nav.my_meets", locale)}
              </a>
            </li>
          </ul>
        </aside>
      </div>
    </Layout>
  );
};
