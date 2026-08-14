import type { MeetWithDetails, Tag } from "../../events/types";
import type { Profile } from "../../auth/views";
import { Layout } from "../../../ui/layout";
import { DashboardNavbar } from "../../../ui/dashboard";
import { TagBadge } from "../../../ui/tag-badge";

export const RsvpButton = ({ meet, isAttending }: { meet: MeetWithDetails; isAttending: boolean }) => (
  <div class="rsvp-button" id={`rsvp-btn-${meet.id}`}>
    {isAttending ? (
      <button
        type="button"
        hx-delete={`/meets/${meet.id}/attend`}
        hx-target={`#rsvp-btn-${meet.id}`}
        hx-swap="outerHTML"
        class="btn btn-sm btn-outline btn-success gap-1 hover:btn-error"
      >
        <span>Joined ✓</span>
        <span class="text-xs opacity-75">(Leave)</span>
      </button>
    ) : (
      <button
        type="button"
        hx-post={`/meets/${meet.id}/attend`}
        hx-target={`#rsvp-btn-${meet.id}`}
        hx-swap="outerHTML"
        class="btn btn-sm btn-primary"
      >
        Attend Meeting
      </button>
    )}
  </div>
);

export const MemberMeetCard = ({ meet, userId }: { meet: MeetWithDetails; userId: string }) => {
  const isAttending = meet.attendee_ids.includes(userId);
  return (
    <article class="flex flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm transition hover:shadow-md" id={`meet-card-${meet.id}`}>
      <div class="relative aspect-video w-full overflow-hidden bg-base-300">
        <img
          class="h-full w-full object-cover"
          src={meet.image_url ?? "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80"}
          alt={meet.title}
        />
        <div class="badge absolute left-3 top-3 border-0 bg-base-100/90 text-xs font-medium text-base-content">
          {meet.scheduled_date}
        </div>
      </div>
      <div class="flex flex-1 flex-col justify-between space-y-3 p-5">
        <div>
          <p class="text-xs text-base-content/60">
            {meet.scheduled_time} · {meet.duration_minutes} min
          </p>
          <h3 class="mt-1 text-base font-bold text-base-content line-clamp-1">
            <a href={`/meets/${meet.id}`} class="hover:text-primary">
              {meet.title}
            </a>
          </h3>
          {meet.description ? (
            <p class="mt-1 text-xs text-base-content/70 line-clamp-2">
              {meet.description}
            </p>
          ) : null}
          <div class="mt-2 flex flex-wrap gap-1">
            {meet.tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag.id} title={tag.title} description={tag.description} size="xs" />
            ))}
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-base-200 pt-3">
          <span class="text-xs text-base-content/60">{meet.attendee_count} attending</span>
          <RsvpButton meet={meet} isAttending={isAttending} />
        </div>
      </div>
    </article>
  );
};

export const MeetsGrid = ({ meets, userId }: { meets: MeetWithDetails[]; userId: string }) => (
  <div id="meets-grid" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {meets.length ? (
      meets.map((meet) => <MemberMeetCard key={meet.id} meet={meet} userId={userId} />)
    ) : (
      <div class="col-span-full rounded-2xl border border-dashed border-base-300 bg-base-100 p-12 text-center text-base-content/60">
        No meetings found matching your criteria.
      </div>
    )}
  </div>
);

export const UserDashboard = ({
  user,
  meets,
  tags,
  activeTab = "all",
}: {
  user: Profile;
  meets: MeetWithDetails[];
  tags: Tag[];
  activeTab?: "all" | "attended";
}) => {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || user.email;
  const isSuperAdmin = user.role_title === "Super Admin" || user.role_title === "admin";

  return (
    <Layout title="Member Dashboard | CobraDecision">
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
          />

          {/* Main Dashboard Content */}
          <main class="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 class="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
                  {activeTab === "attended" ? "My Attended Meetings" : "All Meetings"}
                </h1>
                <p class="text-sm text-base-content/60">
                  Explore and RSVP to live community conversations.
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
                  <span class="label-text font-medium text-xs">Search Title / Topic</span>
                  <input
                    class="input input-bordered input-sm w-full"
                    type="text"
                    name="q"
                    placeholder="Search keywords..."
                  />
                </label>

                <label class="form-control">
                  <span class="label-text font-medium text-xs">Filter by Tag</span>
                  <select class="select select-bordered select-sm w-full" name="tagId">
                    <option value="">All Tags</option>
                    {tags.map((tag) => (
                      <option value={tag.id} key={tag.id}>
                        {tag.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label class="form-control">
                  <span class="label-text font-medium text-xs">From Date</span>
                  <input class="input input-bordered input-sm w-full" type="date" name="startDate" />
                </label>

                <label class="form-control">
                  <span class="label-text font-medium text-xs">To Date</span>
                  <input class="input input-bordered input-sm w-full" type="date" name="endDate" />
                </label>
              </form>
            </div>

            {/* Meets Grid */}
            <MeetsGrid meets={meets} userId={user.id!} />
          </main>
        </div>

        {/* Text-Only Flat Sidebar (no collapsible tree) */}
        <aside class="drawer-side z-20">
          <label for="user-drawer" class="drawer-overlay" aria-label="close sidebar"></label>
          <ul class="menu p-4 w-72 min-h-full bg-base-100 text-base-content border-r border-base-300 space-y-1">
            <li class="menu-title text-xs font-bold uppercase tracking-wider text-base-content/50">
              Meetings
            </li>
            <li>
              <a href="/dashboard/user/meets" class={activeTab === "all" ? "active font-semibold" : ""}>
                All Meetings
              </a>
            </li>
            <li>
              <a href="/dashboard/user/my-meets" class={activeTab === "attended" ? "active font-semibold" : ""}>
                My Attended Meetings
              </a>
            </li>
          </ul>
        </aside>
      </div>
    </Layout>
  );
};
