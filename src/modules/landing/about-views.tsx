import type { LandingCache } from "../../lib/cache";
import type { Locale } from "../../lib/i18n/translations";
import { t, formatLocalizedNumber } from "../../lib/i18n/context";
import { LanguageSwitch } from "../../ui/language-switch";
import { Footer } from "../../ui/footer";

export const AboutView = ({ data, locale = "en" }: { data: LandingCache; locale?: Locale }) => {
  const totalUsersFormatted = formatLocalizedNumber(data.totalUsers, locale);
  const totalHoursFormatted = formatLocalizedNumber(data.totalMeetHours, locale);
  const totalMeetsFormatted = formatLocalizedNumber(data.totalMeets, locale);

  const tracks = [
    { title: t("about.tracks.backend", locale), desc: locale === "fa" ? "طراحی سیستم، پایگاه‌های داده توزیع‌شده، میکروسرویس‌ها و پرفورمنس" : "Distributed systems, database design, microservices, and performance." },
    { title: t("about.tracks.ai", locale), desc: locale === "fa" ? "مدل‌های زبانی بزرگ، یادگیری ماشین در پروداکشن و زیرساخت داده" : "LLMs, production machine learning, vector search, and data pipelines." },
    { title: t("about.tracks.devops", locale), desc: locale === "fa" ? "زیرساخت لینوکسی، کانتینرها، CI/CD، پایش و امنیت شبکه" : "Linux servers, containers, CI/CD, observability, and network security." },
    { title: t("about.tracks.craftsmanship", locale), desc: locale === "fa" ? "معماری تمیز، تست‌نویسی خودکار، ریفکتور و طراحی ماژولار" : "Clean architecture, automated testing, refactoring, and modular design." },
    { title: t("about.tracks.softskills", locale), desc: locale === "fa" ? "رهبری تیم، مدیریت محصول، منتورینگ و رشد فردی و شغلی" : "Technical leadership, product management, mentoring, and professional growth." },
    { title: t("about.tracks.opensource_culture", locale), desc: locale === "fa" ? "مشارکت در پروژه‌های آزاد، معرفی و نقد کتاب و همکاری‌های جمعی" : "Open-source collaboration, technical book reviews, and collective engineering." },
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
      {/* Sticky Header Navbar */}
      <header class="border-b border-base-200 bg-base-100/90 sticky top-0 z-30 backdrop-blur">
        <nav class="navbar mx-auto min-h-20 max-w-7xl px-5 sm:px-8">
          <div class="flex-1">
            <a class="inline-flex items-center gap-3 text-xl font-bold tracking-tight" href="/">
              <img src="/favicon.svg" alt="CobraDecision" width="32" height="32" class="h-8 w-8" />
              <span>{t("brand.name", locale)}<span class="text-primary">.</span></span>
            </a>
          </div>
          <div class="hidden gap-7 text-sm font-medium md:flex">
            <a class="link-hover" href="/#how-it-works">{t("nav.how_it_works", locale)}</a>
            <a class="link-hover" href="/#meets">{t("nav.meets", locale)}</a>
            <a class="text-primary font-bold" href="/about">{t("nav.about", locale)}</a>
            <a class="link-hover" href="/support">{t("nav.support", locale)}</a>
            <a class="link-hover" href="/#contact">{t("nav.contact", locale)}</a>
          </div>
          <div class="flex-none gap-3 ps-4">
            <LanguageSwitch currentLocale={locale} size="xs" />
            <a class="btn btn-primary btn-sm px-5" href="/auth">{t("nav.sign_in", locale)}</a>
          </div>
        </nav>
      </header>

      <main class="space-y-24 py-12 sm:py-20">
        {/* Hero & Manifesto */}
        <section id="manifesto" class="mx-auto max-w-5xl px-5 sm:px-8 text-center scroll-mt-24">
          <div class="inline-flex items-center justify-center mb-6 max-w-full">
            <span class="inline-block rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs sm:text-sm font-medium text-primary text-center leading-normal">
              {t("about.hero_quote", locale)}
            </span>
          </div>
          <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-base-content leading-tight">
            {t("about.hero_title", locale)}
          </h1>
          <p class="mt-6 mx-auto max-w-3xl text-lg sm:text-xl leading-relaxed text-base-content/75">
            {t("about.hero_subtitle", locale)}
          </p>
          <div class="mt-10 flex flex-wrap justify-center gap-4">
            <a class="btn btn-primary px-8 shadow-md" href="/#meets">
              {t("hero.cta_explore", locale)}
            </a>
            <a class="btn btn-outline px-8" href="/support">
              {t("about.cta_support", locale)}
            </a>
          </div>
        </section>

        {/* Mission & Vision */}
        <section id="mission" class="mx-auto max-w-7xl px-5 sm:px-8 scroll-mt-24">
          <div class="grid gap-8 md:grid-cols-2">
            <div class="card border border-base-300 bg-base-200/50 p-8 shadow-sm">
              <div class="badge badge-primary badge-sm mb-4 font-bold">{t("about.mission_title", locale)}</div>
              <h2 class="text-2xl font-bold text-base-content">
                <a href="#mission" class="hover:text-primary transition-colors inline-flex items-center gap-2 group">
                  <span>{locale === "fa" ? "گفتگوی عمیق بدون هیاهو" : "Focused Conversations Without Noise"}</span>
                  <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-lg font-mono">#</span>
                </a>
              </h2>
              <p class="mt-4 text-base-content/75 leading-relaxed">
                {t("about.mission_desc", locale)}
              </p>
            </div>
            <div id="vision" class="card border border-base-300 bg-base-200/50 p-8 shadow-sm scroll-mt-24">
              <div class="badge badge-secondary badge-sm mb-4 font-bold">{t("about.vision_title", locale)}</div>
              <h2 class="text-2xl font-bold text-base-content">
                <a href="#vision" class="hover:text-primary transition-colors inline-flex items-center gap-2 group">
                  <span>{locale === "fa" ? "مرجع همتا-به-همتای توسعه‌دهندگان" : "Peer-to-Peer Engineering Reference"}</span>
                  <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-lg font-mono">#</span>
                </a>
              </h2>
              <p class="mt-4 text-base-content/75 leading-relaxed">
                {t("about.vision_desc", locale)}
              </p>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section id="values" class="mx-auto max-w-7xl px-5 sm:px-8 scroll-mt-24">
          <div class="text-center max-w-2xl mx-auto mb-12">
            <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">
              <a href="#values" class="hover:text-primary transition-colors inline-flex items-center justify-center gap-2 group">
                <span>{t("about.values_title", locale)}</span>
                <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xl font-mono">#</span>
              </a>
            </h2>
            <p class="mt-3 text-base-content/65">
              {locale === "fa" ? "اصولی که جلسات، تعاملات و فرهنگ تصمیم کبرا را شکل می‌دهند." : "The core pillars guiding our meetings, discussions, and community culture."}
            </p>
          </div>
          <div class="grid gap-8 md:grid-cols-3">
            <div class="card border border-base-300 bg-base-100 p-6 shadow-sm">
              <h3 class="text-xl font-bold">{t("about.values.learn_in_public", locale)}</h3>
              <p class="mt-3 text-sm text-base-content/70 leading-relaxed">
                {t("about.values.learn_in_public_desc", locale)}
              </p>
            </div>
            <div class="card border border-base-300 bg-base-100 p-6 shadow-sm">
              <h3 class="text-xl font-bold">{t("about.values.depth_over_hype", locale)}</h3>
              <p class="mt-3 text-sm text-base-content/70 leading-relaxed">
                {t("about.values.depth_over_hype_desc", locale)}
              </p>
            </div>
            <div class="card border border-base-300 bg-base-100 p-6 shadow-sm">
              <h3 class="text-xl font-bold">{t("about.values.constructive_dialogue", locale)}</h3>
              <p class="mt-3 text-sm text-base-content/70 leading-relaxed">
                {t("about.values.constructive_dialogue_desc", locale)}
              </p>
            </div>
          </div>
        </section>

        {/* Weekly Formats */}
        <section id="formats" class="mx-auto max-w-7xl px-5 sm:px-8 bg-base-200/40 py-16 rounded-3xl border border-base-300 scroll-mt-24">
          <div class="text-center max-w-2xl mx-auto mb-12">
            <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">
              <a href="#formats" class="hover:text-primary transition-colors inline-flex items-center justify-center gap-2 group">
                <span>{t("about.formats_title", locale)}</span>
                <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xl font-mono">#</span>
              </a>
            </h2>
            <p class="mt-3 text-base-content/65">
              {locale === "fa" ? "جلسات آنلاین هفتگی ما در دو فرمت مکمل و مشخص برگزار می‌شوند." : "Weekly online gatherings hosted in two complementary formats."}
            </p>
          </div>
          <div class="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            <div class="card bg-base-100 border border-base-300 p-8 shadow-sm">
              <span class="badge badge-primary badge-sm font-semibold mb-3">{locale === "fa" ? "Weekly • چهارشنبه‌ها" : "Weekly • Wednesdays"}</span>
              <h3 class="text-2xl font-bold">{t("about.formats.roundtables", locale)}</h3>
              <p class="mt-4 text-base-content/75 leading-relaxed">
                {t("about.formats.roundtables_desc", locale)}
              </p>
            </div>
            <div class="card bg-base-100 border border-base-300 p-8 shadow-sm">
              <span class="badge badge-secondary badge-sm font-semibold mb-3">{locale === "fa" ? "Deep-Dive • ارائه‌های تخصصی" : "Deep-Dive • Specialized Talks"}</span>
              <h3 class="text-2xl font-bold">{t("about.formats.talks", locale)}</h3>
              <p class="mt-4 text-base-content/75 leading-relaxed">
                {t("about.formats.talks_desc", locale)}
              </p>
            </div>
          </div>
        </section>

        {/* Tracks & Domains */}
        <section id="tracks" class="mx-auto max-w-7xl px-5 sm:px-8 scroll-mt-24">
          <div class="text-center max-w-2xl mx-auto mb-12">
            <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">
              <a href="#tracks" class="hover:text-primary transition-colors inline-flex items-center justify-center gap-2 group">
                <span>{t("about.tracks_title", locale)}</span>
                <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xl font-mono">#</span>
              </a>
            </h2>
            <p class="mt-3 text-base-content/65">
              {locale === "fa" ? "سرفصل‌ها و موضوعات محوری که در جلسات به بحث گذاشته می‌شوند." : "Core tracks and specialized domains explored in our community sessions."}
            </p>
          </div>
          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((track) => (
              <div key={track.title} class="card border border-base-300 bg-base-100 p-6 shadow-sm">
                <h3 class="font-bold text-lg text-primary">{track.title}</h3>
                <p class="mt-2 text-sm text-base-content/70 leading-relaxed">{track.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live Metrics */}
        <section id="metrics" class="border-y border-base-200 bg-base-100 py-12 scroll-mt-24">
          <div class="mx-auto max-w-7xl px-5 sm:px-8 text-center">
            <h2 class="text-2xl font-bold mb-8">
              <a href="#metrics" class="hover:text-primary transition-colors inline-flex items-center justify-center gap-2 group">
                <span>{t("about.metrics_title", locale)}</span>
                <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xl font-mono">#</span>
              </a>
            </h2>
            <div class="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
              {data.totalUsers >= 50 && (
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
          </div>
        </section>

        {/* FAQ & Open Source Section */}
        <section id="faq" class="mx-auto max-w-4xl px-5 sm:px-8 scroll-mt-24">
          <div class="text-center max-w-2xl mx-auto mb-10">
            <h2 class="text-3xl font-bold tracking-tight">
              <a href="#faq" class="hover:text-primary transition-colors inline-flex items-center justify-center gap-2 group">
                <span>{t("about.faq_title", locale)}</span>
                <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xl font-mono">#</span>
              </a>
            </h2>
          </div>
          <div class="space-y-4">
            {faqs.map((faq, idx) => (
              <details key={faq.q} class="collapse collapse-plus border border-base-300 bg-base-100 rounded-box shadow-xs" open={idx === 0}>
                <summary class="collapse-title font-semibold text-base sm:text-lg">
                  {faq.q}
                </summary>
                <div class="collapse-content text-sm text-base-content/75 leading-relaxed space-y-3">
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
              </details>
            ))}
          </div>
        </section>

        {/* Community Action Hub */}
        <section id="join" class="mx-auto max-w-4xl px-5 sm:px-8 text-center scroll-mt-24">
          <div class="rounded-3xl border border-base-300 bg-gradient-to-b from-base-200/60 to-base-100 p-10 shadow-sm">
            <h2 class="text-3xl font-bold">
              {locale === "fa" ? "هم‌اکنون به گفتگو بپیوندید" : "Join the Conversation Today"}
            </h2>
            <p class="mt-4 text-base-content/70 max-w-xl mx-auto">
              {locale === "fa" ? "در جلسات بعدی شرکت کنید، ارائه‌ای به اشتراک بگذارید، یا به گفتگوهای آزاد بپیوندید." : "Attend upcoming meets, propose your technical talk, or take part in our weekly roundtables."}
            </p>
            <div class="mt-8 flex flex-wrap justify-center gap-4">
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
