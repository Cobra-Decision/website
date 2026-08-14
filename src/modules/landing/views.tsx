import type { LandingCache } from "../../lib/cache";
import type { MeetWithDetails } from "../events/types";
import { TagBadge } from "../../ui/tag-badge";

const MeetCard = ({ meet }: { meet: MeetWithDetails }) => (
  <article class="carousel-item w-full sm:w-80 md:w-96 flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
    <div class="relative aspect-video w-full overflow-hidden bg-base-300">
      <img
        class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        src={meet.image_url ?? "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80"}
        alt={meet.title}
      />
      <div class="badge absolute left-4 top-4 border-0 bg-base-100/90 font-medium text-base-content">
        {meet.scheduled_date}
      </div>
    </div>
    <div class="flex flex-1 flex-col justify-between space-y-3 p-5">
      <div class="space-y-2">
        <div>
          <p class="text-sm text-base-content/60">
            {meet.scheduled_time} · {meet.duration_minutes} min
          </p>
          <h3 class="mt-1 text-lg font-bold text-base-content line-clamp-1">{meet.title}</h3>
        </div>
        {meet.description ? (
          <p class="text-sm leading-relaxed text-base-content/70 line-clamp-3">
            {meet.description}
          </p>
        ) : null}
        <div class="flex flex-wrap gap-2 pt-1">
          {meet.tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag.id} title={tag.title} description={tag.description} size="sm" />
          ))}
        </div>
      </div>
      <div class="flex items-center justify-between border-t border-base-200 pt-4">
        <span class="text-xs font-medium text-base-content/60">{meet.attendee_count} attending</span>
        <a class="btn btn-primary btn-sm" href={`/meets/${meet.id}`}>
          View Details
        </a>
      </div>
    </div>
  </article>
);

export const Landing = ({ data }: { data: LandingCache }) => {
  const featured = data.meets[0];
  return (
    <div class="overflow-x-hidden bg-base-100">
      <header class="border-b border-base-200 bg-base-100">
        <nav class="navbar mx-auto min-h-20 max-w-7xl px-5 sm:px-8">
          <a class="flex-1 text-xl font-bold tracking-tight" href="/">
            CobraDecision<span class="text-primary">.</span>
          </a>
          <div class="hidden gap-7 text-sm font-medium md:flex">
            <a class="link-hover" href="#how-it-works">How it works</a>
            <a class="link-hover" href="#meets">Meets</a>
            <a class="link-hover" href="#contact">Contact</a>
          </div>
          <div class="flex-none pl-4">
            <a class="btn btn-primary btn-sm px-5" href="/auth">Sign in</a>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section class="border-b border-base-200 bg-gradient-to-br from-base-100 via-base-100 to-primary/10">
          <div class="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24">
            <div class="max-w-2xl">
              <span class="badge badge-primary badge-outline mb-6 rounded-full px-4 py-3">
                A place for better conversations
              </span>
              <h1 class="text-5xl font-bold tracking-tight text-base-content sm:text-6xl lg:text-7xl">
                Make room for ideas that matter.
              </h1>
              <p class="mt-6 max-w-xl text-lg leading-8 text-base-content/65">
                Meet people who are building, questioning, and learning in the open. Small rooms. Thoughtful topics. Real connection.
              </p>
              <div class="mt-9 flex flex-wrap gap-3">
                <a class="btn btn-primary px-6" href="#meets">Explore upcoming meets</a>
                <a class="btn btn-ghost px-4" href="#how-it-works">How it works →</a>
              </div>
            </div>

            <div class="relative mx-auto w-full max-w-md">
              <div class="absolute -inset-5 rounded-[2rem] bg-primary/15 blur-2xl"></div>
              {featured ? (
                <div class="relative overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-3 shadow-2xl">
                  <img
                    class="aspect-video w-full rounded-2xl object-cover"
                    src={featured.image_url ?? "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=900&q=80"}
                    alt={featured.title}
                  />
                  <div class="p-4">
                    <p class="text-sm font-medium text-primary">UP NEXT · {featured.scheduled_date}</p>
                    <h2 class="mt-2 text-2xl font-bold">{featured.title}</h2>
                    <p class="mt-2 text-sm text-base-content/60">{featured.topics.join(" · ") || "Open discussion"}</p>
                    <div class="mt-5 flex items-center justify-between">
                      <span class="text-sm text-base-content/60">{featured.attendee_count} people attending</span>
                      <a class="btn btn-sm btn-primary" href={`/meets/${featured.id}`}>
                        View Details
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div class="relative rounded-3xl border border-dashed border-base-300 bg-base-100 p-12 text-center shadow-xl">
                  <div class="text-4xl">✦</div>
                  <h2 class="mt-4 text-xl font-bold">Your next meet starts here.</h2>
                  <p class="mt-2 text-base-content/60">Fresh conversations will appear here soon.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Detailed Centered Stats Bar */}
        <section class="border-b border-base-200 bg-base-100 py-10">
          <div class="mx-auto max-w-7xl px-5 sm:px-8">
            <div class="flex flex-wrap items-center justify-center gap-8 text-center sm:gap-16">
              <div class="px-4">
                <p class="text-sm font-medium text-base-content/60">Community members</p>
                <p class="mt-1 text-3xl font-extrabold text-primary sm:text-4xl">{data.totalUsers}</p>
              </div>
              <div class="h-10 w-px bg-base-300 hidden sm:block"></div>
              <div class="px-4">
                <p class="text-sm font-medium text-base-content/60">Hours of shared learning</p>
                <p class="mt-1 text-3xl font-extrabold text-primary sm:text-4xl">{data.totalMeetHours}</p>
              </div>
              <div class="h-10 w-px bg-base-300 hidden sm:block"></div>
              <div class="px-4">
                <p class="text-sm font-medium text-base-content/60">Featured conversations</p>
                <p class="mt-1 text-3xl font-extrabold text-primary sm:text-4xl">{data.meets.length}</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" class="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div class="max-w-xl">
            <p class="font-semibold text-primary">WHY COBRADECISION</p>
            <h2 class="mt-3 text-3xl font-bold sm:text-4xl">A calmer way to meet people around ideas.</h2>
          </div>
          <div class="mt-12 grid gap-5 md:grid-cols-3">
            <div class="rounded-2xl bg-base-200 p-7">
              <span class="text-3xl">01</span>
              <h3 class="mt-8 text-xl font-bold">Choose a conversation</h3>
              <p class="mt-3 leading-7 text-base-content/60">Explore topics and join the rooms where you can contribute.</p>
            </div>
            <div class="rounded-2xl bg-base-200 p-7">
              <span class="text-3xl">02</span>
              <h3 class="mt-8 text-xl font-bold">Show up prepared</h3>
              <p class="mt-3 leading-7 text-base-content/60">Know who is presenting, what is being discussed, and when to arrive.</p>
            </div>
            <div class="rounded-2xl bg-base-200 p-7">
              <span class="text-3xl">03</span>
              <h3 class="mt-8 text-xl font-bold">Keep the spark going</h3>
              <p class="mt-3 leading-7 text-base-content/60">Leave with new context, useful connections, and ideas to build on.</p>
            </div>
          </div>
        </section>

        {/* Meets Carousel Section */}
        <section id="meets" class="bg-base-200 py-20">
          <div class="mx-auto max-w-7xl px-5 sm:px-8">
            <div class="flex items-end justify-between gap-6">
              <div>
                <p class="font-semibold text-primary">CALENDAR</p>
                <h2 class="mt-3 text-3xl font-bold sm:text-4xl">Featured conversations</h2>
              </div>
              <p class="hidden max-w-xs text-right text-sm text-base-content/60 sm:block">
                Scroll through upcoming sessions or swipe on mobile.
              </p>
            </div>

            <div class="mt-10 w-full max-w-full overflow-x-auto px-2 sm:px-4">
              {data.meets.length ? (
                <div class="carousel carousel-center w-full space-x-4 p-4 scroll-smooth">
                  {data.meets.map((meet) => (
                    <MeetCard key={meet.id} meet={meet} />
                  ))}
                </div>
              ) : (
                <div class="rounded-2xl border border-dashed border-base-300 bg-base-100 p-10 text-center text-base-content/60">
                  No upcoming meets yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" class="bg-neutral text-neutral-content">
        <div class="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_auto_1.2fr]">
          <div>
            <a class="text-2xl font-bold" href="/">
              CobraDecision<span class="text-primary">.</span>
            </a>
            <p class="mt-4 max-w-xs leading-7 text-neutral-content/65">
              A home for people who still believe a good conversation can change a week.
            </p>
          </div>
          <div>
            <p class="font-semibold">Find us</p>
            <div class="mt-4 grid gap-2 text-sm text-neutral-content/65">
              <a class="link-hover" href="mailto:hello@meetspace.example">Email</a>
              <a class="link-hover" href="#">Telegram</a>
              <a class="link-hover" href="#">GitHub</a>
              <a class="link-hover" href="#">LinkedIn</a>
            </div>
          </div>
          <form class="w-full max-w-md" hx-post="/api/contact" hx-target="#contact-result" hx-swap="outerHTML">
            <p class="font-semibold">Want to contact?</p>
            <p class="mt-2 text-sm text-neutral-content/65">Leave your email and we&apos;ll write back.</p>
            <div class="mt-5 flex flex-col gap-3 sm:flex-row">
              <input class="input input-bordered w-full text-base-content" name="email" type="email" required placeholder="you@example.com" />
              <button class="btn btn-primary sm:w-28">Send</button>
            </div>
            <div id="contact-result" class="mt-3"></div>
          </form>
        </div>
        <div class="border-t border-neutral-content/15 px-5 py-5 text-center text-xs text-neutral-content/50">
          © 2026 CobraDecision. Built for better conversations.
        </div>
      </footer>
    </div>
  );
};
