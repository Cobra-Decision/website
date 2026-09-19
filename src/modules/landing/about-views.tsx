import type { LandingCache } from "../../lib/cache";
import type { Locale } from "../../lib/i18n/translations";
import { t } from "../../lib/i18n/context";
import { PublicHeader } from "../../ui/public-header";
import { StatsBar } from "../../ui/stats-bar";
import { Footer } from "../../ui/footer";

export const AboutView = ({ data, locale = "en" }: { data: LandingCache; locale?: Locale }) => {
  const tracks = [
    { title: t("about.tracks.backend", locale), desc: t("about.tracks.backend_desc", locale) },
    { title: t("about.tracks.ai", locale), desc: t("about.tracks.ai_desc", locale) },
    { title: t("about.tracks.devops", locale), desc: t("about.tracks.devops_desc", locale) },
    { title: t("about.tracks.craftsmanship", locale), desc: t("about.tracks.craftsmanship_desc", locale) },
    { title: t("about.tracks.softskills", locale), desc: t("about.tracks.softskills_desc", locale) },
    { title: t("about.tracks.opensource_culture", locale), desc: t("about.tracks.opensource_culture_desc", locale) },
  ];

  const faqs = [
    {
      q: t("about.faq.q1", locale),
      a: t("about.faq.a1", locale),
    },
    {
      q: t("about.faq.format_q", locale),
      a: t("about.faq.format_a", locale),
    },
    {
      q: t("about.faq.register_q", locale),
      a: t("about.faq.register_a", locale),
    },
    {
      q: t("about.faq.opensource_q", locale),
      a: t("about.faq.opensource_a", locale),
      link: "https://github.com/Cobra-Decision/website",
    },
    {
      q: t("about.faq.participate_q", locale),
      a: t("about.faq.participate_a", locale),
    },
  ];

  return (
    <div class="overflow-x-hidden bg-base-100 min-h-screen">
      <PublicHeader locale={locale} activePage="about" />

      <main class="space-y-16 sm:space-y-24 py-10 sm:py-16">
        {/* Hero & Manifesto */}
        <section id="manifesto" class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center scroll-mt-24">
          <div class="inline-flex items-center justify-center mb-6 max-w-full">
            <span class="inline-block rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs sm:text-sm font-medium text-primary text-center leading-normal">
              {t("about.hero_quote", locale)}
            </span>
          </div>
          <h1 class="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-base-content leading-tight">
            {t("about.hero_title", locale)}
          </h1>
          <p class="mt-5 sm:mt-6 mx-auto max-w-3xl text-base sm:text-lg lg:text-xl leading-relaxed text-base-content/75">
            {t("about.hero_subtitle", locale)}
          </p>
          <div class="mt-8 sm:mt-10 flex flex-wrap justify-center gap-3 sm:gap-4">
            <a class="btn btn-primary px-6 sm:px-8 shadow-md" href="/#meets">
              {t("hero.cta_explore", locale)}
            </a>
            <a class="btn btn-outline px-6 sm:px-8" href="/support">
              {t("about.cta_support", locale)}
            </a>
          </div>
        </section>

        {/* Mission & Vision */}
        <section id="mission" class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <div class="grid gap-6 sm:gap-8 md:grid-cols-2">
            <div class="card border border-base-300 bg-base-200/50 p-6 sm:p-8 shadow-sm">
              <div class="badge badge-primary badge-sm mb-4 font-bold">{t("about.mission_title", locale)}</div>
              <h2 class="text-xl sm:text-2xl font-bold text-base-content">
                <a href="#mission" class="hover:text-primary transition-colors inline-flex items-center gap-2 group">
                  <span>{t("about.mission_subtitle", locale)}</span>
                  <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-lg font-mono">#</span>
                </a>
              </h2>
              <p class="mt-4 text-sm sm:text-base text-base-content/75 leading-relaxed">
                {t("about.mission_desc", locale)}
              </p>
            </div>
            <div id="vision" class="card border border-base-300 bg-base-200/50 p-6 sm:p-8 shadow-sm scroll-mt-24">
              <div class="badge badge-secondary badge-sm mb-4 font-bold">{t("about.vision_title", locale)}</div>
              <h2 class="text-xl sm:text-2xl font-bold text-base-content">
                <a href="#vision" class="hover:text-primary transition-colors inline-flex items-center gap-2 group">
                  <span>{t("about.vision_subtitle", locale)}</span>
                  <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-lg font-mono">#</span>
                </a>
              </h2>
              <p class="mt-4 text-sm sm:text-base text-base-content/75 leading-relaxed">
                {t("about.vision_desc", locale)}
              </p>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section id="values" class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <div class="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              <a href="#values" class="hover:text-primary transition-colors inline-flex items-center justify-center gap-2 group">
                <span>{t("about.values_title", locale)}</span>
                <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xl font-mono">#</span>
              </a>
            </h2>
            <p class="mt-2.5 sm:mt-3 text-sm sm:text-base text-base-content/65">
              {t("about.values_subtitle", locale)}
            </p>
          </div>
          <div class="grid gap-4 sm:gap-6 md:grid-cols-3">
            <div class="card border border-base-300 bg-base-100 p-5 sm:p-6 shadow-sm">
              <h3 class="text-lg sm:text-xl font-bold">{t("about.values.learn_in_public", locale)}</h3>
              <p class="mt-2.5 sm:mt-3 text-sm text-base-content/70 leading-relaxed">
                {t("about.values.learn_in_public_desc", locale)}
              </p>
            </div>
            <div class="card border border-base-300 bg-base-100 p-5 sm:p-6 shadow-sm">
              <h3 class="text-lg sm:text-xl font-bold">{t("about.values.depth_over_hype", locale)}</h3>
              <p class="mt-2.5 sm:mt-3 text-sm text-base-content/70 leading-relaxed">
                {t("about.values.depth_over_hype_desc", locale)}
              </p>
            </div>
            <div class="card border border-base-300 bg-base-100 p-5 sm:p-6 shadow-sm">
              <h3 class="text-lg sm:text-xl font-bold">{t("about.values.constructive_dialogue", locale)}</h3>
              <p class="mt-2.5 sm:mt-3 text-sm text-base-content/70 leading-relaxed">
                {t("about.values.constructive_dialogue_desc", locale)}
              </p>
            </div>
          </div>
        </section>

        {/* Weekly Formats */}
        <section id="formats" class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <div class="bg-base-200/40 py-10 sm:py-16 px-4 sm:px-8 rounded-2xl sm:rounded-3xl border border-base-300">
            <div class="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
              <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                <a href="#formats" class="hover:text-primary transition-colors inline-flex items-center justify-center gap-2 group">
                  <span>{t("about.formats_title", locale)}</span>
                  <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xl font-mono">#</span>
                </a>
              </h2>
              <p class="mt-2.5 sm:mt-3 text-sm sm:text-base text-base-content/65">
                {t("about.formats_subtitle", locale)}
              </p>
            </div>
            <div class="grid gap-6 sm:gap-8 md:grid-cols-2 max-w-4xl mx-auto">
              <div class="card bg-base-100 border border-base-300 p-6 sm:p-8 shadow-sm">
                <span class="badge badge-primary badge-sm font-semibold mb-3">{t("about.formats.roundtables_badge", locale)}</span>
                <h3 class="text-xl sm:text-2xl font-bold">{t("about.formats.roundtables", locale)}</h3>
                <p class="mt-3 sm:mt-4 text-sm sm:text-base text-base-content/75 leading-relaxed">
                  {t("about.formats.roundtables_desc", locale)}
                </p>
              </div>
              <div class="card bg-base-100 border border-base-300 p-6 sm:p-8 shadow-sm">
                <span class="badge badge-secondary badge-sm font-semibold mb-3">{t("about.formats.talks_badge", locale)}</span>
                <h3 class="text-xl sm:text-2xl font-bold">{t("about.formats.talks", locale)}</h3>
                <p class="mt-3 sm:mt-4 text-sm sm:text-base text-base-content/75 leading-relaxed">
                  {t("about.formats.talks_desc", locale)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tracks & Domains */}
        <section id="tracks" class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <div class="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              <a href="#tracks" class="hover:text-primary transition-colors inline-flex items-center justify-center gap-2 group">
                <span>{t("about.tracks_title", locale)}</span>
                <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xl font-mono">#</span>
              </a>
            </h2>
            <p class="mt-2.5 sm:mt-3 text-sm sm:text-base text-base-content/65">
              {t("about.tracks_subtitle", locale)}
            </p>
          </div>
          <div class="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((track) => (
              <div key={track.title} class="card border border-base-300 bg-base-100 p-5 sm:p-6 shadow-sm">
                <h3 class="font-bold text-base sm:text-lg text-primary">{track.title}</h3>
                <p class="mt-2 text-xs sm:text-sm text-base-content/70 leading-relaxed">{track.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live Metrics */}
        <section id="metrics" class="border-y border-base-200 bg-base-100 py-10 sm:py-12 scroll-mt-24">
          <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 class="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">
              <a href="#metrics" class="hover:text-primary transition-colors inline-flex items-center justify-center gap-2 group">
                <span>{t("about.metrics_title", locale)}</span>
                <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xl font-mono">#</span>
              </a>
            </h2>
            <StatsBar
              totalUsers={data.totalUsers}
              totalMeetHours={data.totalMeetHours}
              totalMeets={data.totalMeets}
              locale={locale}
            />
          </div>
        </section>

        {/* FAQ & Open Source Section */}
        <section id="faq" class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <div class="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <h2 class="text-2xl sm:text-3xl font-bold tracking-tight">
              <a href="#faq" class="hover:text-primary transition-colors inline-flex items-center justify-center gap-2 group">
                <span>{t("about.faq_title", locale)}</span>
                <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xl font-mono">#</span>
              </a>
            </h2>
          </div>
          <div class="space-y-3 sm:space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={faq.q}
                x-data={`{ open: ${idx === 0} }`}
                class="border border-base-300 bg-base-100 rounded-box shadow-xs overflow-hidden"
              >
                <button
                  type="button"
                  x-on:click="open = !open"
                  class="w-full flex items-center justify-between p-4 text-start font-semibold text-base sm:text-lg cursor-pointer select-none gap-4"
                >
                  <span>{faq.q}</span>
                  <span
                    class="font-mono text-lg text-base-content/70 select-none pointer-events-none shrink-0"
                    x-text="open ? '−' : '+'"
                  >
                    {idx === 0 ? "−" : "+"}
                  </span>
                </button>
                <div
                  x-show="open"
                  x-cloak
                  class="px-4 pb-4 text-sm text-base-content/75 leading-relaxed space-y-3"
                >
                  <p>{faq.a}</p>
                  {faq.link && (
                    <div>
                      <a
                        href={faq.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="btn btn-outline btn-sm gap-2 font-mono"
                      >
                        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                        GitHub Repository →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Community Action Hub */}
        <section id="join" class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center scroll-mt-24">
          <div class="rounded-2xl sm:rounded-3xl border border-base-300 bg-gradient-to-b from-base-200/60 to-base-100 p-6 sm:p-10 shadow-sm">
            <h2 class="text-2xl sm:text-3xl font-bold">
              {t("about.join_title", locale)}
            </h2>
            <p class="mt-3 sm:mt-4 text-sm sm:text-base text-base-content/70 max-w-xl mx-auto">
              {t("about.join_desc", locale)}
            </p>
            <div class="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
              <a class="btn btn-primary px-6" href="/#meets">
                {t("about.cta_join_bot", locale)}
              </a>
              <a class="btn btn-outline px-6" href="mailto:cobradecisionteam@gmail.com">
                {t("about.cta_propose_talk", locale)}
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
};
